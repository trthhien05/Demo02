using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;

using ConnectDB.Services;

using Microsoft.AspNetCore.Authorization;
using ConnectDB.Models.Common;

namespace ConnectDB.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILoyaltyService _loyaltyService;

    public CustomerController(AppDbContext context, ILoyaltyService loyaltyService)
    {
        _context = context;
        _loyaltyService = loyaltyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllCustomers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] CustomerTier? tier = null)
    {
        var query = _context.Customers.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(c => (c.FullName != null && c.FullName.Contains(search)) || c.PhoneNumber.Contains(search));
        }

        if (tier.HasValue)
        {
            query = query.Where(c => c.Tier == tier.Value);
        }

        var totalCount = await query.CountAsync();
        var customers = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new PagedResult<Customer>(customers, totalCount, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound("Khách hàng không tồn tại");
        return Ok(customer);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer(Customer customer)
    {
        // Kiểm tra số điện thoại có trùng không
        var exists = await _context.Customers.AnyAsync(c => c.PhoneNumber == customer.PhoneNumber);
        if (exists) return BadRequest("Số điện thoại đã tồn tại trong hệ thống");

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    [HttpPost("merge")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MergeCustomers([FromBody] MergeRequest request)
    {
        var source = await _context.Customers.Include(c => c.Reservations).FirstOrDefaultAsync(c => c.Id == request.SourceCustomerId);
        var target = await _context.Customers.Include(c => c.Reservations).FirstOrDefaultAsync(c => c.Id == request.TargetCustomerId);

        if (source == null || target == null) return NotFound("Một trong hai khách hàng không tồn tại");

        // 1. Chuyển đổi đặt bàn
        foreach (var res in source.Reservations)
        {
            res.CustomerId = target.Id;
        }

        // 2. Gộp điểm
        target.Points += source.Points;

        // 3. Giữ lại thông tin khách có hạng cao hơn (hoặc Target nếu bằng nhau)
        if (source.Tier > target.Tier)
        {
            target.FullName = source.FullName;
            target.Email = source.Email;
        }

        // 4. Xóa khách cũ
        _context.Customers.Remove(source);

        await _context.SaveChangesAsync();

        // 5. Tính toán lại hạng cho khách mới gộp
        await _loyaltyService.ProcessTierUpgradeAsync(target.Id);

        return Ok(new { Message = "Gộp khách hàng thành công", MergedCustomer = target });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(int id, Customer updatedCustomer)
    {
        if (id != updatedCustomer.Id) return BadRequest("ID không khớp");

        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound("Khách hàng không tồn tại");

        // Cập nhật thông tin
        customer.FullName = updatedCustomer.FullName;
        customer.Email = updatedCustomer.Email;
        customer.DateOfBirth = updatedCustomer.DateOfBirth;
        customer.Gender = updatedCustomer.Gender;
        customer.Segment = updatedCustomer.Segment;

        await _context.SaveChangesAsync();
        return Ok(customer);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _context.Customers.Include(c => c.Reservations).FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return NotFound();

        if (customer.Reservations.Any())
        {
            return BadRequest("Không thể xóa khách hàng đang có lịch sử đặt bàn.");
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // GET: api/customer/{id}/stats
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetCustomerStats(int id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        var invoices = await _context.Invoices
            .Where(i => i.CustomerId == id && i.Status == InvoiceStatus.Paid)
            .OrderByDescending(i => i.IssuedAt)
            .Select(i => new {
                i.Id,
                i.FinalAmount,
                i.IssuedAt,
                i.PaymentMethod
            })
            .Take(10)
            .ToListAsync();

        var totalSpent = await _context.Invoices
            .Where(i => i.CustomerId == id && i.Status == InvoiceStatus.Paid)
            .SumAsync(i => i.FinalAmount);

        var visitCount = await _context.Invoices
            .CountAsync(i => i.CustomerId == id && i.Status == InvoiceStatus.Paid);

        return Ok(new {
            TotalSpent = totalSpent,
            VisitCount = visitCount,
            RecentInvoices = invoices
        });
    }

    [HttpPost("{id}/adjust-points")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdjustPoints(int id, [FromBody] int pointsDelta)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();
        customer.Points = Math.Max(0, customer.Points + pointsDelta);
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Cập nhật điểm thành công", NewPoints = customer.Points });
    }

    [HttpGet("{id}/orders")]
    public async Task<IActionResult> GetCustomerOrders(int id)
    {
        var orders = await _context.Orders
            .Include(o => o.DiningTable)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .Where(o => _context.Invoices.Any(i => i.OrderId == o.Id && i.CustomerId == id))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(orders);
    }

    [HttpGet("{id}/invoices")]
    public async Task<IActionResult> GetCustomerInvoices(int id)
    {
        var invoices = await _context.Invoices
            .Where(i => i.CustomerId == id)
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync();
        return Ok(invoices);
    }

    [HttpGet("{id}/vouchers")]
    public async Task<IActionResult> GetCustomerVouchers(int id)
    {
        var vouchers = await _context.Vouchers
            .Where(v => v.CustomerId == id)
            .ToListAsync();
        return Ok(vouchers);
    }

    [HttpGet("{id}/loyalty")]
    public async Task<IActionResult> GetCustomerLoyalty(int id)
    {
        var transactions = await _context.LoyaltyTransactions
            .Where(t => t.CustomerId == id)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        return Ok(transactions);
    }
}


public class MergeRequest
{
    public int SourceCustomerId { get; set; }
    public int TargetCustomerId { get; set; }
}
