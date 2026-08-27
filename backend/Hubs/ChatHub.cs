using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public class ChatHub : Hub
{
    private static readonly ConcurrentDictionary<string, ChatUser> Users = new();

    public Task JoinChat(string? name, string? role)
    {
        name = name?.Trim();
        role = role?.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new HubException("Du måste ange ett namn.");
        }

        if (role != "Student" && role != "Teacher")
        {
            throw new HubException("Rollen måste vara Student eller Teacher.");
        }

        Users[Context.ConnectionId] = new ChatUser(name, role);

        return Task.CompletedTask;
    }

    public async Task SendMessage(string? message)
    {
        if (!Users.TryGetValue(Context.ConnectionId, out ChatUser? user))
        {
            throw new HubException("Du måste ansluta innan du skickar meddelanden.");
        }

        message = message?.Trim();

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new HubException("Meddelandet får inte vara tomt.");
        }

        await Clients.All.SendAsync(
            "ReceiveMessage",
            user.Name,
            message
        );
    }

    public async Task SendAnnouncement(string? message)
    {
        if (!Users.TryGetValue(Context.ConnectionId, out ChatUser? user))
        {
            throw new HubException("Du måste ansluta innan du skickar lärarmeddelanden.");
        }

        if (user.Role != "Teacher")
        {
            throw new HubException("Endast lärare får skicka lärarmeddelanden.");
        }

        message = message?.Trim();

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new HubException("Lärarmeddelandet får inte vara tomt.");
        }

        await Clients.All.SendAsync(
            "ReceiveAnnouncement",
            user.Name,
            message
        );
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Users.TryRemove(Context.ConnectionId, out _);

        await base.OnDisconnectedAsync(exception);
    }

    private record ChatUser(string Name, string Role);
}