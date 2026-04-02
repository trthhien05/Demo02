using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class InventoryItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Unit { get; set; } = string.Empty; // Kg, Gram, Liter, Piece, Can...

    [Column(TypeName = "decimal(18,3)")] // Độ chính xác 3 chữ số thập phân (Kg -> Gram)
    public decimal StockQuantity { get; set; }

    [Column(TypeName = "decimal(18,3)")]
    public decimal MinStockLevel { get; set; } // Ngưỡng báo động nhập hàng

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
