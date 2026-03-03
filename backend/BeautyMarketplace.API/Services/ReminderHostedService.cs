using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using BeautyMarketplace.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BeautyMarketplace.API.Services;

/// Фоновый сервис: каждые 5 минут проверяет предстоящие записи
/// и отправляет напоминания клиентам за 24ч и за 2ч до визита.
public class ReminderHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReminderHostedService> _logger;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);

    public ReminderHostedService(IServiceScopeFactory scopeFactory, ILogger<ReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReminderHostedService started.");

        // Небольшая задержка при старте, чтобы БД успела применить миграции
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing reminders");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task ProcessRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var bookings  = scope.ServiceProvider.GetRequiredService<IBookingRepository>();
        var notifs    = scope.ServiceProvider.GetRequiredService<INotificationRepository>();

        var now = DateTime.UtcNow;

        // Ищем записи в окне [сейчас, +25ч] — покрывает оба порога с запасом
        var upcoming = await bookings.GetUpcomingForRemindersAsync(now, now.AddHours(25));

        foreach (var booking in upcoming)
        {
            if (!booking.SlotDateTime.HasValue) continue;
            var slot = booking.SlotDateTime.Value;
            var hoursLeft = (slot - now).TotalHours;

            // ── Напоминание за 24 часа (окно: 23–25ч до визита) ──────────────
            if (!booking.Reminder24hSent && hoursLeft is >= 23 and <= 25)
            {
                await notifs.AddAsync(new Notification
                {
                    UserId  = booking.ClientId,
                    Type    = NotificationType.Reminder24h,
                    Message = $"Напоминание: завтра в {slot.ToLocalTime():HH:mm} — «{booking.Service.Name}» у мастера {booking.Service.Master.User.Name}",
                    RefId   = booking.Id,
                });

                booking.Reminder24hSent = true;
                await bookings.UpdateAsync(booking);
                _logger.LogInformation("24h reminder sent for booking {Id}", booking.Id);
            }

            // ── Напоминание за 2 часа (окно: 1.5–2.5ч до визита) ────────────
            if (!booking.Reminder2hSent && hoursLeft is >= 1.5 and <= 2.5)
            {
                await notifs.AddAsync(new Notification
                {
                    UserId  = booking.ClientId,
                    Type    = NotificationType.Reminder2h,
                    Message = $"Через 2 часа визит: «{booking.Service.Name}» у {booking.Service.Master.User.Name} в {slot.ToLocalTime():HH:mm}",
                    RefId   = booking.Id,
                });

                booking.Reminder2hSent = true;
                await bookings.UpdateAsync(booking);
                _logger.LogInformation("2h reminder sent for booking {Id}", booking.Id);
            }
        }
    }
}
