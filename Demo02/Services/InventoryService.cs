using ConnectDB.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ConnectDB.Services;

public interface IInventoryService
{
    Task<bool> DeductStockAsync(int orderId);
    Task<List<InventoryItem>> GetLowStockItemsAsync();
}

public class InventoryService : IInventoryService
{
    private readonly Data.AppDbContext _context;

    public InventoryService(Data.AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> DeductStockAsync(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return false;

        foreach (var item in order.OrderItems)
        {
            // Lấy các định lượng (Recipes) cho món ăn này
            var recipes = await _context.Recipes
                .Where(r => r.MenuItemId == item.MenuItemId)
                .ToListAsync();

            foreach (var recipe in recipes)
            {
                var inventoryItem = await _context.InventoryItems.FindAsync(recipe.InventoryItemId);
                if (inventoryItem != null)
                {
                    // Trừ kho: Số lượng món ăn * Định lượng cho 1 món
                    inventoryItem.StockQuantity -= (item.Quantity * recipe.Quantity);
                    inventoryItem.LastUpdated = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<InventoryItem>> GetLowStockItemsAsync()
    {
        return await _context.InventoryItems
            .Where(i => i.StockQuantity <= i.MinStockLevel)
            .ToListAsync();
    }
}
