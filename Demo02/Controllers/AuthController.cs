using Microsoft.AspNetCore.Mvc;
using ConnectDB.Services;
using ConnectDB.Models;
using System.Threading.Tasks;
using System;

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
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var token = await _authService.LoginAsync(request.Username, request.Password);
        if (token == null)
            return Unauthorized("Tên đăng nhập hoặc mật khẩu không chính xác.");

        return Ok(new { Token = token });
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
