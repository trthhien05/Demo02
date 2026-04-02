using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;

using ConnectDB.Services;

using Microsoft.AspNetCore.Authorization;

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
    public async Task<IActionResult> GetAllCustomers()
    {
        var customers = await _context.Customers.ToListAsync();
        return Ok(customers);
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
}

public class MergeRequest
{
    public int SourceCustomerId { get; set; }
    public int TargetCustomerId { get; set; }
}
