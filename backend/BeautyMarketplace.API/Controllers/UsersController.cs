using System.Security.Claims;
using BeautyMarketplace.API.Services;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IFileService _files;

    public UsersController(IUserRepository users, IFileService files)
    {
        _users = users;
        _files = files;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var user = await _users.GetByIdAsync(CurrentUserId);
        if (user == null) return NotFound();

        return Ok(new UserDto(user.Id, user.Email, user.Name, user.Phone, user.AvatarUrl, user.Role));
    }

    // PUT /api/users/me
    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMe([FromBody] UpdateProfileRequest req)
    {
        var user = await _users.GetByIdAsync(CurrentUserId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name)) user.Name = req.Name.Trim();
        if (req.Phone != null) user.Phone = req.Phone.Trim();

        await _users.UpdateAsync(user);
        return Ok(new UserDto(user.Id, user.Email, user.Name, user.Phone, user.AvatarUrl, user.Role));
    }

    // POST /api/users/avatar
    [HttpPost("avatar")]
    public async Task<ActionResult> UploadAvatar(IFormFile file)
    {
        var user = await _users.GetByIdAsync(CurrentUserId);
        if (user == null) return NotFound();

        if (user.AvatarUrl != null) _files.DeleteFile(user.AvatarUrl);

        var url = await _files.SaveAvatarAsync(file, CurrentUserId);
        if (url == null) return BadRequest(new { message = "Неверный формат файла (jpg/png/webp)" });

        user.AvatarUrl = url;
        await _users.UpdateAsync(user);

        return Ok(new { url });
    }

    // GET /api/users/search?q=Анна
    [HttpGet("search")]
    public async Task<ActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new List<object>());

        var users = await _users.SearchAsync(q, CurrentUserId);
        return Ok(users.Select(u => new
        {
            id = u.Id,
            name = u.Name,
            avatarUrl = u.AvatarUrl,
            role = u.Role.ToString()
        }));
    }
}
