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

        // 0. Auto-Healing: Đảm bảo các cột quan trọng tồn tại bằng Raw SQL (Phòng trường hợp Migration bị kẹt ở trên Render)
        EnsureProfessionalReservationColumns(context);

        try
        {
            SeedUsers(context);
            SeedTables(context);
            SeedMenu(context);
            SeedCustomers(context);
            SeedInventory(context);
            SeedRecipes(context);
            SeedHistory(context); // Orders & Invoices
            SeedReservations(context);
            SeedVouchers(context);

            // Nâng cấp dữ liệu cũ (Legacy Migration) & Sửa lỗi đồng bộ bàn/đơn hàng
            FixOrphanReservations(context);
            AutoHealTableStatuses(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEEDER] An error occurred during seeding or migration: {ex.Message}");
            // Không văng lỗi (crash) để ứng dụng vẫn có thể khởi động
        }
    }

    private static void AutoHealTableStatuses(AppDbContext context)
    {
        try
        {
            Console.WriteLine("[DB HEALING] Synchronizing table statuses with active orders...");
            
            // 1. Tìm tất cả bàn đang đánh dấu là Occupied
            var occupiedTables = context.DiningTables.Where(t => t.Status == TableStatus.Occupied).ToList();
            int fixedCount = 0;

            foreach (var table in occupiedTables)
            {
                // Kiểm tra xem có đơn hàng nào đang hoạt động cho bàn này khôngg
                var hasActiveOrder = context.Orders.Any(o => o.DiningTableId == table.Id && 
                                                           o.Status != OrderStatus.Completed && 
                                                           o.Status != OrderStatus.Cancelled);
                
                if (!hasActiveOrder)
                {
                    table.Status = TableStatus.Available;
                    fixedCount++;
                }
            }

            if (fixedCount > 0)
            {
                context.SaveChanges();
                Console.WriteLine($"[DB HEALING] Fixed {fixedCount} inconsistent table statuses (Occupied without active order).");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB HEALING] Error during table status sync: {ex.Message}");
        }
    }

    private static void SeedRecipes(AppDbContext context)
    {
        if (context.Recipes.Count() > 2) return; // Already seeded with some recipes

        var wagyu = context.MenuItems.FirstOrDefault(m => m.Name.Contains("Wagyu"));
        var celery = context.MenuItems.FirstOrDefault(m => m.Name.Contains("Cần Tây"));
        var lobster = context.MenuItems.FirstOrDefault(m => m.Name.Contains("Tôm Hùm"));
        var salmonItem = context.MenuItems.FirstOrDefault(m => m.Name.Contains("Cá Hồi"));
        var wine = context.MenuItems.FirstOrDefault(m => m.Name.Contains("Rượu Vang"));
        
        var beef = context.InventoryItems.FirstOrDefault(i => i.Name.Contains("Thịt Bò"));
        var salmonInv = context.InventoryItems.FirstOrDefault(i => i.Name.Contains("Cá Hồi"));
        var lobsterInv = context.InventoryItems.FirstOrDefault(i => i.Name.Contains("Tôm Hùm"));
        var wineInv = context.InventoryItems.FirstOrDefault(i => i.Name.Contains("Rượu Vang"));
        
        if (wagyu != null && beef != null)
            context.Recipes.Add(new Recipe { MenuItemId = wagyu.Id, InventoryItemId = beef.Id, Quantity = 0.3m });

        if (celery != null && beef != null)
            context.Recipes.Add(new Recipe { MenuItemId = celery.Id, InventoryItemId = beef.Id, Quantity = 0.1m });

        if (lobster != null && lobsterInv != null)
            context.Recipes.Add(new Recipe { MenuItemId = lobster.Id, InventoryItemId = lobsterInv.Id, Quantity = 1.0m }); // 1 con per dish

        if (salmonItem != null && salmonInv != null)
            context.Recipes.Add(new Recipe { MenuItemId = salmonItem.Id, InventoryItemId = salmonInv.Id, Quantity = 0.2m }); // 200g per dish

        if (wine != null && wineInv != null)
            context.Recipes.Add(new Recipe { MenuItemId = wine.Id, InventoryItemId = wineInv.Id, Quantity = 1.0m }); // 1 ly/chai

        context.SaveChanges();
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
            // Tìm các đặt bàn cũ chưa có liên kết bàn (mặc định ban đầu là 0))
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
        var users = new[]
        {
            new User { Username = "admin", PasswordHash = HashPassword("admin123"), FullName = "Trần Thành Hiển", Role = UserRole.Admin, Email = "doanvanhieu379@gmail.com", PhoneNumber = "0869165351", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801234/avatars/admin.png" },
            new User { Username = "kitchen", PasswordHash = HashPassword("kitchen123"), FullName = "Huỳnh Ngọc Thạch", Role = UserRole.Kitchen, Email = "chonguathach@gmail.com", PhoneNumber = "0345660934", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801235/avatars/chef.png" },
            new User { Username = "cashier", PasswordHash = HashPassword("cashier123"), FullName = "Nguyễn Thị Cẩm Tú", Role = UserRole.Cashier, Email = "nguyenthicamtu332@gmail.com", PhoneNumber = "0355051308", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801236/avatars/cashier.png" },
            new User { Username = "waiter", PasswordHash = HashPassword("waiter123"), FullName = "Nguyễn Anh Tính", Role = UserRole.Waiter, Email = "anhtinh@gmail.com", PhoneNumber = "0375335833", AvatarUrl = "https://res.cloudinary.com/drpm4i6y6/image/upload/v1713801237/avatars/waiter.png" }
        };

        foreach (var u in users)
        {
            var existing = context.Users.FirstOrDefault(x => x.Username == u.Username);
            if (existing == null)
            {
                context.Users.Add(u);
            }
            else
            {
                // Force update credentials and info
                existing.PasswordHash = u.PasswordHash;
                existing.FullName = u.FullName;
                existing.Email = u.Email;
                existing.PhoneNumber = u.PhoneNumber;
                existing.AvatarUrl = u.AvatarUrl;
            }
        }
        
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

        context.DiningTables.AddRange(tables);
        context.SaveChanges();
    }

    private static void SeedMenu(AppDbContext context)
    {
        if (context.MenuCategories.Count() > 5) return; // Already upgraded

        // Clear small existing menu to upgrade
        if (context.MenuCategories.Any())
        {
            context.MenuItems.RemoveRange(context.MenuItems);
            context.MenuCategories.RemoveRange(context.MenuCategories);
            context.SaveChanges();
        }

        var categories = new[]
        {
            new MenuCategory { Name = "Món Chính", Description = "Tinh hoa ẩm thực nhà hàng" },
            new MenuCategory { Name = "Món Phụ", Description = "Khai vị & Đồ ăn kèm" },
            new MenuCategory { Name = "Lẩu", Description = "Lẩu đặc sắc, ấm áp" },
            new MenuCategory { Name = "Nướng", Description = "Đồ nướng thơm lừng" },
            new MenuCategory { Name = "Chiên / Xào", Description = "Giòn rụm & Đậm đà" },
            new MenuCategory { Name = "Đồ Uống", Description = "Rượu, Cocktails & Nước ép" },
            new MenuCategory { Name = "Tráng Miệng", Description = "Đồ ngọt & Trái cây" },
            new MenuCategory { Name = "Món Ăn Thêm", Description = "Bún, mì, rau thêm" },
            new MenuCategory { Name = "Combo / Set Menu", Description = "Gói ăn đoàn viên, nhóm bạn" }
        };
        context.MenuCategories.AddRange(categories);
        context.SaveChanges();

        var catMap = categories.ToDictionary(c => c.Name, c => c.Id);

        var items = new List<MenuItem>
        {
            // Món Chính
            new MenuItem { Name = "Bò Wagyu Nướng Đá", Description = "Thịt bò Wagyu cao cấp A5 nướng trên đá nóng Nhật Bản", Price = 1250000, CategoryId = catMap["Món Chính"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947" },
            new MenuItem { Name = "Cá Hồi Na Uy Áp Chảo", Description = "Cá hồi phi lê sốt chanh leo và măng tây", Price = 450000, CategoryId = catMap["Món Chính"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1467003909585-2f8a72700288" },
            new MenuItem { Name = "Sườn Cừu Nướng Thảo Mộc", Description = "Sườn cừu non tẩm ướp lá hương thảo", Price = 680000, CategoryId = catMap["Món Chính"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947" },
            
            // Lẩu
            new MenuItem { Name = "Lẩu Thái Hải Sản", Description = "Vị chua cay đặc trưng cùng hải sản tươi sống", Price = 550000, CategoryId = catMap["Lẩu"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547928576-a4a33237ce35" },
            new MenuItem { Name = "Lẩu Nấm Chim Câu", Description = "Thanh đạm, bổ dưỡng từ 10 loại nấm quý", Price = 480000, CategoryId = catMap["Lẩu"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547928576-a4a33237ce35" },

            // Nướng
            new MenuItem { Name = "Dẻ Sườn Bò Mỹ Nướng", Description = "Sườn bò tẩm sốt BBQ độc bản", Price = 390000, CategoryId = catMap["Nướng"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947" },
            new MenuItem { Name = "Ba Chỉ Heo Tộc Nướng", Description = "Thịt heo tộc thơm, giòn bì", Price = 220000, CategoryId = catMap["Nướng"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947" },

            // Chiên / Xào
            new MenuItem { Name = "Tôm Sú Chiên Hoàng Kim", Description = "Tôm sú sốt trứng muối béo ngậy", Price = 320000, CategoryId = catMap["Chiên / Xào"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1559742811-822873691df8" },
            new MenuItem { Name = "Mực Tươi Xào Sa Tế", Description = "Mực lá xào cay nồng", Price = 280000, CategoryId = catMap["Chiên / Xào"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1559742811-822873691df8" },

            // Đồ Uống
            new MenuItem { Name = "Rượu Vang Đỏ (Chai)", Description = "Cabernet Sauvignon danh tiếng", Price = 1850000, CategoryId = catMap["Đồ Uống"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3" },
            new MenuItem { Name = "Cocktail Signature", Description = "Vị mạnh mẽ từ rượu nền sồi", Price = 280000, CategoryId = catMap["Đồ Uống"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b" },
            new MenuItem { Name = "Nước Ép Cam Tươi", Description = "Vitamin C tự nhiên 100%", Price = 65000, CategoryId = catMap["Đồ Uống"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b" },

            // Tráng Miệng
            new MenuItem { Name = "Tiramisu Gold Leaf", Description = "Bánh Tiramisu rắc vàng 24k", Price = 320000, CategoryId = catMap["Tráng Miệng"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1543508282-5c1f427f023f" },
            new MenuItem { Name = "Chocolate Lava Cake", Description = "Socola chảy tan trong miệng", Price = 150000, CategoryId = catMap["Tráng Miệng"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1543508282-5c1f427f023f" },

            // Combo
            new MenuItem { Name = "Set Family Warmth", Description = "Dành cho gia đình 4-6 người. Gồm lẩu, 3 món chính, 2 món phụ", Price = 2450000, CategoryId = catMap["Combo / Set Menu"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547928576-a4a33237ce35" },
            new MenuItem { Name = "Combo Date Night", Description = "Dành cho cặp đôi. 2 món chính cao cấp, 2 vang ly, 1 tráng miệng", Price = 1800000, CategoryId = catMap["Combo / Set Menu"], IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547928576-a4a33237ce35" }
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
