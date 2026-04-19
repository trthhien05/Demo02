using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ConnectDB.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ShiftController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShiftController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetShifts()
    {
        return Ok(await _context.Shifts.Include(s => s.User).OrderByDescending(s => s.StartTime).ToListAsync());
    }

    [HttpGet("user/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUserShifts(int id)
    {
        return Ok(await _context.Shifts.Where(s => s.UserId == id).OrderByDescending(s => s.StartTime).ToListAsync());
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyShifts()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        return Ok(await _context.Shifts.Where(s => s.UserId == userId).OrderByDescending(s => s.StartTime).Take(50).ToListAsync());
    }

    [HttpPost("clock-in")]
    public async Task<IActionResult> ClockIn()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (userId == 0) return Unauthorized();

        // Kiểm tra xem nhân viên đã có ca chưa kết thúc không
        var activeShift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.UserId == userId && s.EndTime == null);
        
        if (activeShift != null) return BadRequest("Bạn đã có một ca làm việc đang diễn ra.");

        var shift = new Shift
        {
            UserId = userId,
            StartTime = DateTime.UtcNow
        };

        _context.Shifts.Add(shift);
        await _context.SaveChangesAsync();
        return Ok(shift);
    }

    [HttpPost("clock-out")]
    public async Task<IActionResult> ClockOut([FromBody] string note)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (userId == 0) return Unauthorized();

        var activeShift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.UserId == userId && s.EndTime == null);
        
        if (activeShift == null) return BadRequest("Bạn chưa bắt đầu ca làm việc.");

        activeShift.EndTime = DateTime.UtcNow;
        activeShift.Note = note;

        await _context.SaveChangesAsync();
        return Ok(activeShift);
    }
}
