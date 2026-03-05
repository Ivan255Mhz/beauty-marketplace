using System.Text;
using BeautyMarketplace.API.Middleware;
using BeautyMarketplace.API.Services;
using BeautyMarketplace.Core.Interfaces;
using BeautyMarketplace.Infrastructure.Data;
using BeautyMarketplace.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IMasterRepository, MasterRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IPortfolioRepository, PortfolioRepository>();
builder.Services.AddScoped<IScheduleRepository, ScheduleRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<ISlotService, SlotService>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFileService, FileService>();

// Фоновый сервис напоминаний
builder.Services.AddHostedService<ReminderHostedService>();

// Email service
builder.Services.AddScoped<IEmailService, EmailService>();

// SignalR real-time chat
builder.Services.AddSingleton<BeautyMarketplace.API.Hubs.PresenceTracker>();
builder.Services.AddSignalR();

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // SignalR sends JWT as query param because WebSocket cannot set headers
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                var path  = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                    context.Token = token;
                return System.Threading.Tasks.Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
            "http://localhost",
            "http://localhost:80",
            "http://localhost:3000",
            "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Beauty Marketplace API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<BeautyMarketplace.API.Hubs.ChatHub>("/hubs/chat");

// Auto-create all tables on startup, then apply any missing column additions
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        // Creates all tables if they don't exist yet
        db.Database.EnsureCreated();

        // Safely add any new columns introduced after initial deploy
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();

        // Reminder flags on Bookings (added in v2)
        cmd.CommandText = @"
            ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""Reminder24hSent"" boolean NOT NULL DEFAULT false;
            ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""Reminder2hSent""  boolean NOT NULL DEFAULT false;
            ALTER TABLE ""Reviews""  ADD COLUMN IF NOT EXISTS ""PhotoUrls"" text[] NOT NULL DEFAULT ARRAY[]::text[];

            -- Email confirmation (added in v4)
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""EmailConfirmed""          boolean   NOT NULL DEFAULT false;
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""EmailConfirmationToken""   text               DEFAULT NULL;
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""EmailConfirmationExpiry""  timestamp          DEFAULT NULL;

            -- Mark all EXISTING users as confirmed so they are not locked out after upgrade
            UPDATE ""Users"" SET ""EmailConfirmed"" = true WHERE ""EmailConfirmed"" = false;
        ";
        await cmd.ExecuteNonQueryAsync();
        logger.LogInformation("Schema update completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Schema update failed.");
    }
}

app.Run();
