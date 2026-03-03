namespace BeautyMarketplace.Core.Entities;

public enum NotificationType
{
    NewBooking,         // мастеру: новая заявка от клиента
    BookingConfirmed,   // клиенту: мастер подтвердил запись
    BookingCancelled,   // клиенту: запись отменена
    BookingCompleted,   // клиенту: мастер отметил услугу как оказанную
    BookingNoShow,      // клиенту: мастер отметил неявку
    NewReview,          // мастеру: клиент оставил отзыв
    Reminder24h,        // клиенту: напоминание за 24 часа
    Reminder2h,         // клиенту: напоминание за 2 часа
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }           // кому уведомление
    public NotificationType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public Guid? RefId { get; set; }           // ссылка на запись или отзыв
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
