using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly IScheduleRepository _schedules;
    private readonly ISlotService _slots;
    private readonly IMasterRepository _masters;

    public ScheduleController(
        IScheduleRepository schedules,
        ISlotService slots,
        IMasterRepository masters)
    {
        _schedules = schedules;
        _slots = slots;
        _masters = masters;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/schedule/master/{masterId}
    // Returns schedule (working days/hours) for public view
    [HttpGet("master/{masterId:guid}")]
    public async Task<ActionResult<List<WorkScheduleItemDto>>> GetByMaster(Guid masterId)
    {
        var schedule = await _schedules.GetByMasterIdAsync(masterId);
        return Ok(schedule.Select(ToDto));
    }

    // GET /api/schedule/me
    [HttpGet("me")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<List<WorkScheduleItemDto>>> GetMine()
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound();

        var schedule = await _schedules.GetByMasterIdAsync(master.Id);

        // Return all 7 days, filling missing ones with defaults
        var allDays = Enum.GetValues<DayOfWeek>().Select(dow =>
        {
            var found = schedule.FirstOrDefault(s => s.DayOfWeek == dow);
            return found != null ? ToDto(found) : new WorkScheduleItemDto(
                DayOfWeek: (int)dow, StartTime: "09:00", EndTime: "20:00", IsWorking: false);
        }).ToList();

        return Ok(allDays);
    }

    // POST /api/schedule
    [HttpPost]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult> SaveSchedule([FromBody] SaveScheduleRequest req)
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound();

        var entities = req.Days.Select(d => new WorkSchedule
        {
            MasterId = master.Id,
            DayOfWeek = (DayOfWeek)d.DayOfWeek,
            StartTime = TimeSpan.Parse(d.StartTime),
            EndTime = TimeSpan.Parse(d.EndTime),
            IsWorking = d.IsWorking,
        }).ToList();

        await _schedules.UpsertAsync(master.Id, entities);
        return Ok(new { message = "Расписание сохранено" });
    }

    // GET /api/schedule/slots/{masterId}?date=2026-03-01&durationMinutes=60
    [HttpGet("slots/{masterId:guid}")]
    public async Task<ActionResult<List<TimeSlotDto>>> GetSlots(
        Guid masterId,
        [FromQuery] string date,
        [FromQuery] int durationMinutes = 60)
    {
        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(new { message = "Неверный формат даты. Используйте YYYY-MM-DD" });

        if (parsedDate < DateOnly.FromDateTime(DateTime.UtcNow.Date))
            return BadRequest(new { message = "Нельзя выбрать прошедшую дату" });

        if (parsedDate > DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30).Date))
            return BadRequest(new { message = "Максимум 30 дней вперёд" });

        var slots = await _slots.GetSlotsAsync(masterId, parsedDate, durationMinutes);

        var result = slots.Select(s => new TimeSlotDto(
            DateTime: s.Slot.ToString("o"),
            Label: s.Slot.ToString("HH:mm"),
            Available: s.Available
        )).ToList();

        return Ok(result);
    }

    private static WorkScheduleItemDto ToDto(WorkSchedule w) => new(
        DayOfWeek: (int)w.DayOfWeek,
        StartTime: w.StartTime.ToString(@"hh\:mm"),
        EndTime: w.EndTime.ToString(@"hh\:mm"),
        IsWorking: w.IsWorking
    );
}
