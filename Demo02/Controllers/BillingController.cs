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
        decimal taxRate = settings?.TaxRate ?? 0.08m;
        decimal svcChargeRate = settings?.ServiceCharge ?? 0.05m;

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
            order.DiningTable.Status = TableStatus.Available;

            await _context.SaveChangesAsync();

            // 3. Trừ kho nguyên liệu (Deduct Inventory)
            var deductSuccess = await _inventoryService.DeductStockAsync(invoice.OrderId);
            if (!deductSuccess)
            {
                await transaction.RollbackAsync();
                return BadRequest("Không thể trừ kho, vui lòng kiểm tra lại nguyên vật liệu.");
            }

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
            await _hubContext.Clients.All.SendAsync("TableStatusChanged", order.DiningTableId, "Available");
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Thu ngân", $"Bàn {order.DiningTable.TableNumber} đã thanh toán thành công!");

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

        if (invoice == null) return NotFound("Không tìm thấy hóa đơn cho đơn hàng này");

        return Ok(invoice);
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
