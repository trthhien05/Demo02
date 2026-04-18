using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == 1);
        if (settings == null)
        {
            // Seed default if not exists
            settings = new RestaurantSetting { Id = 1 };
            _context.RestaurantSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        return Ok(settings);
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSettings(RestaurantSetting updatedSettings)
    {
        var settings = await _context.RestaurantSettings.FirstOrDefaultAsync(s => s.Id == 1);
        if (settings == null) return NotFound();

        settings.Name = updatedSettings.Name;
        settings.Address = updatedSettings.Address;
        settings.PhoneNumber = updatedSettings.PhoneNumber;
        settings.LogoUrl = updatedSettings.LogoUrl;
        settings.Currency = updatedSettings.Currency;
        settings.TaxRate = updatedSettings.TaxRate;
        settings.ServiceCharge = updatedSettings.ServiceCharge;
        settings.Email = updatedSettings.Email;
        settings.Website = updatedSettings.Website;

        await _context.SaveChangesAsync();
        return Ok(settings);
    }
}
