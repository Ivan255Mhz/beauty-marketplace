namespace BeautyMarketplace.Core.Entities;

public class MasterProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string? Bio { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<PortfolioPhoto> Portfolio { get; set; } = new List<PortfolioPhoto>();
    public ICollection<WorkSchedule> Schedule { get; set; } = new List<WorkSchedule>();
}
