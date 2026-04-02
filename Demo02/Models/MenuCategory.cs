using System.ComponentModel.DataAnnotations;

namespace ConnectDB.Models;

public class MenuCategory
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
}
