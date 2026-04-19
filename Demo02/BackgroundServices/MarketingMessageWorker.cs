using System;
using System.Threading;
using System.Threading.Tasks;
using ConnectDB.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ConnectDB.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ConnectDB.BackgroundServices;

public class MarketingMessageWorker : BackgroundService
{
    private readonly ILogger<MarketingMessageWorker> _logger;
    private readonly IMessageQueue _messageQueue;
    private readonly IServiceScopeFactory _scopeFactory;

    public MarketingMessageWorker(
        ILogger<MarketingMessageWorker> logger, 
        IMessageQueue messageQueue, 
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _messageQueue = messageQueue;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Marketing Message Worker is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var message = await _messageQueue.PullMessageAsync(stoppingToken);

                // Giả lập thời gian gửi SMS/Email mất khoảng 1.5s
                await Task.Delay(1500, stoppingToken);

                _logger.LogInformation($"[Marketing] Processing message for {message.CustomerPhone}");

                if (!string.IsNullOrEmpty(message.CustomerEmail))
                {
                    try 
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                        await emailService.SendEmailAsync(
                            message.CustomerEmail, 
                            "Quà tặng đặc biệt từ PROMAX RMS", 
                            $"<div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>" +
                            $"<h2 style='color: #8b5cf6;'>Chào bạn!</h2>" +
                            $"<p style='font-size: 16px; line-height: 1.6;'>{message.DefaultContent}</p>" +
                            $"<hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />" +
                            $"<p style='font-size: 12px; color: #71717a;'>Đây là email tự động từ hệ thống quản trị nhà hàng VIP Promax.</p>" +
                            $"</div>"
                        );
                        _logger.LogInformation($"[EMAIL SENT] To: {message.CustomerEmail}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"[EMAIL ERROR] Failed to send to {message.CustomerEmail}: {ex.Message}");
                    }
                }

                _logger.LogInformation($"[SMS-MOCK] to {message.CustomerPhone}: '{message.DefaultContent}'");
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred processing marketing message.");
            }
        }

        _logger.LogInformation("Marketing Message Worker is stopping.");
    }
}
