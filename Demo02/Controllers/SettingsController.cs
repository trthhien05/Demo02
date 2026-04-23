using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using ConnectDB.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ConnectDB.Controllers;

[ApiController]
[ConnectDB.Filters.DisableGlobalAudit]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _audit;

    public SettingsController(AppDbContext context, IAuditService audit)
    {
        _context = context;
        _audit = audit;
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
        settings.OpeningHours = updatedSettings.OpeningHours;
        settings.FacebookUrl = updatedSettings.FacebookUrl;
        settings.InstagramUrl = updatedSettings.InstagramUrl;
        settings.ZaloNumber = updatedSettings.ZaloNumber;

        await _context.SaveChangesAsync();

        // Audit Log
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        await _audit.LogAsync(userId, "Cập nhật", "Cài đặt", $"Đã cập nhật cấu hình hệ thống: {settings.Name}");

        return Ok(settings);
    }
}
