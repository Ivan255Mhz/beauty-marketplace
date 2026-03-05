using BeautyMarketplace.Core.Entities;

namespace BeautyMarketplace.Core.DTOs;

// ─── Auth ───────────────────────────────────────────
public record RegisterRequest(
    string Email,
    string Password,
    string Name,
    UserRole Role,
    string? Phone = null
);

public record LoginRequest(string Email, string Password);
public record ResendConfirmationRequest(string Email);

public record AuthResponse(
    string Token,
    Guid UserId,
    string Name,
    string Email,
    UserRole Role
);

// ─── User ────────────────────────────────────────────
public record UpdateProfileRequest(
    string? Name,
    string? Phone
);

public record UserDto(
    Guid Id,
    string Email,
    string Name,
    string? Phone,
    string? AvatarUrl,
    UserRole Role
);

// ─── Master ──────────────────────────────────────────
public record UpsertMasterProfileRequest(
    string? Bio,
    string? Address,
    double? Latitude,
    double? Longitude
);

public record MasterProfileDto(
    Guid Id,
    Guid UserId,
    string MasterName,
    string? AvatarUrl,
    string? Bio,
    string? Address,
    double? Latitude,
    double? Longitude,
    decimal? PriceFrom,
    double AverageRating,
    int ReviewCount,
    List<ServiceDto> Services,
    List<PortfolioPhotoDto> Portfolio,
    List<ReviewDto> Reviews
);

public record MasterListItemDto(
    Guid ProfileId,
    Guid UserId,
    string Name,
    string? AvatarUrl,
    string? Address,
    string? Bio,
    decimal? PriceFrom,
    double AverageRating,
    int ReviewCount,
    List<string> Categories
);

// ─── Service ─────────────────────────────────────────
public record CreateServiceRequest(
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes,
    ServiceCategory Category
);

public record UpdateServiceRequest(
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes,
    ServiceCategory Category
);

public record ServiceDto(
    Guid Id,
    Guid MasterId,
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes,
    ServiceCategory Category
);

// ─── Booking ─────────────────────────────────────────
public record CreateBookingRequest(
    Guid ServiceId,
    string? SlotDateTime,   // ISO string "2026-03-01T14:30:00Z" — from slot picker
    string? BookingDate,    // legacy free-text fallback
    string? Comment
);

public record BookingDto(
    Guid Id,
    Guid ClientId,
    string ClientName,
    Guid ServiceId,
    string ServiceName,
    string? ServiceDescription,
    int ServiceDurationMinutes,
    ServiceCategory ServiceCategory,
    Guid MasterProfileId,
    Guid MasterUserId,
    string MasterName,
    string? MasterPhone,
    string? MasterAddress,
    string? MasterAvatarUrl,
    decimal ServicePrice,
    string BookingDate,     // human-readable display string
    DateTime? SlotDateTime, // structured slot (nullable for legacy)
    BookingStatus Status,
    string? Comment,
    DateTime CreatedAt,
    bool HasReview
);

public record UpdateBookingStatusRequest(BookingStatus Status);

// ─── Review ──────────────────────────────────────────
public record CreateReviewRequest(
    Guid MasterId,
    int Rating,
    string? Comment,
    Guid? BookingId = null
);

public record ReviewDto(
    Guid Id,
    Guid ClientId,
    string ClientName,
    string? ClientAvatarUrl,
    int Rating,
    string? Comment,
    DateTime CreatedAt,
    List<string>? PhotoUrls = null
);

// ─── Portfolio ───────────────────────────────────────
public record PortfolioPhotoDto(
    Guid Id,
    string Url,
    string? Caption
);

// ─── Common ──────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int Total);

// ─── Schedule ─────────────────────────────────────────
public record WorkScheduleItemDto(
    int DayOfWeek,      // 0=Sun, 1=Mon, ... 6=Sat (int to avoid enum serialization issues)
    string StartTime,   // "HH:mm"
    string EndTime,     // "HH:mm"
    bool IsWorking
);

public record SaveScheduleRequest(List<WorkScheduleItemDto> Days);

public record TimeSlotDto(
    string DateTime,   // ISO string
    string Label,      // "14:30"
    bool Available
);

public record GetSlotsRequest(string Date, int DurationMinutes);

// ─── Notifications ────────────────────────────────────
public record NotificationDto(
    Guid Id,
    string Type,
    string Message,
    bool IsRead,
    Guid? RefId,
    DateTime CreatedAt
);

public record NotificationsResponse(
    List<NotificationDto> Items,
    int UnreadCount
);

// ─── Chat ─────────────────────────────────────────────
public record SendMessageRequest(Guid ReceiverId, string Text);

public record MessageDto(
    Guid Id,
    Guid SenderId,
    Guid ReceiverId,
    string Text,
    bool IsRead,
    DateTime CreatedAt
);

public record ConversationDto(
    Guid PartnerId,
    string PartnerName,
    string? PartnerAvatarUrl,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount,
    bool LastMessageIsOwn
);
