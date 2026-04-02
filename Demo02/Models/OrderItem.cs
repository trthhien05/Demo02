using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class OrderItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }

    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;

    [Required]
    public int MenuItemId { get; set; }

    [ForeignKey("MenuItemId")]
    public MenuItem MenuItem { get; set; } = null!;

    [Required]
    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    [MaxLength(200)]
    public string? Note { get; set; } // Ghi chú yêu cầu món (ví dụ: "Ít đường", "Không cay")
}
