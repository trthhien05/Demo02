using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class Recipe
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int MenuItemId { get; set; }

    [ForeignKey("MenuItemId")]
    public MenuItem MenuItem { get; set; } = null!;

    [Required]
    public int InventoryItemId { get; set; }

    [ForeignKey("InventoryItemId")]
    public InventoryItem InventoryItem { get; set; } = null!;

    [Column(TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; } // Lượng nguyên liệu tiêu hao cho 1 suất ăn
}
