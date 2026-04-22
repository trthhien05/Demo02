using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ConnectDB.Data;
using ConnectDB.Models;
using ConnectDB.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ConnectDB.BackgroundServices;

public class ReservationReminderService : BackgroundService
{
    private readonly ILogger<ReservationReminderService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ReservationReminderService(ILogger<ReservationReminderService> logger, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Reservation Reminder Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing reservation reminder logic.");
            }

            // Chạy định kỳ mỗi 15 phút
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }

        _logger.LogInformation("Reservation Reminder Service is stopping.");
    }

    private async Task SendRemindersAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        var reminderWindow = now.AddHours(4); // Nhắc trước 4 tiếng

        var upcomingReservations = await context.Reservations
            .Include(r => r.Customer)
            .Include(r => r.DiningTable)
            .Where(r => !r.ReminderSent && 
                        r.Status == ReservationStatus.Confirmed && 
                        r.ReservationTime > now && 
                        r.ReservationTime <= reminderWindow)
            .ToListAsync(stoppingToken);

        if (!upcomingReservations.Any()) return;

        _logger.LogInformation("Found {count} reservations requiring reminders.", upcomingReservations.Count);

        foreach (var res in upcomingReservations)
        {
            if (res.Customer == null || string.IsNullOrEmpty(res.Customer.Email))
            {
                res.ReminderSent = true; // Mark as processed even if no email
                continue;
            }

            try
            {
                var subject = "Nhắc lịch đặt bàn - PROMAX RMS";
                var body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                        <div style='text-align: center; margin-bottom: 20px;'>
                            <h1 style='color: #8b5cf6; margin: 0;'>PROMAX RMS</h1>
                            <p style='color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;'>Reminder Notification</p>
                        </div>
                        <div style='padding: 20px; background-color: #f9fafb; border-radius: 8px;'>
                            <p>Xin chào <strong>{res.Customer.FullName}</strong>,</p>
                            <p>Đây là thông báo nhắc lịch đặt bàn của bạn tại nhà hàng chúng tôi:</p>
                            <ul style='list-style: none; padding: 0;'>
                                <li><strong>Thời gian:</strong> {res.ReservationTime.AddHours(7):dd/MM/yyyy HH:mm} (Giờ địa phương)</li>
                                <li><strong>Số khách:</strong> {res.PaxCount} người</li>
                                <li><strong>Số bàn:</strong> {res.DiningTable?.TableNumber ?? "Sẽ được sắp xếp"}</li>
                            </ul>
                            <p>Hẹn gặp lại bạn sớm!</p>
                        </div>
                    </div>";

                await emailService.SendEmailAsync(res.Customer.Email, subject, body);
                res.ReminderSent = true;
                _logger.LogInformation("Sent reminder to {email} for reservation #{id}", res.Customer.Email, res.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email reminder for reservation #{id}", res.Id);
            }
        }

        await context.SaveChangesAsync(stoppingToken);
    }
}
