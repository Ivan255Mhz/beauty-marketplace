using BeautyMarketplace.API.Services;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IMasterRepository _masters;
    private readonly IAuthService _auth;

    public AuthController(IUserRepository users, IMasterRepository masters, IAuthService auth)
    {
        _users = users;
        _masters = masters;
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email и пароль обязательны" });

        if (req.Password.Length < 6)
            return BadRequest(new { message = "Минимальная длина пароля — 6 символов" });

        var existing = await _users.GetByEmailAsync(req.Email);
        if (existing != null)
            return Conflict(new { message = "Пользователь с таким email уже существует" });

        var user = new User
        {
            Email = req.Email.ToLower().Trim(),
            PasswordHash = _auth.HashPassword(req.Password),
            Name = req.Name.Trim(),
            Role = req.Role,
            Phone = req.Phone
        };

        await _users.AddAsync(user);

        // ─── Автоматически создаём профиль мастера ──────────
        if (req.Role == UserRole.Master)
        {
            var profile = new MasterProfile { UserId = user.Id };
            await _masters.AddAsync(profile);
        }

        var token = _auth.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _users.GetByEmailAsync(req.Email);
        if (user == null || !_auth.VerifyPassword(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Неверный email или пароль" });

        var token = _auth.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role));
    }
}
