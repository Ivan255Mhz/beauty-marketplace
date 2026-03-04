using System.Security.Claims;
using BeautyMarketplace.API.Services;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewRepository       _reviews;
    private readonly IMasterRepository       _masters;
    private readonly IBookingRepository      _bookings;
    private readonly INotificationRepository _notifications;
    private readonly IFileService            _files;

    public ReviewsController(IReviewRepository reviews, IMasterRepository masters,
        IBookingRepository bookings, INotificationRepository notifications, IFileService files)
    {
        _reviews       = reviews;
        _masters       = masters;
        _bookings      = bookings;
        _notifications = notifications;
        _files         = files;
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
            r.Rating, r.Comment, r.CreatedAt, r.PhotoUrls)));
    }

    // POST /api/reviews  (multipart/form-data)
    [HttpPost]
    [Authorize(Roles = "Client")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ReviewDto>> Create([FromForm] CreateReviewFormRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { message = "Рейтинг должен быть от 1 до 5" });

        var master = await _masters.GetByIdAsync(req.MasterId);
        if (master == null) return NotFound(new { message = "Мастер не найден" });

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
            MasterId  = req.MasterId,
            ClientId  = CurrentUserId,
            BookingId = req.BookingId,
            Rating    = req.Rating,
            Comment   = req.Comment?.Trim(),
        };

        await _reviews.AddAsync(review);

        // Save up to 5 photos
        var photos = new List<string>();
        if (req.Photos != null)
        {
            foreach (var photo in req.Photos.Take(5))
            {
                var url = await _files.SaveReviewPhotoAsync(photo, review.Id);
                if (url != null) photos.Add(url);
            }
        }

        if (photos.Count > 0)
        {
            review.PhotoUrls = photos;
            await _reviews.UpdateAsync(review);
        }

        var saved = (await _reviews.GetByMasterIdAsync(req.MasterId))
            .First(r => r.Id == review.Id);

        await _notifications.AddAsync(new Notification
        {
            UserId  = master.UserId,
            Type    = NotificationType.NewReview,
            Message = $"{saved.Client.Name} оставил отзыв: {review.Rating}/5",
            RefId   = review.Id,
        });

        return Ok(new ReviewDto(saved.Id, saved.ClientId, saved.Client.Name, saved.Client.AvatarUrl,
            saved.Rating, saved.Comment, saved.CreatedAt, saved.PhotoUrls));
    }
}

// Defined here (not in Core) because IFormFile requires Microsoft.AspNetCore.Http
public class CreateReviewFormRequest
{
    public Guid   MasterId  { get; set; }
    public int    Rating    { get; set; }
    public string? Comment  { get; set; }
    public Guid?  BookingId { get; set; }
    public List<IFormFile>? Photos { get; set; }
}
