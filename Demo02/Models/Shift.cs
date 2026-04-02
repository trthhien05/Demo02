using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class Shift
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    [Required]
    public DateTime StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; } // Ghi chú bàn giao hoặc vấn đề trong ca
}
