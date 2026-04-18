using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Cryptography;
using System.Text;

namespace ConnectDB.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
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
                u.CreatedAt
            })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost]
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
    public async Task<IActionResult> UpdateStaff(int id, UpdateStaffRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.FullName = request.FullName;
        user.Role = request.Role;
        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.Department = request.Department;

        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash = HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();
        return Ok(user);
    }

    [HttpDelete("{id}")]
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
}
