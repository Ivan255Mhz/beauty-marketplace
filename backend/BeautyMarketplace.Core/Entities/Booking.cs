namespace BeautyMarketplace.Core.Entities;

public enum BookingStatus
{
    Pending,    // ожидает подтверждения мастером
    Confirmed,  // мастер подтвердил
    Cancelled,  // отменена (клиентом или мастером)
    Completed,  // услуга оказана (мастер отметил)
    NoShow,     // клиент не пришёл (мастер отметил)
}

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Guid ServiceId { get; set; }

    /// Structured slot (new). Null = legacy free-text booking.
    public DateTime? SlotDateTime { get; set; }

    /// Legacy free-text field — kept for old records, shown as fallback.
    public string BookingDate { get; set; } = string.Empty;

    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Reminder flags — чтобы не отправлять повторно
    public bool Reminder24hSent { get; set; } = false;
    public bool Reminder2hSent  { get; set; } = false;

    public User Client { get; set; } = null!;
    public Service Service { get; set; } = null!;

    /// Human-readable date: prefers SlotDateTime, falls back to legacy text
    public string DisplayDate =>
        SlotDateTime.HasValue
            ? SlotDateTime.Value.ToString("dd.MM.yyyy HH:mm")
            : BookingDate;
}
