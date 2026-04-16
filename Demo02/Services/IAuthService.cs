using System.Threading.Tasks;
using ConnectDB.Models;

namespace ConnectDB.Services;

public interface IAuthService
{
    Task<User> RegisterAsync(string username, string password, string fullName, UserRole role);
    Task<(string AccessToken, string RefreshToken)?> LoginAsync(string username, string password);
    Task<(string AccessToken, string RefreshToken)?> RefreshTokenAsync(string accessToken, string refreshToken);
    Task RevokeTokenAsync(string username);
    Task<string?> GeneratePasswordResetTokenAsync(string usernameOrEmail);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
    Task<User?> GetByIdAsync(int userId);
    Task<bool> UpdateProfileAsync(int userId, string fullName, string email, string? phoneNumber, string? avatarUrl, string? bio, DateTime? dateOfBirth, string? gender, string? address, string? department);
    Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword);
}
