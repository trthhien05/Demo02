using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using ConnectDB.Services;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IInventoryService _inventoryService;

    public InventoryController(AppDbContext context, IInventoryService inventoryService)
    {
        _context = context;
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetInventory()
    {
        return Ok(await _context.InventoryItems.ToListAsync());
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        return Ok(await _inventoryService.GetLowStockItemsAsync());
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> AddItem(InventoryItem item)
    {
        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateItem(int id, InventoryItem item)
    {
        if (id != item.Id) return BadRequest();
        _context.Entry(item).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();

        // Kiểm tra xem có Recipe nào đang dùng nguyên liệu này không
        var isUsed = await _context.Recipes.AnyAsync(r => r.InventoryItemId == id);
        if (isUsed)
        {
            return BadRequest("Không thể xóa nguyên liệu đang có trong công thức món ăn (Recipe).");
        }

        _context.InventoryItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // Recipe Management
    [HttpGet("recipe/{menuItemId}")]
    public async Task<IActionResult> GetRecipe(int menuItemId)
    {
        var recipes = await _context.Recipes
            .Include(r => r.InventoryItem)
            .Where(r => r.MenuItemId == menuItemId)
            .ToListAsync();
        return Ok(recipes);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("recipe")]
    public async Task<IActionResult> AddRecipe(Recipe recipe)
    {
        _context.Recipes.Add(recipe);
        await _context.SaveChangesAsync();
        return Ok(recipe);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("adjust/{id}")]
    public async Task<IActionResult> AdjustStock(int id, [FromQuery] decimal amount)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();
        
        item.StockQuantity += amount;
        if (item.StockQuantity < 0) item.StockQuantity = 0;
        item.LastUpdated = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return Ok(item);
    }
}
