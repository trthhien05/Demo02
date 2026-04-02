using System;
using System.Linq;
using System.Security.Cryptography;
using ConnectDB.Models;
using Microsoft.Extensions.DependencyInjection;

namespace ConnectDB.Data;

public static class DataSeeder
{
    public static void SeedUsers(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Kiểm tra nếu đã có User thì không Seed
        if (context.Users.Any()) return;

        var users = new[]
        {
            new User 
            { 
                Username = "admin", 
                FullName = "Administrator", 
                Role = UserRole.Admin, 
                PasswordHash = HashPassword("123456") 
            },
            new User 
            { 
                Username = "waiter", 
                FullName = "Nhân viên Phục vụ", 
                Role = UserRole.Waiter, 
                PasswordHash = HashPassword("123456") 
            },
            new User 
            { 
                Username = "kitchen", 
                FullName = "Đầu bếp Chính", 
                Role = UserRole.Kitchen, 
                PasswordHash = HashPassword("123456") 
            },
            new User 
            { 
                Username = "cashier", 
                FullName = "Thu ngân (Cửa hàng)", 
                Role = UserRole.Cashier, 
                PasswordHash = HashPassword("123456") 
            }
        };

        context.Users.AddRange(users);
        context.SaveChanges();
    }

    private static string HashPassword(string password)
    {
        // Replicate logic from AuthService.cs for Seeding
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations: 100000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
