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
    public async Task<IActionResult> GetRevenueStats([FromQuery] int days = 7)
    {
        var targetDate = DateTime.UtcNow.Date.AddDays(-days);
        
        var dailyRevenueData = await _context.Invoices
            .Where(i => i.IssuedAt >= targetDate && i.Status == InvoiceStatus.Paid)
            .GroupBy(i => i.IssuedAt.Date)
            .Select(g => new { Date = g.Key, Amount = g.Sum(i => i.FinalAmount) })
            .OrderBy(r => r.Date)
            .ToListAsync();

        var dailyRevenue = dailyRevenueData.Select(r => new { Date = r.Date.ToString("yyyy-MM-dd"), Amount = r.Amount });

        return Ok(dailyRevenue);
    }

    // GET: api/reports/top-selling
    [HttpGet("top-selling")]
    public async Task<IActionResult> GetTopSellingItems()
    {
        var topItems = await _context.OrderItems
            .GroupBy(oi => oi.MenuItem.Name)
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
            csv.AppendLine($"{s.User.FullName},{s.StartTime},{s.EndTime},{s.Note}");
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
}

