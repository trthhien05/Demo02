using System.ComponentModel.DataAnnotations;

namespace ConnectDB.Models;

public class DiningTable
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string TableNumber { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public TableStatus Status { get; set; } = TableStatus.Available;

    [MaxLength(50)]
    public string? Zone { get; set; } // Ví dụ: Tầng 1, Sân vườn, VIP
}
