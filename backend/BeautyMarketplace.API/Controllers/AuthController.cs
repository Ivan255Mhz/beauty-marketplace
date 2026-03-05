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
    private readonly IUserRepository   _users;
    private readonly IMasterRepository _masters;
    private readonly IAuthService      _auth;
    private readonly IEmailService     _email;
    private readonly IConfiguration    _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IUserRepository users, IMasterRepository masters,
        IAuthService auth, IEmailService email, IConfiguration config,
        ILogger<AuthController> logger)
    {
        _users   = users;
        _masters = masters;
        _auth    = auth;
        _email   = email;
        _config  = config;
        _logger  = logger;
    }

    // ─── Register ────────────────────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email и пароль обязательны" });

        if (req.Password.Length < 6)
            return BadRequest(new { message = "Минимальная длина пароля — 6 символов" });

        var existing = await _users.GetByEmailAsync(req.Email);
        if (existing != null)
            return Conflict(new { message = "Пользователь с таким email уже существует" });

        var token = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Email                   = req.Email.ToLower().Trim(),
            PasswordHash            = _auth.HashPassword(req.Password),
            Name                    = req.Name.Trim(),
            Role                    = req.Role,
            Phone                   = req.Phone,
            EmailConfirmed          = false,
            EmailConfirmationToken  = token,
            EmailConfirmationExpiry = DateTime.UtcNow.AddHours(24),
        };

        await _users.AddAsync(user);

        if (req.Role == UserRole.Master)
            await _masters.AddAsync(new MasterProfile { UserId = user.Id });

        // Send email in background — do NOT await, so register returns immediately
        var frontendUrl = _config["App:FrontendUrl"] ?? "http://localhost";
        var confirmUrl  = $"{frontendUrl}/confirm-email?token={token}";

        _ = Task.Run(async () =>
        {
            try
            {
                await _email.SendConfirmationEmailAsync(user.Email, user.Name, confirmUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send confirmation email to {Email}", user.Email);
                _logger.LogWarning("[FALLBACK] Confirmation link for {Email}: {Url}", user.Email, confirmUrl);
            }
        });

        return Ok(new { message = "Регистрация прошла успешно. Проверьте почту для подтверждения email." });
    }

    // ─── Confirm Email ───────────────────────────────────────────────────────
    [HttpGet("confirm-email")]
    public async Task<ActionResult> ConfirmEmail([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Токен не указан" });

        var user = await _users.GetByConfirmationTokenAsync(token);

        if (user == null)
            return BadRequest(new { message = "Неверная или уже использованная ссылка подтверждения" });

        if (user.EmailConfirmationExpiry < DateTime.UtcNow)
            return BadRequest(new { message = "Ссылка подтверждения истекла. Запросите новую." });

        user.EmailConfirmed          = true;
        user.EmailConfirmationToken  = null;
        user.EmailConfirmationExpiry = null;
        await _users.UpdateAsync(user);

        return Ok(new { message = "Email успешно подтверждён! Теперь вы можете войти." });
    }

    // ─── Resend Confirmation ─────────────────────────────────────────────────
    [HttpPost("resend-confirmation")]
    public async Task<ActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest req)
    {
        var user = await _users.GetByEmailAsync(req.Email);

        if (user == null || user.EmailConfirmed)
            return Ok(new { message = "Если этот email зарегистрирован и не подтверждён, письмо отправлено." });

        if (user.EmailConfirmationExpiry.HasValue &&
            user.EmailConfirmationExpiry.Value > DateTime.UtcNow.AddHours(23).AddMinutes(58))
            return Ok(new { message = "Письмо уже было отправлено. Подождите 2 минуты." });

        var token = Guid.NewGuid().ToString("N");
        user.EmailConfirmationToken  = token;
        user.EmailConfirmationExpiry = DateTime.UtcNow.AddHours(24);
        await _users.UpdateAsync(user);

        var frontendUrl = _config["App:FrontendUrl"] ?? "http://localhost";
        var confirmUrl  = $"{frontendUrl}/confirm-email?token={token}";

        _ = Task.Run(async () =>
        {
            try   { await _email.SendConfirmationEmailAsync(user.Email, user.Name, confirmUrl); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend confirmation email to {Email}", user.Email);
                _logger.LogWarning("[FALLBACK] Confirmation link for {Email}: {Url}", user.Email, confirmUrl);
            }
        });

        return Ok(new { message = "Письмо с подтверждением отправлено повторно." });
    }

    // ─── Login ───────────────────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _users.GetByEmailAsync(req.Email);
        if (user == null || !_auth.VerifyPassword(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Неверный email или пароль" });

        if (!user.EmailConfirmed)
            return StatusCode(403, new {
                message = "Email не подтверждён. Проверьте почту или запросите повторное письмо.",
                code    = "EMAIL_NOT_CONFIRMED",
                email   = user.Email,
            });

        var token = _auth.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role));
    }
}
