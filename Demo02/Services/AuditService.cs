using ConnectDB.Data;
using ConnectDB.Models;

namespace ConnectDB.Services;

public interface IAuditService
{
    Task LogAsync(int userId, string action, string module, string description, string? ipAddress = null);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _context;

    public AuditService(AppDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(int userId, string action, string module, string description, string? ipAddress = null)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            Module = module,
            Description = description,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
