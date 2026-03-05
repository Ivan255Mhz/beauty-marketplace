using BeautyMarketplace.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BeautyMarketplace.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<MasterProfile> MasterProfiles => Set<MasterProfile>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<PortfolioPhoto> PortfolioPhotos => Set<PortfolioPhoto>();
    public DbSet<WorkSchedule> WorkSchedules => Set<WorkSchedule>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Review>(e =>
        {
            // Npgsql maps List<string> to text[] natively
            e.Property(r => r.PhotoUrls).HasColumnType("text[]");
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).IsRequired().HasMaxLength(256);
            e.Property(u => u.Name).IsRequired().HasMaxLength(100);
            e.Property(u => u.Role).HasConversion<string>();
        });

        modelBuilder.Entity<MasterProfile>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => m.UserId).IsUnique();
            e.HasOne(m => m.User)
                .WithOne(u => u.MasterProfile)
                .HasForeignKey<MasterProfile>(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Service>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Price).HasColumnType("decimal(10,2)");
            e.Property(s => s.Category).HasConversion<string>();
            e.HasOne(s => s.Master)
                .WithMany(m => m.Services)
                .HasForeignKey(s => s.MasterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(e =>
        {
            e.HasKey(b => b.Id);
            e.Property(b => b.Status).HasConversion<string>();
            e.Property(b => b.SlotDateTime).IsRequired(false);
            e.Property(b => b.Reminder24hSent).HasDefaultValue(false);
            e.Property(b => b.Reminder2hSent).HasDefaultValue(false);
            e.Ignore(b => b.DisplayDate);
            e.HasOne(b => b.Client)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.ClientId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.Service)
                .WithMany(s => s.Bookings)
                .HasForeignKey(b => b.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkSchedule>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasIndex(w => new { w.MasterId, w.DayOfWeek }).IsUnique();
            e.HasOne(w => w.Master)
                .WithMany(m => m.Schedule)
                .HasForeignKey(w => w.MasterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Review>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Rating).IsRequired();
            e.HasOne(r => r.Master)
                .WithMany(m => m.Reviews)
                .HasForeignKey(r => r.MasterId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PortfolioPhoto>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.Master)
                .WithMany(m => m.Portfolio)
                .HasForeignKey(p => p.MasterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Type).HasConversion<string>();
            e.HasIndex(n => new { n.UserId, n.IsRead });
            e.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => new { m.SenderId, m.ReceiverId });
            e.HasIndex(m => new { m.ReceiverId, m.IsRead });
            e.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.Receiver)
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
