using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BeautyMarketplace.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMessageRepository _messages;
    private readonly IUserRepository    _users;
    private readonly PresenceTracker    _presence;

    public ChatHub(IMessageRepository messages, IUserRepository users, PresenceTracker presence)
    {
        _messages = messages;
        _users    = users;
        _presence = presence;
    }

    private Guid CurrentUserId =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public override async Task OnConnectedAsync()
    {
        var userId = CurrentUserId;
        _presence.UserConnected(userId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, userId.ToString());
        await Clients.Others.SendAsync("UserOnline", userId);
        var onlineIds = _presence.GetOnlineUsers();
        await Clients.Caller.SendAsync("OnlineUsers", onlineIds);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = CurrentUserId;
        var wentOffline = _presence.UserDisconnected(userId, Context.ConnectionId);
        if (wentOffline)
            await Clients.Others.SendAsync("UserOffline", userId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(Guid receiverId, string text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length > 2000) return;
        var senderId = CurrentUserId;
        if (senderId == receiverId) return;
        var receiver = await _users.GetByIdAsync(receiverId);
        if (receiver == null) return;

        var message = new Message
        {
            SenderId   = senderId,
            ReceiverId = receiverId,
            Text       = text.Trim(),
        };
        await _messages.AddAsync(message);

        var dto = new MessageDto(
            message.Id, message.SenderId, message.ReceiverId,
            message.Text, message.IsRead, message.CreatedAt
        );

        await Clients.Group(receiverId.ToString()).SendAsync("ReceiveMessage", dto);
        await Clients.Caller.SendAsync("ReceiveMessage", dto);
    }

    public async Task StartTyping(Guid receiverId)
    {
        await Clients.Group(receiverId.ToString())
            .SendAsync("UserTyping", CurrentUserId);
    }

    public async Task StopTyping(Guid receiverId)
    {
        await Clients.Group(receiverId.ToString())
            .SendAsync("UserStoppedTyping", CurrentUserId);
    }

    public async Task MarkRead(Guid senderId)
    {
        await _messages.MarkReadAsync(senderId, CurrentUserId);
        await Clients.Group(senderId.ToString())
            .SendAsync("MessagesRead", CurrentUserId);
    }
}
