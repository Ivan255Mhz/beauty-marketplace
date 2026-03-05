using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BeautyMarketplace.API.Services;

public interface IEmailService
{
    Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmUrl);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration        _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmUrl)
    {
        var smtp     = _config.GetSection("Smtp");
        var host     = smtp["Host"]     ?? "smtp.yandex.ru";
        var port     = int.Parse(smtp["Port"]     ?? "465");
        var user     = smtp["User"]     ?? "";
        var pass     = smtp["Password"] ?? "";
        var fromAddr = smtp["From"]     ?? user;
        var fromName = smtp["FromName"] ?? "BeautyBook";

        // DEV mode — log link if credentials not configured
        if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
        {
            _logger.LogWarning("[DEV] Confirmation link for {Email}: {Url}", toEmail, confirmUrl);
            return;
        }

        var body = $@"
<div style=""font-family:Arial,sans-serif;max-width:480px;margin:0 auto"">
  <div style=""background:#ff6b9d;padding:24px;text-align:center;border-radius:12px 12px 0 0"">
    <h1 style=""color:#fff;margin:0;font-size:24px"">BeautyBook</h1>
  </div>
  <div style=""background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px"">
    <h2 style=""color:#333;margin-top:0"">Подтвердите email</h2>
    <p style=""color:#666"">Привет, <strong>{toName}</strong>!</p>
    <p style=""color:#666"">Для завершения регистрации нажмите кнопку ниже:</p>
    <div style=""text-align:center;margin:32px 0"">
      <a href=""{confirmUrl}""
         style=""background:#ff6b9d;color:#fff;padding:14px 36px;border-radius:24px;
                text-decoration:none;font-size:16px;font-weight:bold;display:inline-block"">
        Подтвердить email
      </a>
    </div>
    <p style=""color:#aaa;font-size:12px"">
      Ссылка действительна 24 часа.<br>
      Если вы не регистрировались — просто проигнорируйте это письмо.
    </p>
  </div>
</div>";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddr));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Подтверждение email — BeautyBook";
        message.Body    = new TextPart("html") { Text = body };

        using var client = new SmtpClient();

        // Port 465 = SslOnConnect (implicit SSL) — required by Yandex
        // Port 587 = StartTls
        var secureOption = port == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        await client.ConnectAsync(host, port, secureOption);
        await client.AuthenticateAsync(user, pass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Confirmation email sent to {Email}", toEmail);
    }
}
