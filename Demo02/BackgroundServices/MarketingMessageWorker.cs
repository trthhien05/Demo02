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
                            "💎 Quà tặng đặc biệt từ PROMAX RMS", 
                            $@"
                            <div style='background-color: #0c0e12; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #ffffff;'>
                                <table align='center' border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px; background-color: #1a1d23; border: 1px solid #2a2e35; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);'>
                                    <!-- Header / Hero Section -->
                                    <tr>
                                        <td align='center' style='padding: 40px 40px 20px 40px;'>
                                            <div style='background-color: rgba(139, 92, 246, 0.1); width: 80px; height: 80px; border-radius: 20px; line-height: 80px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.3);'>
                                                <span style='font-size: 40px;'>✨</span>
                                            </div>
                                            <h1 style='margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;'>VIP PROMAX RMS</h1>
                                            <p style='color: #8b5cf6; font-weight: 700; margin-top: 8px; letter-spacing: 0.2em; font-size: 10px; text-transform: uppercase;'>Premium Hospitality Service</p>
                                        </td>
                                    </tr>

                                    <!-- Content Section -->
                                    <tr>
                                        <td style='padding: 0 40px 40px 40px;'>
                                            <div style='background-color: rgba(255,255,255,0.03); border-radius: 20px; padding: 32px; border: 1px solid rgba(255,255,255,0.05);'>
                                                <h2 style='color: #ffffff; font-size: 20px; margin-top: 0; font-weight: 700;'>Chào bạn thân mến,</h2>
                                                <p style='font-size: 16px; line-height: 1.8; color: #a1a1aa; margin: 20px 0;'>
                                                    {message.DefaultContent}
                                                </p>
                                                <div style='margin-top: 32px;'>
                                                    <a href='#' style='background-color: #8b5cf6; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 900; font-size: 12px; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);'>KHÁM PHÁ NGAY</a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td align='center' style='padding: 0 40px 40px 40px;'>
                                            <hr style='border: none; border-top: 1px solid rgba(255,255,255,0.05); margin-bottom: 30px;' />
                                            <p style='margin: 0; font-size: 11px; color: #52525b; line-height: 1.8; letter-spacing: 0.05em;'>
                                                © {DateTime.Now.Year} VIP PROMAX RESTAURANT MANAGEMENT SYSTEM.<br/>
                                                Hệ thống thông báo tự động. Vui lòng không trả lời email này.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            "
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
