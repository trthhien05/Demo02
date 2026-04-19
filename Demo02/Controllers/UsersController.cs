using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Cryptography;
using System.Text;
using ConnectDB.Services;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Require authentication for all endpoints
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _audit;

    public UsersController(AppDbContext context, IAuditService audit)
    {
        _context = context;
        _audit = audit;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")] // Restrict listing to Admins only
    public async Task<IActionResult> GetAllStaff()
    {
        var users = await _context.Users
            .Select(u => new 
            {
                u.Id,
                u.Username,
                u.FullName,
                u.Role,
                u.Email,
                u.PhoneNumber,
                u.Department,
                u.CreatedAt,
                u.IsActive,
                IsClockedIn = _context.Shifts.Any(s => s.UserId == u.Id && s.EndTime == null)
            })
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(user);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.Address = request.Address;
        user.Bio = request.Bio;
        user.AvatarUrl = request.AvatarUrl;
        user.DateOfBirth = request.DateOfBirth;
        user.Gender = request.Gender;
        user.Department = request.Department;

        await _context.SaveChangesAsync();
        await _audit.LogAsync(userId, "Cập nhật", "Hồ sơ", "Người dùng đã cập nhật thông tin cá nhân");

        return Ok(user);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (user.PasswordHash != HashPassword(request.OldPassword))
        {
            return BadRequest(new { Message = "Mật khẩu cũ không chính xác" });
        }

        user.PasswordHash = HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(userId, "Cập nhật", "Bảo mật", "Người dùng đã thay đổi mật khẩu");

        return Ok(new { Message = "Đổi mật khẩu thành công" });
    }
    
    [HttpGet("my-activity")]
    public async Task<IActionResult> GetMyActivity()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        var logs = await _context.AuditLogs
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(10)
            .ToListAsync();
            
        return Ok(logs);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateStaff(CreateStaffRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            return BadRequest("Tên đăng nhập đã tồn tại");

        var user = new User
        {
            Username = request.Username,
            PasswordHash = HashPassword(request.Password),
            FullName = request.FullName,
            Role = request.Role,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            Department = request.Department,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return Ok(user);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStaff(int id, UpdateStaffRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.FullName = request.FullName;
        user.Role = request.Role;
        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.Department = request.Department;
        user.IsActive = request.IsActive;

        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash = HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();
        return Ok(user);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();
        
        // Prevent deleting yourself
        var currentUserId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (id == currentUserId) return BadRequest("Bạn không thể xóa chính tài khoản của mình");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return Ok();
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return BitConverter.ToString(hashedBytes).Replace("-", "").ToLower();
    }
}

public class CreateStaffRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public UserRole Role { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
}

public class UpdateStaffRequest
{
    public string? Password { get; set; }
    public string? FullName { get; set; }
    public UserRole Role { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Department { get; set; }
}

public class ChangePasswordRequest
{
    public string OldPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
