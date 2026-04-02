using System;
using System.Threading;
using System.Threading.Tasks;
using ConnectDB.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ConnectDB.BackgroundServices;

public class MarketingMessageWorker : BackgroundService
{
    private readonly ILogger<MarketingMessageWorker> _logger;
    private readonly IMessageQueue _messageQueue;

    public MarketingMessageWorker(ILogger<MarketingMessageWorker> logger, IMessageQueue messageQueue)
    {
        _logger = logger;
        _messageQueue = messageQueue;
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

                _logger.LogInformation($"[Mock-Sent] SMS to {message.CustomerPhone}: '{message.DefaultContent}'");
            }
            catch (OperationCanceledException)
            {
                // Task bị hủy khi tắt ứng dụng, không cần báo lỗi
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
