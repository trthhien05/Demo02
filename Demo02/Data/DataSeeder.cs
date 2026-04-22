using System;
using System.Linq;
using System.Security.Cryptography;
using ConnectDB.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ConnectDB.Data;

public static class DataSeeder
{
    public static void SeedAll(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // 0. Auto-Healing: Đảm bảo các cột quan trọng tồn tại bằng Raw SQL (Phòng trường hợp Migration bị kẹt trên Render)
        EnsureProfessionalReservationColumns(context);

        try
        {
            SeedUsers(context);
            SeedTables(context);
            SeedMenu(context);
            SeedCustomers(context);
            SeedInventory(context);
            SeedHistory(context); // Orders & Invoices
            SeedReservations(context);
            SeedVouchers(context);

            // Nâng cấp dữ liệu cũ (Legacy Migration)
            FixOrphanReservations(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEEDER] An error occurred during seeding or migration: {ex.Message}");
            // Không văng lỗi (crash) để ứng dụng vẫn có thể khởi động
        }
    }

    private static void EnsureProfessionalReservationColumns(AppDbContext context)
    {
        try
        {
            Console.WriteLine("[DB HEALING] Checking database schema integrity for Reservations...");

            // Danh sách các cột cần đảm bảo tồn tại
            var columnsToAdd = new Dictionary<string, string>
            {
                { "DiningTableId", "INTEGER NOT NULL DEFAULT 0" },
                { "ReminderSent", "BOOLEAN NOT NULL DEFAULT FALSE" },
                { "Source", "VARCHAR(50) NOT NULL DEFAULT 'Manual'" },
                { "CreatedAt", "TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP" }
            };

            foreach (var col in columnsToAdd)
            {
                // Kiểm tra sự tồn tại của cột trong PostgreSQL
                var checkSql = $@"
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'Reservations' AND column_name = '{col.Key}'";

                // Lưu ý: Trong PostgreSQL, EF Core thường tạo tên bảng có viết hoa/thường, 
                // nhưng Npgsql/Postgres lưu trữ lowercase mặc định trừ khi để trong dấu ""
                // Chúng ta sẽ thử cả 2 trường hợp hoặc dùng query chuẩn nhất
                
                // Thực hiện Alter Table trực tiếp nếu cần
                var addColSql = $@"
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservations' AND column_name = '{col.Key.ToLower()}') 
                        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservations' AND column_name = '{col.Key}') THEN
                            ALTER TABLE ""Reservations"" ADD COLUMN ""{col.Key}"" {col.Value};
                        END IF;
                    END $$;";

                context.Database.ExecuteSqlRaw(addColSql);
            }

            Console.WriteLine("[DB HEALING] Schema integrity check completed successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB HEALING] Warning: Could not perform auto-healing: {ex.Message}");
        }
    }

    private static void FixOrphanReservations(AppDbContext context)
    {
        try
        {
            // Tìm các đặt bàn cũ chưa có liên kết bàn (mặc định ban đầu là 0)
            var orphans = context.Reservations.Where(r => r.DiningTableId == 0).ToList();
            if (!orphans.Any()) return;

            // Tìm bàn đầu tiên làm "cứu cánh"
            var firstTable = context.DiningTables.OrderBy(t => t.Id).FirstOrDefault();
            if (firstTable == null) return;

            foreach (var r in orphans)
            {
                r.DiningTableId = firstTable.Id;
            }

            context.SaveChanges();
            Console.WriteLine($"[DATA MIGRATION] Updated {orphans.Count} legacy reservations.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DATA MIGRATION] Skipping migration due to error: {ex.Message}");
        }
    }

