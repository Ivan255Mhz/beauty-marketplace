namespace BeautyMarketplace.Core.Entities;

public class PortfolioPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MasterId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public MasterProfile Master { get; set; } = null!;
}
