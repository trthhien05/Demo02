using System.ComponentModel.DataAnnotations;

namespace ConnectDB.Models;

public class RestaurantSetting
{
    [Key]
    public int Id { get; set; } = 1; // Always Id 1 for global config

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = "VIP Promax Restaurant";

    [MaxLength(200)]
    public string? Address { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "VNĐ";

    public decimal TaxRate { get; set; } = 8.0m;

    public decimal ServiceCharge { get; set; } = 0.0m;

    public string? Email { get; set; }
    
    public string? Website { get; set; }

    [MaxLength(200)]
    public string? OpeningHours { get; set; } = "08:00 - 22:00";

    [MaxLength(500)]
    public string? FacebookUrl { get; set; }

    [MaxLength(500)]
    public string? InstagramUrl { get; set; }

    [MaxLength(20)]
    public string? ZaloNumber { get; set; }
}
