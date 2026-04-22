using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace ConnectDB.Hubs;

public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, role);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Server push to all connected clients
    public async Task SendNotification(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveNotification", user, message);
    }

    public async Task SendToRole(string role, string user, string message)
    {
        await Clients.Group(role).SendAsync("ReceiveNotification", user, message);
    }
}
