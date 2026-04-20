using Microsoft.EntityFrameworkCore;
using ConnectDB.Models;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ConnectDB.Data;

public class AppDbContext : DbContext
{
    // Constructor để nhận Connection String từ Program.cs
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Customer> Customers { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; }
    public DbSet<Voucher> Vouchers { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<MenuCategory> MenuCategories { get; set; }
    public DbSet<MenuItem> MenuItems { get; set; }
    public DbSet<DiningTable> DiningTables { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<Recipe> Recipes { get; set; }
    public DbSet<Shift> Shifts { get; set; }
    public DbSet<RestaurantSetting> RestaurantSettings { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global UTC conversion for PostgreSQL
        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(dateTimeConverter);
                }
            }
        }

        // Precision cho Restaurant Settings
        modelBuilder.Entity<RestaurantSetting>().Property(r => r.TaxRate).HasPrecision(18, 2);
        modelBuilder.Entity<RestaurantSetting>().Property(r => r.ServiceCharge).HasPrecision(18, 2);

        // Precision cho Kho
        modelBuilder.Entity<InventoryItem>().Property(i => i.StockQuantity).HasPrecision(18, 3);
        modelBuilder.Entity<InventoryItem>().Property(i => i.MinStockLevel).HasPrecision(18, 3);
        modelBuilder.Entity<Recipe>().Property(r => r.Quantity).HasPrecision(18, 3);

        // Precision cho Invoice
        var invoiceEntity = modelBuilder.Entity<Invoice>();
        invoiceEntity.Property(i => i.Subtotal).HasPrecision(18, 2);
        invoiceEntity.Property(i => i.DiscountAmount).HasPrecision(18, 2);
        invoiceEntity.Property(i => i.VatAmount).HasPrecision(18, 2);
        invoiceEntity.Property(i => i.ServiceChargeAmount).HasPrecision(18, 2);
        invoiceEntity.Property(i => i.FinalAmount).HasPrecision(18, 2);

        // Precision cho Order
        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.UnitPrice)
            .HasPrecision(18, 2);

        // Username là cụm duy nhất
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Đảm bảo số điện thoại là Unique
        modelBuilder.Entity<Customer>()
            .HasIndex(c => c.PhoneNumber)
            .IsUnique();

        modelBuilder.Entity<DiningTable>().HasIndex(t => t.TableNumber).IsUnique();
        modelBuilder.Entity<MenuItem>().Property(m => m.Price).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.Subtotal).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.VatAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.ServiceChargeAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.FinalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<LoyaltyTransaction>().Property(t => t.InvoiceAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Voucher>().Property(v => v.Value).HasPrecision(18, 2);
    }
}