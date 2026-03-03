namespace BeautyMarketplace.Core.Entities;

public enum ServiceCategory
{
    Haircut, Coloring, Manicure, Pedicure,
    Makeup, Eyebrows, Eyelashes, Massage, Other
}

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MasterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    public ServiceCategory Category { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public MasterProfile Master { get; set; } = null!;
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
