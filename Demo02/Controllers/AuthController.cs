using Microsoft.AspNetCore.Mvc;
using ConnectDB.Services;
using ConnectDB.Models;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.RateLimiting;

namespace ConnectDB.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var user = await _authService.RegisterAsync(request.Username, request.Password, request.FullName, request.Role);
            return Ok(new { Message = "Đăng ký tài khoản thành công!", Username = user.Username });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("login")]
    [EnableRateLimiting("LoginLimiter")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);
        if (result == null)
            return Unauthorized(new { Message = "Tên đăng nhập hoặc mật khẩu không chính xác." });

        SetRefreshTokenCookie(result.Value.RefreshToken);

        return Ok(new { Token = result.Value.AccessToken });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { Message = "Sesssion expired." });

        var accessToken = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        
        var result = await _authService.RefreshTokenAsync(accessToken, refreshToken);
        if (result == null)
        {
            return Unauthorized(new { Message = "Invalid Refresh Token." });
        }

        SetRefreshTokenCookie(result.Value.RefreshToken);

        return Ok(new { Token = result.Value.AccessToken });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Có thể lấy username từ claims hoặc token nếu gửi kèm. Nếu client gọi lúc chưa hết hạn access token
        var username = User.Identity?.Name;
        if (!string.IsNullOrEmpty(username))
        {
            await _authService.RevokeTokenAsync(username);
        }

        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None
        });

        return Ok(new { Message = "Đăng xuất thành công." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var token = await _authService.GeneratePasswordResetTokenAsync(request.Identifier);
        if (token == null)
        {
            // Always return OK to prevent username enumeration
            return Ok(new { Message = "Nếu tài khoản tồn tại và có email hợp lệ, mã xác nhận đã được gửi đi." });
        }
        
        return Ok(new { Message = "Mã xác nhận đã được gửi tới Email của bạn." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!result)
        {
            return BadRequest(new { Message = "Mã xác nhận không hợp lệ hoặc đã hết hạn." });
        }
        
        return Ok(new { Message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }

    private void SetRefreshTokenCookie(string token)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = DateTime.UtcNow.AddDays(7),
            Secure = true, // Sử dụng cross-origin (Next.js gọi tới API .NET)
            SameSite = SameSiteMode.None
        };
        Response.Cookies.Append("refreshToken", token, cookieOptions);
    }
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Staff;
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ForgotPasswordRequest
{
    public string Identifier { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
