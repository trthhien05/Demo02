using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using ConnectDB.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IInventoryService _inventoryService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IPdfService _pdfService;
    private readonly ILoyaltyService _loyaltyService;

    public BillingController(AppDbContext context, ILoyaltyService loyaltyService, IInventoryService inventoryService, IHubContext<NotificationHub> hubContext, IPdfService pdfService)
    {
        _context = context;
        _loyaltyService = loyaltyService;
        _inventoryService = inventoryService;
        _hubContext = hubContext;
        _pdfService = pdfService;
    }

    [HttpGet("preview/{orderId}")]
    public async Task<IActionResult> PreviewInvoice(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Không tìm thấy đơn hàng");

        var settings = await _context.RestaurantSettings.FirstOrDefaultAsync();
        // Model defaults to 8.0m for 8%, so we must divide by 100
        decimal taxRate = (settings?.TaxRate ?? 8.0m) / 100m;
        decimal svcChargeRate = (settings?.ServiceCharge ?? 0.0m) / 100m;

        decimal subtotal = order.TotalAmount;
        decimal vat = subtotal * taxRate;
        decimal serviceCharge = subtotal * svcChargeRate;
        decimal final = subtotal + vat + serviceCharge;

        var preview = new
        {
            OrderId = orderId,
            Subtotal = subtotal,
            VatAmount = vat,
            ServiceChargeAmount = serviceCharge,
            FinalAmount = final
        };

        return Ok(preview);
    }

    [HttpPost("pay")]
    public async Task<IActionResult> ProcessPayment([FromBody] Invoice invoice)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = await _context.Orders.Include(o => o.DiningTable).FirstOrDefaultAsync(o => o.Id == invoice.OrderId);
            if (order == null) return NotFound("Đơn hàng không tồn tại");

            // 1. Lưu hóa đơn
            invoice.IssuedAt = DateTime.UtcNow;
            invoice.Status = InvoiceStatus.Paid;
            _context.Invoices.Add(invoice);

            // 2. Cập nhật trạng thái đơn hàng và bàn
            order.Status = OrderStatus.Completed;
            if (order.DiningTable != null)
            {
                order.DiningTable.Status = TableStatus.Cleaning;
            }

            await _context.SaveChangesAsync();

            // 3. Stock is now deducted in OrderController when moving to Preparing
            // so we don't need to do it here anymore.

            // 4. Tích lũy điểm Loyalty (nếu có khách hàng)
            if (invoice.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                if (customer != null)
                {
                    await _loyaltyService.AddPointsFromInvoiceAsync(customer.PhoneNumber, invoice.FinalAmount, $"Invoice_{invoice.Id}");
                }
            }

            await transaction.CommitAsync();

            // 5. SignalR: Cập nhật sơ đồ bàn và thông báo
            if (order.DiningTable != null)
            {
                await _hubContext.Clients.All.SendAsync("TableStatusChanged", order.DiningTableId, "Cleaning");
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Thu ngân", $"Bàn {order.DiningTable.TableNumber} đã thanh toán thành công! Vui lòng dọn dẹp.");
            }
            else
            {
               await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Thu ngân", $"Đơn hàng #{order.Id} đã thanh toán thành công!");
            }

            return Ok(invoice);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, $"Lỗi server khi thanh toán: {ex.Message}");
        }
    }

    [HttpGet("invoice/{orderId}")]
    public async Task<IActionResult> GetByOrderId(int orderId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Customer)
            .OrderByDescending(i => i.IssuedAt)
            .FirstOrDefaultAsync(i => i.OrderId == orderId);

        if (invoice != null) return Ok(invoice);

        // FALLBACK: If invoice does not exist in DB, but Order exists, we generate a preview/mock invoice on the fly
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Không tìm thấy hóa đơn cho đơn hàng này");

        var taxRate = 0.08m; // Default VAT
        var newInvoice = new Invoice
        {
            Id = order.Id, // Mock ID matching Order ID
            OrderId = order.Id,
            IssuedAt = order.CreatedAt,
            Subtotal = order.TotalAmount,
            VatAmount = order.TotalAmount * taxRate,
            FinalAmount = order.TotalAmount + (order.TotalAmount * taxRate),
            Status = InvoiceStatus.Paid,
            PaymentMethod = PaymentMethod.Cash,
            Order = order
        };

        return Ok(newInvoice);
    }

    public record LedgerEntry(
        int Id,
        int OrderId,
        DateTime IssuedAt,
        decimal FinalAmount,
        InvoiceStatus Status,
        PaymentMethod PaymentMethod,
        string CustomerName,
        string TableName,
        string Type
    );

    [HttpGet("invoices")]
    public async Task<IActionResult> GetAllInvoices([FromQuery] string? search, [FromQuery] string? method, [FromQuery] string? date, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        // 1. Get all actual Invoices
        var invoices = await _context.Invoices
            .Include(i => i.Order)
                .ThenInclude(o => o.DiningTable)
            .Include(i => i.Customer)
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync();

        // 2. Identify "Ghost Revenue" (Completed orders missing an Invoice record)
        var completedOrderIdsWithInvoices = invoices.Select(i => i.OrderId).ToHashSet();
        
        var ghostOrders = await _context.Orders
            .Include(o => o.DiningTable)
            .Where(o => o.Status == OrderStatus.Completed)
            .ToListAsync();

        var allEntries = new List<LedgerEntry>();
        
        // Add actual invoices
        allEntries.AddRange(invoices.Select(i => new LedgerEntry(
            i.Id,
            i.OrderId,
            i.IssuedAt,
            i.FinalAmount,
            i.Status,
            i.PaymentMethod,
            i.Customer?.FullName ?? "Khách lẻ",
            i.Order?.DiningTable?.TableNumber ?? "Mang về",
            "Real"
        )));

        // Add ghost invoices (auto-generated from completed orders)
        allEntries.AddRange(ghostOrders
            .Where(o => !completedOrderIdsWithInvoices.Contains(o.Id))
            .Select(o => new LedgerEntry(
                -o.Id, // Use negative OrderId as unique virtual ID
                o.Id,
                o.CreatedAt,
                o.TotalAmount,
                InvoiceStatus.Paid,
                PaymentMethod.Cash, 
                "Khách vãng lai",
                o.DiningTable?.TableNumber ?? "Mang về",
                "Virtual"
            )));

        // Apply global search/filter on the combined list (Memory)
        var filteredList = allEntries.AsEnumerable();
        
        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            filteredList = filteredList.Where(x => 
                x.OrderId.ToString() == search ||
                (x.CustomerName != null && x.CustomerName.ToLower().Contains(s)) ||
                (x.TableName != null && x.TableName.ToLower().Contains(s))
            );
        }

        if (!string.IsNullOrEmpty(method) && int.TryParse(method, out var mIdx))
        {
            var methodEnum = (PaymentMethod)mIdx;
            filteredList = filteredList.Where(x => x.PaymentMethod == methodEnum);
        }

        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
        {
            var d = parsedDate.Date;
            filteredList = filteredList.Where(x => x.IssuedAt.Date == d);
        }

        var totalCount = filteredList.Count();
        var pagedItems = filteredList
            .OrderByDescending(x => x.IssuedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var totalRevenue = filteredList.Where(x => x.Status == InvoiceStatus.Paid).Sum(x => x.FinalAmount);
        var cashTotal = filteredList.Where(x => x.Status == InvoiceStatus.Paid && x.PaymentMethod == PaymentMethod.Cash).Sum(x => x.FinalAmount);
        var cardTotal = filteredList.Where(x => x.Status == InvoiceStatus.Paid && x.PaymentMethod == PaymentMethod.Card).Sum(x => x.FinalAmount);
        var transferTotal = filteredList.Where(x => x.Status == InvoiceStatus.Paid && (x.PaymentMethod == PaymentMethod.Transfer || x.PaymentMethod == PaymentMethod.EWallet)).Sum(x => x.FinalAmount);
        var refundedTotal = filteredList.Where(x => x.Status == InvoiceStatus.Voided).Sum(x => x.FinalAmount);

        return Ok(new
        {
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            Page = page,
            PageSize = pageSize,
            Items = pagedItems,
            Stats = new {
                TotalRevenue = totalRevenue,
                Cash = cashTotal,
                Card = cardTotal,
                Transfer = transferTotal,
                Refunded = refundedTotal
            }
        });
    }

    [HttpPost("invoice/{id}/refund")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RefundInvoice(int id)
    {
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null) return NotFound("Không tìm thấy hóa đơn");

        if (invoice.Status == InvoiceStatus.Voided)
            return BadRequest("Hóa đơn này đã được hoàn tiền/hủy từ trước.");

        invoice.Status = InvoiceStatus.Voided;

        // Optionally, deduct loyalty points here if we granted them during ProcessPayment.
        // For simplicity, we just mark the invoice as Voided.
        
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đã hoàn tiền / hủy hóa đơn thành công", InvoiceId = id });
    }

    [HttpGet("invoice/{id}/pdf")]
    public async Task<IActionResult> GetInvoicePdf(int id)
    {
        try
        {
            var pdfBytes = await _pdfService.GenerateInvoicePdfAsync(id);
            return File(pdfBytes, "application/pdf", $"Invoice_{id}.pdf");
        }
        catch (Exception ex)
        {
            return NotFound(ex.Message);
        }
    }
}
