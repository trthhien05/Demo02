using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class Reservation
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    public int PaxCount { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    [MaxLength(500)]
    public string? SpecialRequests { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
