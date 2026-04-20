using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ConnectDB.Models;

public class Reservation
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer? Customer { get; set; }

    [Required]
    public int DiningTableId { get; set; }

    [ForeignKey("DiningTableId")]
    public DiningTable? DiningTable { get; set; }

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    public int PaxCount { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    [MaxLength(500)]
    public string? SpecialRequests { get; set; }

    [MaxLength(50)]
    public string Source { get; set; } = "Manual"; // Manual, Phone, Website, App

    public bool ReminderSent { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
