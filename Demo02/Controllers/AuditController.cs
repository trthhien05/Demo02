using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] int limit = 100)
    {
        var logs = await _context.AuditLogs
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new 
            {
                l.Id,
                l.Action,
                l.Module,
                l.Description,
                l.CreatedAt,
                l.IpAddress,
                UserFullName = l.User != null ? l.User.FullName : "System",
                Username = l.User != null ? l.User.Username : "system"
            })
            .ToListAsync();
        return Ok(logs);
    }
}
