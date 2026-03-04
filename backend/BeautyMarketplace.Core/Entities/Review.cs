namespace BeautyMarketplace.Core.Entities;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MasterId { get; set; }
    public Guid ClientId { get; set; }
    public Guid? BookingId { get; set; }
    public int Rating { get; set; } // 1-5
    public string? Comment { get; set; }
    public List<string> PhotoUrls { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public MasterProfile Master { get; set; } = null!;
    public User Client { get; set; } = null!;
}
