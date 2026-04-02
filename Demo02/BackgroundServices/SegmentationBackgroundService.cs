using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ConnectDB.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ConnectDB.BackgroundServices;

public class SegmentationBackgroundService : BackgroundService
{
    private readonly ILogger<SegmentationBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public SegmentationBackgroundService(ILogger<SegmentationBackgroundService> logger, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Segmentation Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Segmentation Task Triggered at: {time}", DateTimeOffset.Now);
            
            try
            {
                await RunSegmentationLogicAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing segmentation logic.");
            }

            // Đang để 1 phút để dễ quan sát log, thực tế nên là 24 giờ
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }

        _logger.LogInformation("Segmentation Background Service is stopping.");
    }

    private async Task RunSegmentationLogicAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var customers = await context.Customers.ToListAsync();
        var now = DateTime.UtcNow;

        int updatedCount = 0;

        foreach (var customer in customers)
        {
            var oldSegment = customer.Segment;
            var daysSinceLastVisit = customer.LastVisit.HasValue 
                ? (now - customer.LastVisit.Value).TotalDays 
                : (now - customer.CreatedAt).TotalDays;

            if (daysSinceLastVisit > 180)
            {
                customer.Segment = "AtRisk"; // Sắp rời bỏ
            }
            else if (customer.Points > 5000 && daysSinceLastVisit <= 30)
            {
                customer.Segment = "VIP_Active"; // Thường xuyên và chi nhiều
            }
            else if (daysSinceLastVisit <= 30)
            {
                customer.Segment = "Active"; // Gần đây có tới
            }
            else
            {
                customer.Segment = "Loyal_Inactive"; // Đang ít đến
            }

            if (oldSegment != customer.Segment)
            {
                context.Customers.Update(customer);
                updatedCount++;
            }
        }

        if (updatedCount > 0)
        {
            await context.SaveChangesAsync();
            _logger.LogInformation($"Successfully updated segmentation for {updatedCount} customers.");
        }
    }
}
