using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace ConnectDB.Hubs;

public class NotificationHub : Hub
{
    // Server push to all connected clients
    public async Task SendNotification(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveNotification", user, message);
    }
}
