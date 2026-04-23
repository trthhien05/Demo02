using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TableController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public TableController(AppDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetTables()
    {
        return Ok(await _context.DiningTables.ToListAsync());
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableTables([FromQuery] DateTime dateTime, [FromQuery] int paxCount)
    {
        var utcDateTime = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
        
        // Window 2 tiếng trước và sau để tránh trùng lịch
        var startWindow = utcDateTime.AddHours(-2);
        var endWindow = utcDateTime.AddHours(2);

        var reservedTableIds = await _context.Reservations
            .Where(r => r.Status != ReservationStatus.Cancelled &&
                        r.ReservationTime > startWindow &&
                        r.ReservationTime < endWindow)
            .Select(r => r.DiningTableId)
            .Distinct()
            .ToListAsync();

        var availableTables = await _context.DiningTables
            .Where(t => t.Capacity >= paxCount && !reservedTableIds.Contains(t.Id))
            .ToListAsync();

        return Ok(availableTables);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> CreateTable(DiningTable table)
    {
        _context.DiningTables.Add(table);
        await _context.SaveChangesAsync();
        return Ok(table);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTable(int id, DiningTable table)
    {
        if (id != table.Id) return BadRequest();
        _context.Entry(table).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTable(int id)
    {
        var table = await _context.DiningTables.FindAsync(id);
        if (table == null) return NotFound();

        if (table.Status != TableStatus.Available)
        {
            return BadRequest("Không thể xóa bàn đang có khách hoặc đang được đặt trước.");
        }

        _context.DiningTables.Remove(table);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] TableStatusUpdateDto request)
    {
        var table = await _context.DiningTables.FindAsync(id);
        if (table == null) return NotFound();

        table.Status = request.Status;
        await _context.SaveChangesAsync();

        // Đồng bộ SignalR
        await _hubContext.Clients.All.SendAsync("TableStatusChanged", id, (int)request.Status);

        return Ok(table);
    }
}

public class TableStatusUpdateDto
{
    public TableStatus Status { get; set; }
}
