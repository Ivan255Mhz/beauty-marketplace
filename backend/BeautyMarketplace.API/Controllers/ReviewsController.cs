using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewRepository _reviews;
    private readonly IMasterRepository _masters;
    private readonly IBookingRepository _bookings;
    private readonly INotificationRepository _notifications;

    public ReviewsController(IReviewRepository reviews, IMasterRepository masters,
        IBookingRepository bookings, INotificationRepository notifications)
    {
        _reviews = reviews;
        _masters = masters;
        _bookings = bookings;
        _notifications = notifications;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/reviews/master/{masterId}
    [HttpGet("master/{masterId:guid}")]
    public async Task<ActionResult<List<ReviewDto>>> GetByMaster(Guid masterId)
    {
        var list = await _reviews.GetByMasterIdAsync(masterId);
        return Ok(list.Select(r => new ReviewDto(
            r.Id, r.ClientId, r.Client.Name, r.Client.AvatarUrl,
            r.Rating, r.Comment, r.CreatedAt)));
    }

    // POST /api/reviews
    [HttpPost]
    [Authorize(Roles = "Client")]
    public async Task<ActionResult<ReviewDto>> Create([FromBody] CreateReviewRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { message = "Рейтинг должен быть от 1 до 5" });

        var master = await _masters.GetByIdAsync(req.MasterId);
        if (master == null) return NotFound(new { message = "Мастер не найден" });

        // BookingId обязателен — отзыв только после оказанной услуги
        if (!req.BookingId.HasValue)
            return BadRequest(new { message = "Необходимо указать запись, по которой оставляется отзыв" });

        var booking = await _bookings.GetByIdAsync(req.BookingId.Value);
        if (booking == null || booking.ClientId != CurrentUserId || booking.Status != BookingStatus.Completed)
            return BadRequest(new { message = "Отзыв можно оставить только после оказания услуги" });

        var alreadyExists = await _reviews.ExistsAsync(CurrentUserId, req.MasterId, req.BookingId);
        if (alreadyExists)
            return Conflict(new { message = "Вы уже оставили отзыв" });

        var review = new Review
        {
            MasterId = req.MasterId,
            ClientId = CurrentUserId,
            BookingId = req.BookingId,
            Rating = req.Rating,
            Comment = req.Comment?.Trim()
        };

        await _reviews.AddAsync(review);

        // Перезагружаем с клиентом
        var saved = (await _reviews.GetByMasterIdAsync(req.MasterId))
            .First(r => r.Id == review.Id);

        // Уведомляем мастера о новом отзыве
        await _notifications.AddAsync(new Notification
        {
            UserId = master.UserId,
            Type = NotificationType.NewReview,
            Message = $"{saved.Client.Name} оставил отзыв: {review.Rating}/5",
            RefId = review.Id,
        });

        return Ok(new ReviewDto(saved.Id, saved.ClientId, saved.Client.Name, saved.Client.AvatarUrl,
            saved.Rating, saved.Comment, saved.CreatedAt));
    }
}
