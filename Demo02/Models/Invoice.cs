using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConnectDB.Models;

public class Invoice
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }

    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;

    public int? CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer? Customer { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    public string? AppliedVoucherCode { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal VatAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ServiceChargeAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal FinalAmount { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
}
