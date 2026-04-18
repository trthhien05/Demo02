using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class AuditLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty; // e.g., Create, Update, Delete, Login

    [Required]
    [MaxLength(100)]
    public string Module { get; set; } = string.Empty; // e.g., Order, Inventory, Settings

    [MaxLength(1000)]
    public string? Description { get; set; } // e.g., "Updated tax rate from 8% to 10%"

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
