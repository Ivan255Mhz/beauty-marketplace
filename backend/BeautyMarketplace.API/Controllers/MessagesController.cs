using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageRepository _messages;
    private readonly IUserRepository _users;

    public MessagesController(IMessageRepository messages, IUserRepository users)
    {
        _messages = messages;
        _users = users;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/messages/conversations
    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationDto>>> GetConversations()
    {
        var convs = await _messages.GetConversationsAsync(CurrentUserId);
        var result = new List<ConversationDto>();

        foreach (var (partnerId, lastMsg, unread) in convs)
        {
            var partner = await _users.GetByIdAsync(partnerId);
            if (partner == null) continue;

            result.Add(new ConversationDto(
                PartnerId: partnerId,
                PartnerName: partner.Name,
                PartnerAvatarUrl: partner.AvatarUrl,
                LastMessage: lastMsg.Text.Length > 60
                    ? lastMsg.Text[..57] + "..."
                    : lastMsg.Text,
                LastMessageAt: lastMsg.CreatedAt,
                UnreadCount: unread,
                LastMessageIsOwn: lastMsg.SenderId == CurrentUserId
            ));
        }

        return Ok(result);
    }

    // GET /api/messages/unread-count
    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount()
    {
        var count = await _messages.GetTotalUnreadAsync(CurrentUserId);
        return Ok(new { count });
    }

    // GET /api/messages/{partnerId}
    [HttpGet("{partnerId:guid}")]
    public async Task<ActionResult<List<MessageDto>>> GetConversation(Guid partnerId)
    {
        await _messages.MarkReadAsync(partnerId, CurrentUserId);
        var messages = await _messages.GetConversationAsync(CurrentUserId, partnerId);
        return Ok(messages.Select(m => new MessageDto(
            m.Id, m.SenderId, m.ReceiverId, m.Text, m.IsRead, m.CreatedAt
        )));
    }

    // POST /api/messages
    [HttpPost]
    public async Task<ActionResult<MessageDto>> Send([FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { message = "Сообщение не может быть пустым" });

        if (req.Text.Length > 2000)
            return BadRequest(new { message = "Сообщение слишком длинное" });

        var receiver = await _users.GetByIdAsync(req.ReceiverId);
        if (receiver == null)
            return NotFound(new { message = "Получатель не найден" });

        if (req.ReceiverId == CurrentUserId)
            return BadRequest(new { message = "Нельзя написать самому себе" });

        var message = new Message
        {
            SenderId = CurrentUserId,
            ReceiverId = req.ReceiverId,
            Text = req.Text.Trim(),
        };

        await _messages.AddAsync(message);

        return Ok(new MessageDto(
            message.Id, message.SenderId, message.ReceiverId,
            message.Text, message.IsRead, message.CreatedAt
        ));
    }
}
