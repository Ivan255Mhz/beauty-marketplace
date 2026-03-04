using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _notifications;

    public NotificationsController(INotificationRepository notifications)
        => _notifications = notifications;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/notifications
    [HttpGet]
    public async Task<ActionResult<NotificationsResponse>> GetMine()
    {
        var items = await _notifications.GetByUserIdAsync(CurrentUserId);
        var unread = items.Count(n => !n.IsRead);

        var dtos = items.Select(n => new NotificationDto(
            n.Id, n.Type.ToString(), n.Message, n.IsRead, n.RefId, n.CreatedAt
        )).ToList();

        return Ok(new NotificationsResponse(dtos, unread));
    }

    // POST /api/notifications/read-all
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notifications.MarkAllReadAsync(CurrentUserId);
        return Ok();
    }

    // POST /api/notifications/{id}/read
    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await _notifications.MarkReadAsync(id, CurrentUserId);
        return Ok();
    }
}
