using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using Microsoft.AspNetCore.Authorization;
using ConnectDB.Filters;

namespace ConnectDB.Controllers;

[ApiController]
[DisableGlobalAudit]
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
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? search = null,
        [FromQuery] string? module = null,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 15)
    {
        var query = _context.AuditLogs
            .Include(l => l.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(l => 
                (l.Description != null && l.Description.ToLower().Contains(search.ToLower())) || 
                (l.User != null && l.User.FullName != null && l.User.FullName.ToLower().Contains(search.ToLower())));
        }

        if (!string.IsNullOrEmpty(module) && module != "all")
        {
            query = query.Where(l => l.Module == module);
        }

        var totalCount = await query.CountAsync();
        
        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new {
            Items = logs,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            Page = page,
            PageSize = pageSize
        });
    }
}
