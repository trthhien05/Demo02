using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace ConnectDB.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthService(AppDbContext context, IConfiguration configuration, IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
    }

    public async Task<User> RegisterAsync(string username, string password, string fullName, UserRole role)
    {
        var existingUser = await _context.Users.AnyAsync(u => u.Username == username);
        if (existingUser) throw new Exception("Tên đăng nhập đã tồn tại.");

        var user = new User
        {
            Username = username,
            FullName = fullName,
            Role = role,
            PasswordHash = HashPassword(password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<(string AccessToken, string RefreshToken)?> LoginAsync(string username, string password)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null || !VerifyPassword(password, user.PasswordHash))
            return null;

        var accessToken = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7); // Token sống 7 ngày

        await _context.SaveChangesAsync();

        return (accessToken, refreshToken);
    }

    public async Task<(string AccessToken, string RefreshToken)?> RefreshTokenAsync(string accessToken, string refreshToken)
    {
        // Ta tìm user có RefreshToken tương ứng và kiểm tra hạn
        var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);
        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return null; // Token không hợp lệ hoặc đã hết hạn
        }

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return (newAccessToken, newRefreshToken);
    }

    public async Task RevokeTokenAsync(string username)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null) return;

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;

        await _context.SaveChangesAsync();
    }

    private string HashPassword(string password)
    {
        // Sử dụng PBKDF2 để hash mật khẩu (chuẩn an toàn)
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations: 100000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 2) return false;

        byte[] salt = Convert.FromBase64String(parts[0]);
        byte[] hash = Convert.FromBase64String(parts[1]);

        byte[] newHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations: 100000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return CryptographicOperations.FixedTimeEquals(hash, newHash);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            }),
            Expires = DateTime.UtcNow.AddHours(4),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public async Task<string?> GeneratePasswordResetTokenAsync(string usernameOrEmail)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == usernameOrEmail || (u.Email != null && u.Email == usernameOrEmail));
        if (user == null) return null;

        var token = new Random().Next(100000, 999999).ToString();
        user.ResetToken = token;
        user.ResetTokenExpiryTime = DateTime.UtcNow.AddMinutes(15);
        await _context.SaveChangesAsync();
        
        // Gửi Mail thật
        if (!string.IsNullOrEmpty(user.Email))
        {
            try 
            {
                var subject = "Khôi phục mật khẩu - PROMAX RMS";
                var body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                        <div style='text-align: center; margin-bottom: 20px;'>
                            <h1 style='color: #8b5cf6; margin: 0;'>PROMAX RMS</h1>
                            <p style='color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;'>Secure Gateway</p>
                        </div>
                        <div style='padding: 20px; background-color: #f9fafb; border-radius: 8px;'>
                            <p>Xin chào <strong>{user.FullName ?? user.Username}</strong>,</p>
                            <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác nhận dưới đây để đổi mật khẩu mới:</p>
                            <div style='text-align: center; margin: 30px 0;'>
                                <span style='font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #1f2937; background: #eee; padding: 10px 20px; border-radius: 5px;'>{token}</span>
                            </div>
                            <p style='font-size: 14px; color: #ef4444;'>Lưu ý: Mã này chỉ có hiệu lực trong vòng 15 phút.</p>
                        </div>
                        <p style='font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;'>
                            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email hoặc liên hệ Quản trị viên để được hỗ trợ.
                        </p>
                    </div>";
                
                await _emailService.SendEmailAsync(user.Email, subject, body);
                Console.WriteLine($"[AUTH SERVICE] Email sent to {user.Email} for user {user.Username}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AUTH SERVICE ERROR] Could not send reset email to {user.Email}: {ex.Message}");
            }
        }
        else
        {
            Console.WriteLine($"[AUTH SERVICE WARNING] User '{user.Username}' (ID: {user.Id}) does not have an Email address set. Reset token generated but not sent.");
        }
        
        return token;
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == token && u.ResetTokenExpiryTime > DateTime.UtcNow);
        if (user == null) return false;

        user.PasswordHash = HashPassword(newPassword);
        user.ResetToken = null;
        user.ResetTokenExpiryTime = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<bool> UpdateProfileAsync(int userId, string fullName, string email)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.FullName = fullName;
        user.Email = email;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (user.PasswordHash != HashPassword(oldPassword)) return false;

        user.PasswordHash = HashPassword(newPassword);
        await _context.SaveChangesAsync();
        return true;
    }

    private string HashPassword(string password)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hash);
    }
}
