using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _context;

    public MenuController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMenu()
    {
        var menu = await _context.MenuCategories
            .Include(c => c.MenuItems)
            .ToListAsync();
        return Ok(menu);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("category")]
    public async Task<IActionResult> CreateCategory(MenuCategory category)
    {
        _context.MenuCategories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("item")]
    public async Task<IActionResult> CreateMenuItem(MenuItem item)
    {
        var category = await _context.MenuCategories.FindAsync(item.CategoryId);
        if (category == null) return BadRequest("Danh mục không tồn tại");

        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("item/{id}")]
    public async Task<IActionResult> UpdateMenuItem(int id, MenuItem item)
    {
        if (id != item.Id) return BadRequest("ID không khớp");

        var existingItem = await _context.MenuItems.FindAsync(id);
        if (existingItem == null) return NotFound("Món ăn không tồn tại");

        // Cập nhật các trường thông tin
        existingItem.Name = item.Name;
        existingItem.Description = item.Description;
        existingItem.Price = item.Price;
        existingItem.ImageUrl = item.ImageUrl;
        existingItem.IsAvailable = item.IsAvailable;
        existingItem.CategoryId = item.CategoryId;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("item/{id}")]
    public async Task<IActionResult> DeleteMenuItem(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        // Kiểm tra xem món này có trong bất kỳ đơn hàng nào chưa
        var isOrdered = await _context.OrderItems.AnyAsync(oi => oi.MenuItemId == id);
        if (isOrdered)
        {
            return BadRequest("Không thể xóa món ăn đã từng có trong lịch sử đặt món. Hãy dùng tính năng 'Hết hàng' để ẩn món.");
        }

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }
}
