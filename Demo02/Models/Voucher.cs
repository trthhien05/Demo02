using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ConnectDB.Models;

public class Voucher
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Description { get; set; }

    [Required]
    public DiscountType DiscountType { get; set; }

    [Required]
    public decimal Value { get; set; }

    [Required]
    public DateTime ExpiryDate { get; set; }

    public bool IsUsed { get; set; } = false;

    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    [JsonIgnore]
    public Customer? Customer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
