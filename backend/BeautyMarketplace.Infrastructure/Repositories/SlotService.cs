using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using BeautyMarketplace.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BeautyMarketplace.Infrastructure.Repositories;

public class SlotService : ISlotService
{
    private readonly AppDbContext _db;
    public SlotService(AppDbContext db) => _db = db;

    public async Task<List<(DateTime Slot, bool Available)>> GetSlotsAsync(
        Guid masterId, DateOnly date, int durationMinutes)
    {
        var dow = (DayOfWeek)((int)date.DayOfWeek);

        // Get schedule for this day
        var schedule = await _db.WorkSchedules
            .FirstOrDefaultAsync(w => w.MasterId == masterId && w.DayOfWeek == dow);

        if (schedule == null || !schedule.IsWorking)
            return new List<(DateTime, bool)>();

        // Get all confirmed/pending bookings for this master on this date
        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd   = dayStart.AddDays(1);

        // Get all active bookings for this master on this date
        // We need BOTH the slot start time AND the actual service duration
        // to correctly calculate when each existing booking ends.
        var bookedSlots = await _db.Bookings
            .Where(b =>
                b.Service.MasterId == masterId &&
                b.SlotDateTime.HasValue &&
                b.SlotDateTime >= dayStart &&
                b.SlotDateTime < dayEnd &&
                (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .Select(b => new
            {
                Start    = b.SlotDateTime!.Value,
                Duration = b.Service.DurationMinutes   // real duration of the BOOKED service
            })
            .ToListAsync();

        // Generate all slots
        var result = new List<(DateTime, bool)>();
        var current = date.ToDateTime(TimeOnly.MinValue).Add(schedule.StartTime).ToUniversalTime();
        var workEnd = date.ToDateTime(TimeOnly.MinValue).Add(schedule.EndTime).ToUniversalTime();
        var now     = DateTime.UtcNow;

        while (current.AddMinutes(durationMinutes) <= workEnd)
        {
            if (current > now)
            {
                // Overlap: new slot [current, current+newDuration) intersects existing [b.Start, b.Start+b.Duration)
                bool taken = bookedSlots.Any(b =>
                    current                             < b.Start.AddMinutes(b.Duration) &&
                    current.AddMinutes(durationMinutes) > b.Start);

                result.Add((current, !taken));
            }
            current = current.AddMinutes(durationMinutes);
        }

        return result;
    }
}
