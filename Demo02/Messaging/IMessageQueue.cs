using System.Threading;
using System.Threading.Tasks;

namespace ConnectDB.Messaging;

public class CampaignMessage
{
    public string CustomerPhone { get; set; } = string.Empty;
    public string DefaultContent { get; set; } = string.Empty;
}

public interface IMessageQueue
{
    ValueTask PutMessageAsync(CampaignMessage message, CancellationToken cancellationToken = default);
    ValueTask<CampaignMessage> PullMessageAsync(CancellationToken cancellationToken = default);
}
