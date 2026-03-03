namespace BeautyMarketplace.Core.Entities;

public class WorkSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MasterId { get; set; }

    /// 0=Sun, 1=Mon, ... 6=Sat
    public DayOfWeek DayOfWeek { get; set; }

    public TimeSpan StartTime { get; set; } = new TimeSpan(9, 0, 0);
    public TimeSpan EndTime   { get; set; } = new TimeSpan(20, 0, 0);
    public bool IsWorking     { get; set; } = true;

    public MasterProfile Master { get; set; } = null!;
}
