using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class LoyaltyTransaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer? Customer { get; set; }

    [Required]
    [MaxLength(50)]
    public string TransactionReference { get; set; } = string.Empty; // Mã hóa đơn từ POS

    [Required]
    public decimal InvoiceAmount { get; set; }

    [Required]
    public int PointsEarned { get; set; }

    [Required]
    public bool IsAdjustment { get; set; } = false; // Phục vụ nếu admin thay đổi tay

    [MaxLength(255)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
