using System.Security.Claims;
using BeautyMarketplace.API.Services;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MastersController : ControllerBase
{
    private readonly IMasterRepository _masters;
    private readonly IUserRepository _users;
    private readonly IPortfolioRepository _portfolio;
    private readonly IFileService _files;

    public MastersController(IMasterRepository masters, IUserRepository users,
        IPortfolioRepository portfolio, IFileService files)
    {
        _masters = masters;
        _users = users;
        _portfolio = portfolio;
        _files = files;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/masters?category=Haircut&priceMin=500&priceMax=3000&district=Арбат&page=1
    [HttpGet]
    public async Task<ActionResult<PagedResult<MasterListItemDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] decimal? priceMin,
        [FromQuery] decimal? priceMax,
        [FromQuery] string? district,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        ServiceCategory? cat = null;
        if (!string.IsNullOrEmpty(category) && Enum.TryParse<ServiceCategory>(category, true, out var parsed))
            cat = parsed;

        var (masters, total) = await _masters.GetAllAsync(cat, priceMin, priceMax, district, page, pageSize);

        var items = masters.Select(m =>
        {
            var avg = m.Reviews.Any() ? m.Reviews.Average(r => r.Rating) : 0.0;
            return new MasterListItemDto(
                ProfileId: m.Id,
                UserId: m.UserId,
                Name: m.User.Name,
                AvatarUrl: m.AvatarUrl ?? m.User.AvatarUrl,
                Address: m.Address,
                Bio: m.Bio,
                PriceFrom: m.Services.Any() ? m.Services.Min(s => s.Price) : null,
                AverageRating: Math.Round(avg, 1),
                ReviewCount: m.Reviews.Count,
                Categories: m.Services.Select(s => s.Category.ToString()).Distinct().ToList()
            );
        }).ToList();

        return Ok(new PagedResult<MasterListItemDto>(items, total));
    }

    // GET /api/masters/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MasterProfileDto>> GetById(Guid id)
    {
        var master = await _masters.GetByIdAsync(id);
        if (master == null) return NotFound();
        return Ok(MapToDto(master));
    }

    // GET /api/masters/me
    [HttpGet("me")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<MasterProfileDto>> GetMyProfile()
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound(new { message = "Профиль мастера не найден" });
        return Ok(MapToDto(master));
    }

    // POST /api/masters/profile
    [HttpPost("profile")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<MasterProfileDto>> CreateProfile([FromBody] UpsertMasterProfileRequest req)
    {
        var existing = await _masters.GetByUserIdAsync(CurrentUserId);
        if (existing != null) return Conflict(new { message = "Профиль уже существует" });

        var profile = new MasterProfile
        {
            UserId = CurrentUserId,
            Bio = req.Bio,
            Address = req.Address,
            Latitude = req.Latitude,
            Longitude = req.Longitude
        };

        await _masters.AddAsync(profile);
        var created = await _masters.GetByUserIdAsync(CurrentUserId);
        return Ok(MapToDto(created!));
    }

    // PUT /api/masters/profile
    [HttpPut("profile")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<MasterProfileDto>> UpdateProfile([FromBody] UpsertMasterProfileRequest req)
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound();

        master.Bio = req.Bio;
        master.Address = req.Address;
        master.Latitude = req.Latitude;
        master.Longitude = req.Longitude;

        await _masters.UpdateAsync(master);
        return Ok(MapToDto(master));
    }

    // POST /api/masters/avatar
    [HttpPost("avatar")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult> UploadAvatar(IFormFile file)
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound();

        if (master.AvatarUrl != null) _files.DeleteFile(master.AvatarUrl);

        var url = await _files.SaveAvatarAsync(file, CurrentUserId);
        if (url == null) return BadRequest(new { message = "Неверный формат файла" });

        master.AvatarUrl = url;
        await _masters.UpdateAsync(master);

        return Ok(new { url });
    }

    // POST /api/masters/portfolio
    [HttpPost("portfolio")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<PortfolioPhotoDto>> AddPortfolioPhoto(IFormFile file, [FromForm] string? caption)
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return NotFound();

        var url = await _files.SavePortfolioPhotoAsync(file, CurrentUserId);
        if (url == null) return BadRequest(new { message = "Неверный формат файла" });

        var photo = new PortfolioPhoto
        {
            MasterId = master.Id,
            Url = url,
            Caption = caption?.Trim()
        };

        await _portfolio.AddAsync(photo);
        return Ok(new PortfolioPhotoDto(photo.Id, photo.Url, photo.Caption));
    }

    // DELETE /api/masters/portfolio/{photoId}
    [HttpDelete("portfolio/{photoId:guid}")]
    [Authorize(Roles = "Master")]
    public async Task<IActionResult> DeletePortfolioPhoto(Guid photoId)
    {
        var photo = await _portfolio.GetByIdAsync(photoId);
        if (photo == null) return NotFound();

        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null || photo.MasterId != master.Id) return Forbid();

        _files.DeleteFile(photo.Url);
        await _portfolio.DeleteAsync(photo);
        return NoContent();
    }

    private static MasterProfileDto MapToDto(MasterProfile m)
    {
        var avg = m.Reviews.Any() ? m.Reviews.Average(r => r.Rating) : 0.0;
        return new MasterProfileDto(
            Id: m.Id,
            UserId: m.UserId,
            MasterName: m.User.Name,
            AvatarUrl: m.AvatarUrl ?? m.User.AvatarUrl,
            Bio: m.Bio,
            Address: m.Address,
            Latitude: m.Latitude,
            Longitude: m.Longitude,
            PriceFrom: m.Services.Any() ? m.Services.Min(s => s.Price) : null,
            AverageRating: Math.Round(avg, 1),
            ReviewCount: m.Reviews.Count,
            Services: m.Services.Select(s => new ServiceDto(
                s.Id, s.MasterId, s.Name, s.Description, s.Price, s.DurationMinutes, s.Category
            )).ToList(),
            Portfolio: m.Portfolio.OrderByDescending(p => p.CreatedAt).Select(p =>
                new PortfolioPhotoDto(p.Id, p.Url, p.Caption)).ToList(),
            Reviews: m.Reviews.OrderByDescending(r => r.CreatedAt).Select(r =>
                new ReviewDto(r.Id, r.ClientId, r.Client.Name, r.Client.AvatarUrl,
                    r.Rating, r.Comment, r.CreatedAt)).ToList()
        );
    }
}
