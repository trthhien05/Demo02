using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;
using ConnectDB.Services;
using System.Security.Claims;
using ConnectDB.Models.Common;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IAuditService _audit;

    public OrderController(AppDbContext context, IHubContext<NotificationHub> hubContext, IAuditService audit)
    {
        _context = context;
        _hubContext = hubContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10,
        [FromQuery] OrderStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? date = null)
    {
        var query = _context.Orders
            .Include(o => o.DiningTable)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .AsQueryable();

        // Filters
        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(o => o.Id.ToString().Contains(search) || (o.DiningTable != null && o.DiningTable.TableNumber.Contains(search)));

        if (date.HasValue)
        {
            var utcDate = DateTime.SpecifyKind(date.Value.Date, DateTimeKind.Utc);
            query = query.Where(o => o.CreatedAt.Date == utcDate);
        }

        var totalCount = await query.CountAsync();
        
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new PagedResult<Order>(orders, totalCount, page, pageSize);
        return Ok(result);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.DiningTable)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .Where(o => o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(orders);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(Order order)
    {
        // 1. Kiểm tra bàn (nếu có)
        DiningTable? table = null;
        if (order.DiningTableId.HasValue)
        {
            table = await _context.DiningTables.FindAsync(order.DiningTableId);
            if (table == null) return BadRequest("Bàn không tồn tại");
        }

        // 2. Tính toán TotalAmount và gán UnitPrice từ MenuItem thực tế
        decimal total = 0;
        foreach (var item in order.OrderItems)
        {
            var menuItem = await _context.MenuItems.FindAsync(item.MenuItemId);
            if (menuItem == null) return BadRequest($"Món ăn ID {item.MenuItemId} không tồn tại");
            
            item.UnitPrice = menuItem.Price;
            total += item.UnitPrice * item.Quantity;
        }
        order.TotalAmount = total;
        order.CreatedAt = DateTime.UtcNow;

        // 3. Cập nhật trạng thái bàn (nếu có)
        if (table != null)
        {
            table.Status = TableStatus.Occupied;
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // 4. SignalR: Thông báo cho Bếp và Cập nhật sơ đồ bàn
        if (table != null)
        {
            await _hubContext.Clients.Group("Kitchen").SendAsync("OrderCreated", order.Id, table.TableNumber);
            await _hubContext.Clients.All.SendAsync("TableStatusChanged", table.Id, table.Status.ToString());
            await _hubContext.Clients.Group("Kitchen").SendAsync("ReceiveNotification", "Hệ thống POS", $"Bàn {table.TableNumber} vừa tạo Order mới!");
        }
        else
        {
            await _hubContext.Clients.Group("Kitchen").SendAsync("OrderCreated", order.Id, "MANG VỀ");
            await _hubContext.Clients.Group("Kitchen").SendAsync("ReceiveNotification", "Hệ thống POS", "Vừa có đơn hàng MANG VỀ mới!");
        }

        // Audit Log
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            string target = table != null ? $"bàn {table.TableNumber}" : "mang về";
            await _audit.LogAsync(userId, "Tạo mới", "Đơn hàng", $"Đã tạo đơn hàng mới #{order.Id} cho {target}");
        }

        return Ok(order);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] OrderStatus status)
    {
        var order = await _context.Orders
            .Include(o => o.DiningTable)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        order.Status = status;
        await _context.SaveChangesAsync();

        // SignalR: Thông báo trạng thái mới (cho Bếp hoặc Nhân viên phục vụ)
        await _hubContext.Clients.Group("Kitchen").SendAsync("OrderStatusChanged", id, status.ToString());
        await _hubContext.Clients.Group("Kitchen").SendAsync("ReceiveNotification", "Hệ thống POS", $"Đơn hàng #{id} chuyển sang {status}");
        
        // Audit Log
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            await _audit.LogAsync(userId, "Cập nhật", "Đơn hàng", $"Đã thay đổi trạng thái đơn hàng #{id} thành {status}");
        }

        return Ok(order);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var order = await _context.Orders.Include(o => o.DiningTable).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        if (order.Status == OrderStatus.Completed)
            return BadRequest("Không thể hủy đơn hàng đã hoàn thành.");

        order.Status = OrderStatus.Cancelled;
        
        if (order.DiningTable != null)
        {
            order.DiningTable.Status = TableStatus.Available;
        }

        await _context.SaveChangesAsync();

        // SignalR: Notify cancellation
        await _hubContext.Clients.All.SendAsync("OrderCancelled", id);
        if (order.DiningTable != null)
            await _hubContext.Clients.All.SendAsync("TableStatusChanged", order.DiningTable.Id, "Available");

        return Ok(new { Message = $"Đã hủy đơn hàng #{id}" });
    }

    [HttpPost("{id}/add-item")]
    public async Task<IActionResult> AddItemToOrder(int id, [FromBody] OrderItem item)
    {
        var order = await _context.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        if (order.Status == OrderStatus.Completed || order.Status == OrderStatus.Cancelled)
            return BadRequest("Không thể thêm món vào đơn đã đóng hoặc đã hủy.");

        var menuItem = await _context.MenuItems.FindAsync(item.MenuItemId);
        if (menuItem == null) return BadRequest("Món ăn không tồn tại");

        item.OrderId = id;
        item.UnitPrice = menuItem.Price;
        
        _context.OrderItems.Add(item);
        order.TotalAmount += item.UnitPrice * item.Quantity;

        await _context.SaveChangesAsync();
        return Ok(order);
    }

    [HttpDelete("{id}/item/{itemId}")]
    public async Task<IActionResult> RemoveItemFromOrder(int id, int itemId)
    {
        var order = await _context.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        var item = order.OrderItems.FirstOrDefault(oi => oi.Id == itemId);
        if (item == null) return NotFound("Không tìm thấy món này trong đơn hàng");

        order.TotalAmount -= item.UnitPrice * item.Quantity;
        _context.OrderItems.Remove(item);

        await _context.SaveChangesAsync();
        return Ok(order);
    }
}