    private static void SeedUsers(AppDbContext context)
    {
        if (context.Users.Any()) return;

        var users = new[]
        {
            new User { Username = "admin", PasswordHash = HashPassword("admin123"), FullName = "Trần Thành Hiển", Role = UserRole.Admin, Email = "doanvanhieu179@gmail.com", PhoneNumber = "0869165351", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801234/avatars/admin.png" },
            new User { Username = "kitchen", PasswordHash = HashPassword("kitchen123"), FullName = "Huỳnh Ngọc Thạch", Role = UserRole.Kitchen, Email = "chonguathach@gmail.com", PhoneNumber = "0345660934", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801235/avatars/chef.png" },
            new User { Username = "cashier", PasswordHash = HashPassword("cashier123"), FullName = "Nguyễn Thị Cẩm Tú", Role = UserRole.Cashier, Email = "nguyenthicamtu332@gmail.com", PhoneNumber = "0355051308", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801236/avatars/cashier.png" },
            new User { Username = "waiter", PasswordHash = HashPassword("waiter123"), FullName = "Nguyễn Anh Tính", Role = UserRole.Waiter, Email = "anhtinh@gmail.com", PhoneNumber = "0375335833", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801237/avatars/waiter.png" }
        };

        context.Users.AddRange(users);
        context.SaveChanges();
    }

    private static void SeedTables(AppDbContext context)
    {
        if (context.DiningTables.Any()) return;

        var tables = new List<DiningTable>();
        // Indoor Zone
        for (int i = 1; i <= 5; i++) 
            tables.Add(new DiningTable { TableNumber = $"I-{i:D2}", Capacity = 4, Status = TableStatus.Available, Zone = "Indoor" });
        // Outdoor Zone
        for (int i = 1; i <= 5; i++) 
            tables.Add(new DiningTable { TableNumber = $"O-{i:D2}", Capacity = 2, Status = TableStatus.Available, Zone = "Outdoor" });
        // VIP Zone
        for (int i = 1; i <= 3; i++) 
            tables.Add(new DiningTable { TableNumber = $"VIP-{i:D2}", Capacity = i * 2 + 4, Status = TableStatus.Available, Zone = "VIP" });

        // Set some mixed statuses
        tables[0].Status = TableStatus.Occupied;
        tables[1].Status = TableStatus.Reserved;
        tables[2].Status = TableStatus.Cleaning;
        tables[11].Status = TableStatus.Occupied;

        context.DiningTables.AddRange(tables);
        context.SaveChanges();
    }

    private static void SeedMenu(AppDbContext context)
    {
        if (context.MenuCategories.Any()) return;

        var categories = new[]
        {
            new MenuCategory { Name = "Món Chính", Description = "Các món đặc trưng của nhà hàng" },
            new MenuCategory { Name = "Đồ Uống", Description = "Cocktails, Rượu & Nước ép" },
            new MenuCategory { Name = "Tráng Miệng", Description = "Bánh ngọt & Trái cây" }
        };
        context.MenuCategories.AddRange(categories);
        context.SaveChanges();

        var mainId = categories[0].Id;
        var drinkId = categories[1].Id;
        var dessertId = categories[2].Id;

        var items = new[]
        {
            new MenuItem { Name = "Bò Wagyu Nướng Đá", Description = "Thịt bò Wagyu cao cấp nướng trên đá nóng", Price = 1250000, CategoryId = mainId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947" },
            new MenuItem { Name = "Cần Tây Sốt Vang", Description = "Món khai vị nhẹ nhàng sang trọng", Price = 150000, CategoryId = mainId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" },
            new MenuItem { Name = "Cá Hồi Na Uy Áp Chảo", Description = "Cá hồi tươi ngon cùng sốt chanh leo", Price = 450000, CategoryId = mainId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1467003909585-2f8a72700288" },
            new MenuItem { Name = "Tôm Hùm Alaska Hấp", Description = "Tôm hùm nguyên con sốt bơ tỏi", Price = 2500000, CategoryId = mainId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1559742811-822873691df8" },
            new MenuItem { Name = "Cocktail Signature", Description = "Vị mạnh mẽ từ rượu nền sồi", Price = 280000, CategoryId = drinkId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b" },
            new MenuItem { Name = "Rượu Vang Đỏ (Ly)", Description = "Vang từ vùng Bordeaux nước Pháp", Price = 195000, CategoryId = drinkId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3" },
            new MenuItem { Name = "Tiramisu Gold Leaf", Description = "Bánh Tiramisu rắc vàng 24k", Price = 320000, CategoryId = dessertId, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1543508282-5c1f427f023f" }
        };

        context.MenuItems.AddRange(items);
        context.SaveChanges();
    }

    private static void SeedCustomers(AppDbContext context)
    {
        if (context.Customers.Any()) return;

        var customers = new[]
        {
            new Customer { FullName = "Trần Anh Tuấn", PhoneNumber = "0987654321", Email = "tuan.tran@gmail.com", Points = 5000, Tier = CustomerTier.Diamond, Segment = "VVIP" },
            new Customer { FullName = "Lê Thị Hồng", PhoneNumber = "0123456789", Email = "hong.le@yahoo.com", Points = 2500, Tier = CustomerTier.Gold, Segment = "Regular" },
            new Customer { FullName = "Nguyễn Văn Nam", PhoneNumber = "0909112233", Email = "nam.nv@fpt.vn", Points = 1200, Tier = CustomerTier.Silver, Segment = "Loyalty" },
            new Customer { FullName = "Phạm Gia Bảo", PhoneNumber = "0888999000", Email = "baopg@promax.vn", Points = 300, Tier = CustomerTier.Member, Segment = "New" }
        };

        context.Customers.AddRange(customers);
        context.SaveChanges();
    }

    private static void SeedInventory(AppDbContext context)
    {
        if (context.InventoryItems.Any()) return;

        var items = new[]
        {
            new InventoryItem { Name = "Thịt Bò Wagyu", StockQuantity = 25, Unit = "Kg", MinStockLevel = 5 },
            new InventoryItem { Name = "Cá Hồi Na Uy", StockQuantity = 15, Unit = "Kg", MinStockLevel = 3 },
            new InventoryItem { Name = "Tôm Hùm Alaska", StockQuantity = 4, Unit = "Con", MinStockLevel = 5 }, // Low Stock!
            new InventoryItem { Name = "Rượu Vang Đỏ", StockQuantity = 48, Unit = "Chai", MinStockLevel = 12 },
            new InventoryItem { Name = "Gạo ST25", StockQuantity = 100, Unit = "Kg", MinStockLevel = 20 }
        };

        context.InventoryItems.AddRange(items);
        context.SaveChanges();
    }

    private static void SeedHistory(AppDbContext context)
    {
        if (context.Invoices.Any()) return;

        var random = new Random();
        var customers = context.Customers.ToList();
        var tables = context.DiningTables.ToList();
        var menuItems = context.MenuItems.ToList();

        // Seed Orders and Invoices for the last 30 days
        for (int i = 30; i >= 0; i--)
        {
            var date = DateTime.UtcNow.Date.AddDays(-i);
            int ordersToday = random.Next(4, 10); // 4-9 orders per day

            for (int k = 0; k < ordersToday; k++)
            {
                var customer = customers[random.Next(customers.Count)];
                var table = tables[random.Next(tables.Count)];
                
                // 1-4 random menu items
                var itemsCount = random.Next(1, 5);
                var orderItems = new List<OrderItem>();
                decimal total = 0;
                for (int j = 0; j < itemsCount; j++)
                {
                    var mi = menuItems[random.Next(menuItems.Count)];
                    var qty = random.Next(1, 3);
                    orderItems.Add(new OrderItem { 
                        MenuItemId = mi.Id, 
                        Quantity = qty, 
                        UnitPrice = mi.Price 
                    });
                    total += mi.Price * qty;
                }

                // If it's today, some orders should be ACTIVE for the Kitchen/Dashboard view
                OrderStatus orderStatus = OrderStatus.Completed;
                if (i == 0 && k < 3) // First 3 orders today are active
                {
                    orderStatus = (OrderStatus)random.Next(0, 3); // Pending, Preparing, or Served
                    table.Status = TableStatus.Occupied;
                }

                var order = new Order
                {
                    DiningTableId = table.Id,
                    Status = orderStatus,
                    TotalAmount = total,
                    CreatedAt = date.AddHours(random.Next(8, 22)),
                    OrderItems = orderItems
                };
                context.Orders.Add(order);
                context.SaveChanges();

                // Only create Invoices for Completed orders
                if (orderStatus == OrderStatus.Completed || orderStatus == OrderStatus.Served)
                {
                    var invoice = new Invoice
                    {
                        OrderId = order.Id,
                        CustomerId = customer.Id,
                        Subtotal = total * 0.92m,
                        VatAmount = total * 0.08m,
                        FinalAmount = total,
                        IssuedAt = order.CreatedAt,
                        Status = (orderStatus == OrderStatus.Completed) ? InvoiceStatus.Paid : InvoiceStatus.Unpaid,
                        PaymentMethod = (PaymentMethod)random.Next(0, 4)
                    };
                    context.Invoices.Add(invoice);
                }
            }
        }
        context.SaveChanges();
    }

    private static void SeedReservations(AppDbContext context)
    {
        if (context.Reservations.Any()) return;

        var customers = context.Customers.ToList();
        var firstTable = context.DiningTables.FirstOrDefault();
        if (firstTable == null) return;

        var items = new[]
        {
            new Reservation { CustomerId = customers[0].Id, DiningTableId = firstTable.Id, ReservationTime = DateTime.UtcNow.AddHours(2), PaxCount = 4, Status = ReservationStatus.Confirmed, SpecialRequests = "Gần cửa sổ, chuẩn bị hoa chúc mừng sinh nhật." },
            new Reservation { CustomerId = customers[1].Id, DiningTableId = firstTable.Id, ReservationTime = DateTime.UtcNow.AddDays(1).AddHours(19), PaxCount = 2, Status = ReservationStatus.Confirmed, SpecialRequests = "Kỷ niệm ngày cưới." }
        };
        context.Reservations.AddRange(items);
        context.SaveChanges();
    }

    private static void SeedVouchers(AppDbContext context)
    {
        if (context.Vouchers.Any()) return;

        var customers = context.Customers.ToList();
        var items = new[]
        {
            new Voucher { CustomerId = customers[0].Id, Code = "DIAMOND_2024", Description = "Ưu đãi hạng Diamond", Value = 20, DiscountType = DiscountType.Percentage, ExpiryDate = DateTime.UtcNow.AddMonths(2), IsUsed = false },
            new Voucher { CustomerId = customers[1].Id, Code = "WELCOME_HONG", Description = "Chào mừng khách hàng mới", Value = 200000, DiscountType = DiscountType.FixedAmount, ExpiryDate = DateTime.UtcNow.AddDays(7), IsUsed = false }
        };
        context.Vouchers.AddRange(items);
        context.SaveChanges();
    }

    private static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations: 100000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
