using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using System.Linq;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;
using ConnectDB.Models;

namespace ConnectDB.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);
        var firstDayOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // 1. Revenue & Growth
        var todayRevenue = await _context.Invoices
            .Where(i => i.Status == InvoiceStatus.Paid && i.IssuedAt >= today)
            .SumAsync(i => i.FinalAmount);

        var yesterdayRevenue = await _context.Invoices
            .Where(i => i.Status == InvoiceStatus.Paid && i.IssuedAt >= yesterday && i.IssuedAt < today)
            .SumAsync(i => i.FinalAmount);

        double revenueGrowth = 0;
        if (yesterdayRevenue > 0)
        {
            revenueGrowth = (double)((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100);
        }

        // 2. Tables
        var totalTables = await _context.DiningTables.CountAsync();
        var activeTables = await _context.DiningTables.CountAsync(t => t.Status == TableStatus.Occupied);

        // 3. Customers
        var totalCustomers = await _context.Customers.CountAsync();
        
        // 4. Orders
        var activeOrdersCount = await _context.Orders
            .CountAsync(o => o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled);

        // 5. Average Check (Total Revenue / Total Invoices)
        var totalLifetimeRevenue = await _context.Invoices.Where(i => i.Status == InvoiceStatus.Paid).SumAsync(i => i.FinalAmount);
        var totalInvoices = await _context.Invoices.CountAsync(i => i.Status == InvoiceStatus.Paid);
        decimal averageCheck = totalInvoices > 0 ? totalLifetimeRevenue / totalInvoices : 0;

        return Ok(new
        {
            TodayRevenue = todayRevenue,
            RevenueGrowth = Math.Round(revenueGrowth, 1),
            ActiveTables = activeTables,
            TotalTables = totalTables,
            TotalCustomers = totalCustomers,
            ActiveOrders = activeOrdersCount,
            AverageCheck = averageCheck,
            TodayReservations = await _context.Reservations.CountAsync(r => r.ReservationTime >= today && r.ReservationTime < today.AddDays(1)),
            LowStockAlerts = await _context.InventoryItems.CountAsync(i => i.StockQuantity <= i.MinStockLevel)
        });
    }

    // GET: api/reports/customer-summary
    [HttpGet("customer-summary")]
    public async Task<IActionResult> GetCustomerSummary()
    {
        var totalCustomers = await _context.Customers.CountAsync();
        
        var segmentDistribution = await _context.Customers
            .GroupBy(c => c.Segment ?? "Unknown")
            .Select(g => new { Segment = g.Key, Count = g.Count() })
            .ToListAsync();

        var tierData = await _context.Customers
            .GroupBy(c => c.Tier)
            .Select(g => new { Tier = g.Key, Count = g.Count() })
            .ToListAsync();

        var tierDistribution = tierData.Select(x => new { Tier = x.Tier.ToString(), Count = x.Count });

        return Ok(new
        {
            TotalCustomers = totalCustomers,
            SegmentDistribution = segmentDistribution,
            TierDistribution = tierDistribution
        });
    }

    // GET: api/reports/loyalty-stats
    [HttpGet("loyalty-stats")]
    public async Task<IActionResult> GetLoyaltyStats()
    {
        var totalPoints = await _context.Customers.SumAsync(c => c.Points);
        var avgPoints = await _context.Customers.AverageAsync(c => (double?)c.Points) ?? 0;
        
        var recentTransactions = await _context.LoyaltyTransactions
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .Select(t => new { t.TransactionReference, t.InvoiceAmount, t.PointsEarned, t.CreatedAt })
            .ToListAsync();

        return Ok(new
        {
            TotalPointsInSystem = totalPoints,
            AveragePointsPerCustomer = Math.Round(avgPoints, 2),
            RecentTransactions = recentTransactions
        });
    }

    // GET: api/reports/reservation-stats
    [HttpGet("reservation-stats")]
    public async Task<IActionResult> GetReservationStats()
    {
        var totalReservations = await _context.Reservations.CountAsync();
        
        var statusData = await _context.Reservations
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var statusDistribution = statusData.Select(x => new { Status = x.Status.ToString(), Count = x.Count });

        return Ok(new
        {
            TotalReservations = totalReservations,
            StatusDistribution = statusDistribution
        });
    }

    // GET: api/reports/revenue-stats
    [HttpGet("revenue-stats")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "days", "startDate", "endDate" })]
    public async Task<IActionResult> GetRevenueStats([FromQuery] int days = 7, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        DateTime start;
        DateTime end;

        if (startDate.HasValue && endDate.HasValue)
        {
            start = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
            end = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc).AddDays(1);
        }
        else
        {
            start = DateTime.UtcNow.Date.AddDays(-days);
            end = DateTime.UtcNow.Date.AddDays(1);
        }
        
        var dailyRevenueData = await _context.Invoices
            .Where(i => i.IssuedAt >= start && i.IssuedAt < end && i.Status == InvoiceStatus.Paid)
            .GroupBy(i => i.IssuedAt.Date)
            .Select(g => new { Date = g.Key, Amount = g.Sum(i => i.FinalAmount) })
            .OrderBy(r => r.Date)
            .ToListAsync();

        var dailyRevenue = dailyRevenueData.Select(r => new { Date = r.Date.ToString("yyyy-MM-dd"), Amount = r.Amount });

        return Ok(dailyRevenue);
    }

    // GET: api/reports/top-selling
    [HttpGet("top-selling")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetTopSellingItems()
    {
        var topItems = await _context.OrderItems
            .GroupBy(oi => oi.MenuItem != null ? oi.MenuItem.Name : "Unknown")
            .Select(g => new { ItemName = g.Key, Quantity = g.Sum(oi => oi.Quantity) })
            .OrderByDescending(x => x.Quantity)
            .Take(5)
            .ToListAsync();

        return Ok(topItems);
    }

    // GET: api/reports/export-shifts
    [HttpGet("export-shifts")]
    public async Task<IActionResult> ExportShiftsCsv()
    {
        var shifts = await _context.Shifts
            .Include(s => s.User)
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Employee,Start,End,Note");

        foreach (var s in shifts)
        {
            csv.AppendLine($"{s.User?.FullName ?? "N/A"},{s.StartTime},{s.EndTime},{s.Note}");
        }

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "ShiftsReport.csv");
    }

    // GET: api/reports/export-revenue
    [HttpGet("export-revenue")]
    public async Task<IActionResult> ExportRevenueCsv([FromQuery] int days = 30)
    {
        var targetDate = DateTime.UtcNow.Date.AddDays(-days);
        
        var revenueData = await _context.Invoices
            .Where(i => i.IssuedAt >= targetDate && i.Status == InvoiceStatus.Paid)
            .OrderByDescending(i => i.IssuedAt)
            .Select(i => new { i.Id, i.IssuedAt, i.FinalAmount, i.PaymentMethod })
            .ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("SoHoaDon,NgayXuat,GiaTri(VND),PhuongThucThanhToan");

        foreach (var r in revenueData)
        {
            csv.AppendLine($"INV{r.Id:D6},{r.IssuedAt.ToString("yyyy-MM-dd HH:mm")},{r.FinalAmount},{r.PaymentMethod}");
        }

        // Add BOM for Excel UTF-8 compatibility
        var bytes = System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
        return File(bytes, "text/csv", $"RevenueReport_{days}Days.csv");
    }

    // --- NEW ADVANCED ANALYTICS ---

    [HttpGet("busy-hours")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBusyHours()
    {
        var orders = await _context.Orders
            .Where(o => o.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            .ToListAsync();

        var hourStats = orders
            .GroupBy(o => o.CreatedAt.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .OrderBy(x => x.Hour)
            .ToList();

        return Ok(hourStats);
    }

    [HttpGet("category-revenue")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetCategoryRevenue()
    {
        var categoryData = await _context.OrderItems
            .Include(oi => oi.MenuItem)
            .ThenInclude(mi => mi.Category)
            .GroupBy(oi => oi.MenuItem != null && oi.MenuItem.Category != null ? oi.MenuItem.Category.Name : "Other")
            .Select(g => new { Category = g.Key, Revenue = g.Sum(oi => oi.Quantity * oi.UnitPrice) })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync();

        return Ok(categoryData);
    }

    [HttpGet("top-spenders")]
    public async Task<IActionResult> GetTopSpenders()
    {
        var spenders = await _context.Invoices
            .Where(i => i.Status == InvoiceStatus.Paid && i.CustomerId != null && i.Customer != null)
            .Include(i => i.Customer)
            .GroupBy(i => new { i.CustomerId, FullName = i.Customer!.FullName })
            .Select(g => new { 
                CustomerId = g.Key.CustomerId, 
                Name = g.Key.FullName, 
                TotalSpent = g.Sum(i => i.FinalAmount),
                OrderCount = g.Count()
            })
            .OrderByDescending(x => x.TotalSpent)
            .Take(10)
            .ToListAsync();

        return Ok(spenders);
    }

    [HttpGet("marketing-stats")]
    public async Task<IActionResult> GetMarketingStats()
    {
        var totalVouchers = await _context.Vouchers.CountAsync();
        var usedVouchers = await _context.Vouchers.CountAsync(v => v.IsUsed);
        
        // Doanh thu từ các hóa đơn có dùng Voucher
        // Giả sử có bảng Invoice có liên kết với Voucher hoặc dùng mã Voucher ghi lại
        // Ở đây ta tính tổng tiền các Invoice có CustomerId và có dùng điểm/voucher
        var marketingRevenue = await _context.Invoices
            .Where(i => i.Status == InvoiceStatus.Paid && i.DiscountAmount > 0)
            .SumAsync(i => i.FinalAmount);

        return Ok(new
        {
            TotalVouchers = totalVouchers,
            UsedVouchers = usedVouchers,
            RedemptionRate = totalVouchers > 0 ? (double)usedVouchers / totalVouchers * 100 : 0,
            MarketingRevenue = marketingRevenue
        });
    }
}

