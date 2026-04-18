using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;
using ConnectDB.Services;
using System.Security.Claims;

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
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.DiningTable)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(orders);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(Order order)
    {
        // 1. Kiểm tra bàn
        var table = await _context.DiningTables.FindAsync(order.DiningTableId);
        if (table == null) return BadRequest("Bàn không tồn tại");

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

        // 3. Cập nhật trạng thái bàn
        table.Status = TableStatus.Occupied;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // 4. SignalR: Thông báo cho Bếp và Cập nhật sơ đồ bàn
        await _hubContext.Clients.All.SendAsync("OrderCreated", order.Id, table.TableNumber);
        await _hubContext.Clients.All.SendAsync("TableStatusChanged", table.Id, table.Status.ToString());
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Hệ thống POS", $"Bàn {table.TableNumber} vừa tạo Order mới!");

        // Audit Log
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            await _audit.LogAsync(userId, "Tạo mới", "Đơn hàng", $"Đã tạo đơn hàng mới #{order.Id} cho bàn {table.TableNumber}");
        }

        return Ok(order);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] OrderStatus status)
    {
        var order = await _context.Orders.Include(o => o.DiningTable).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        order.Status = status;
        await _context.SaveChangesAsync();

        // SignalR: Thông báo trạng thái mới (cho Bếp hoặc Nhân viên phục vụ)
        await _hubContext.Clients.All.SendAsync("OrderStatusChanged", id, status.ToString());
        
        // Audit Log
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            await _audit.LogAsync(userId, "Cập nhật", "Đơn hàng", $"Đã thay đổi trạng thái đơn hàng #{id} thành {status}");
        }

        return Ok(order);
    }
}
