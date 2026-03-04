namespace BeautyMarketplace.API.Services;

public interface IFileService
{
    Task<string?> SaveAvatarAsync(IFormFile file, Guid userId);
    Task<string?> SavePortfolioPhotoAsync(IFormFile file, Guid masterId);
    Task<string?> SaveReviewPhotoAsync(IFormFile file, Guid reviewId);
    void DeleteFile(string? url);
}

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _env;
    private readonly string[] _allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    public FileService(IWebHostEnvironment env) => _env = env;

    public Task<string?> SaveAvatarAsync(IFormFile file, Guid userId) =>
        SaveImageAsync(file, "avatars", userId.ToString());

    public Task<string?> SavePortfolioPhotoAsync(IFormFile file, Guid masterId) =>
        SaveImageAsync(file, "portfolio", masterId.ToString());

    public Task<string?> SaveReviewPhotoAsync(IFormFile file, Guid reviewId) =>
        SaveImageAsync(file, "reviews", reviewId.ToString());

    private async Task<string?> SaveImageAsync(IFormFile file, string folder, string prefix)
    {
        if (file == null || file.Length == 0) return null;
        if (!_allowedTypes.Contains(file.ContentType)) return null;

        var dir = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(dir);

        var ext = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{prefix}_{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(dir, fileName);

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{fileName}";
    }

    public void DeleteFile(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        var path = Path.Combine(_env.WebRootPath, url.TrimStart('/'));
        if (File.Exists(path)) File.Delete(path);
    }
}
