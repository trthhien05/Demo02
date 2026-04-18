using System;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace ConnectDB.Messaging;

public class InMemoryMessageQueue : IMessageQueue
{
    private readonly Channel<CampaignMessage> _queue;

    public InMemoryMessageQueue()
    {
        // Khởi tạo channel không giới hạn để chứa Message//
        var options = new UnboundedChannelOptions
        {
            SingleWriter = false,
            SingleReader = true
        };
        _queue = Channel.CreateUnbounded<CampaignMessage>(options);
    }

    public async ValueTask PutMessageAsync(CampaignMessage message, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(message);
        await _queue.Writer.WriteAsync(message, cancellationToken);
    }

    public async ValueTask<CampaignMessage> PullMessageAsync(CancellationToken cancellationToken = default)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}
