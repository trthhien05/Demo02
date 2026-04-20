using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ConnectDB.Models;

public class Customer
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(15)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FullName { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(10)]
    public string? Gender { get; set; }

    public int Points { get; set; } = 0;

    public CustomerTier Tier { get; set; } = CustomerTier.Member;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastVisit { get; set; }

    public bool IsOptOutMarketing { get; set; } = false;

    [MaxLength(50)]
    public string? Segment { get; set; } // Ví dụ: "New", "Loyal", "AtRisk"

    // Navigation property
    [JsonIgnore]
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    
    public ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
