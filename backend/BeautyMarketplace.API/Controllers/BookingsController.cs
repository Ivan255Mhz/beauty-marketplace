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
public class BookingsController : ControllerBase
{
    private readonly IBookingRepository _bookings;
    private readonly IServiceRepository _services;
    private readonly IMasterRepository _masters;
    private readonly IReviewRepository _reviews;
    private readonly INotificationRepository _notifications;

    public BookingsController(IBookingRepository bookings, IServiceRepository services,
        IMasterRepository masters, IReviewRepository reviews, INotificationRepository notifications)
    {
        _bookings = bookings;
        _services = services;
        _masters = masters;
        _reviews = reviews;
        _notifications = notifications;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    [Authorize(Roles = "Client")]
    public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingRequest req)
    {
        var service = await _services.GetByIdAsync(req.ServiceId);
        if (service == null || !service.IsActive)
            return NotFound(new { message = "Услуга не найдена" });

        DateTime? slotDt = null;
        string displayDate;

        if (!string.IsNullOrWhiteSpace(req.SlotDateTime))
        {
            if (!DateTime.TryParse(req.SlotDateTime, null,
                System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
                return BadRequest(new { message = "Неверный формат времени слота" });

            slotDt = parsed.ToUniversalTime();
            displayDate = slotDt.Value.ToString("dd.MM.yyyy HH:mm");
        }
        else if (!string.IsNullOrWhiteSpace(req.BookingDate))
        {
            displayDate = req.BookingDate.Trim();
        }
        else
        {
            return BadRequest(new { message = "Укажите дату записи" });
        }

        var booking = new Booking
        {
            ClientId = CurrentUserId,
            ServiceId = req.ServiceId,
            SlotDateTime = slotDt,
            BookingDate = displayDate,
            Comment = req.Comment?.Trim()
        };

        await _bookings.AddAsync(booking);
        var created = await _bookings.GetByIdAsync(booking.Id);

        // Уведомляем мастера о новой заявке
        await _notifications.AddAsync(new Notification
        {
            UserId = created!.Service.Master.UserId,
            Type = NotificationType.NewBooking,
            Message = $"{created.Client.Name} записался на «{created.Service.Name}» — {created.DisplayDate}",
            RefId = booking.Id,
        });

        return Ok(await MapToDtoAsync(created!));
    }

    [HttpGet("my")]
    [Authorize(Roles = "Client")]
    public async Task<ActionResult<List<BookingDto>>> GetMine()
    {
        var list = await _bookings.GetByClientIdAsync(CurrentUserId);
        var result = new List<BookingDto>();
        foreach (var b in list) result.Add(await MapToDtoAsync(b));
        return Ok(result);
    }

    [HttpGet("incoming")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<List<BookingDto>>> GetIncoming()
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return Ok(new List<BookingDto>());

        var list = await _bookings.GetByMasterIdAsync(master.Id);
        var result = new List<BookingDto>();
        foreach (var b in list) result.Add(await MapToDtoAsync(b));
        return Ok(result);
    }

    // POST /api/bookings/{id}/cancel — отмена со стороны клиента
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Client")]
    public async Task<ActionResult<BookingDto>> CancelByClient(Guid id)
    {
        var booking = await _bookings.GetByIdAsync(id);
        if (booking == null) return NotFound();

        if (booking.ClientId != CurrentUserId) return Forbid();

        if (booking.Status == BookingStatus.Cancelled)
            return BadRequest(new { message = "Запись уже отменена" });

        booking.Status = BookingStatus.Cancelled;
        await _bookings.UpdateAsync(booking);

        // Уведомляем мастера об отмене
        await _notifications.AddAsync(new Notification
        {
            UserId = booking.Service.Master.UserId,
            Type = NotificationType.BookingCancelled,
            Message = $"{booking.Client.Name} отменил запись на «{booking.Service.Name}» — {booking.DisplayDate}",
            RefId = booking.Id,
        });

        return Ok(await MapToDtoAsync(booking));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<BookingDto>> UpdateStatus(Guid id, [FromBody] UpdateBookingStatusRequest req)
    {
        var booking = await _bookings.GetByIdAsync(id);
        if (booking == null) return NotFound();

        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null || booking.Service.MasterId != master.Id) return Forbid();

        // Правила переходов статусов
        var allowed = booking.Status switch
        {
            BookingStatus.Pending    => new[] { BookingStatus.Confirmed, BookingStatus.Cancelled },
            BookingStatus.Confirmed  => new[] { BookingStatus.Completed, BookingStatus.NoShow, BookingStatus.Cancelled },
            _                        => Array.Empty<BookingStatus>()
        };

        if (!allowed.Contains(req.Status))
            return BadRequest(new { message = $"Нельзя перевести запись из статуса «{booking.Status}» в «{req.Status}»" });

        booking.Status = req.Status;
        await _bookings.UpdateAsync(booking);

        // Уведомляем клиента
        var (notifType, notifMsg) = req.Status switch
        {
            BookingStatus.Confirmed  => (NotificationType.BookingConfirmed,
                $"Запись на «{booking.Service.Name}» подтверждена — {booking.DisplayDate}"),
            BookingStatus.Completed  => (NotificationType.BookingCompleted,
                $"Услуга «{booking.Service.Name}» оказана. Вы можете оставить отзыв!"),
            BookingStatus.NoShow     => (NotificationType.BookingNoShow,
                $"Мастер отметил неявку по записи «{booking.Service.Name}» — {booking.DisplayDate}"),
            _                        => (NotificationType.BookingCancelled,
                $"Запись на «{booking.Service.Name}» отменена мастером"),
        };

        await _notifications.AddAsync(new Notification
        {
            UserId = booking.ClientId,
            Type = notifType,
            Message = notifMsg,
            RefId = booking.Id,
        });

        return Ok(await MapToDtoAsync(booking));
    }

    // GET /api/bookings/{id} — детали записи (клиент видит свою, мастер — входящую)
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookingDto>> GetById(Guid id)
    {
        var booking = await _bookings.GetByIdAsync(id);
        if (booking == null) return NotFound();

        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        var isMaster = master != null && booking.Service.MasterId == master.Id;
        var isClient = booking.ClientId == CurrentUserId;

        if (!isClient && !isMaster) return Forbid();

        return Ok(await MapToDtoAsync(booking));
    }

    private async Task<BookingDto> MapToDtoAsync(Booking b)
    {
        var hasReview = b.Status == BookingStatus.Completed &&
            await _reviews.ExistsAsync(b.ClientId, b.Service.MasterId, b.Id);

        return new BookingDto(
            Id: b.Id,
            ClientId: b.ClientId,
            ClientName: b.Client.Name,
            ServiceId: b.ServiceId,
            ServiceName: b.Service.Name,
            ServiceDescription: b.Service.Description,
            ServiceDurationMinutes: b.Service.DurationMinutes,
            ServiceCategory: b.Service.Category,
            MasterProfileId: b.Service.MasterId,
            MasterUserId: b.Service.Master.UserId,
            MasterName: b.Service.Master.User.Name,
            MasterPhone: b.Service.Master.User.Phone,
            MasterAddress: b.Service.Master.Address,
            MasterAvatarUrl: b.Service.Master.AvatarUrl ?? b.Service.Master.User.AvatarUrl,
            ServicePrice: b.Service.Price,
            BookingDate: b.DisplayDate,
            SlotDateTime: b.SlotDateTime,
            Status: b.Status,
            Comment: b.Comment,
            CreatedAt: b.CreatedAt,
            HasReview: hasReview
        );
    }
}
