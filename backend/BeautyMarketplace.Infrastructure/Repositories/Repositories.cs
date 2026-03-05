using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using BeautyMarketplace.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BeautyMarketplace.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public Task<User?> GetByIdAsync(Guid id) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByEmailAsync(string email) =>
        _db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());

    public Task<User?> GetByConfirmationTokenAsync(string token) =>
        _db.Users.FirstOrDefaultAsync(u => u.EmailConfirmationToken == token);

    public Task<List<User>> SearchAsync(string query, Guid excludeUserId) =>
        _db.Users
            .Where(u => u.Id != excludeUserId &&
                (u.Name.ToLower().Contains(query.ToLower()) ||
                 u.Email.ToLower().Contains(query.ToLower())))
            .Take(10)
            .ToListAsync();

    public async Task AddAsync(User user)
    {
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }
}

public class MasterRepository : IMasterRepository
{
    private readonly AppDbContext _db;
    public MasterRepository(AppDbContext db) => _db = db;

    public Task<MasterProfile?> GetByUserIdAsync(Guid userId) =>
        _db.MasterProfiles
            .Include(m => m.User)
            .Include(m => m.Services.Where(s => s.IsActive))
            .Include(m => m.Reviews).ThenInclude(r => r.Client)
            .Include(m => m.Portfolio)
            .FirstOrDefaultAsync(m => m.UserId == userId);

    public Task<MasterProfile?> GetByIdAsync(Guid id) =>
        _db.MasterProfiles
            .Include(m => m.User)
            .Include(m => m.Services.Where(s => s.IsActive))
            .Include(m => m.Reviews).ThenInclude(r => r.Client)
            .Include(m => m.Portfolio)
            .FirstOrDefaultAsync(m => m.Id == id);

    public async Task<(List<MasterProfile> Items, int Total)> GetAllAsync(
        ServiceCategory? category = null,
        decimal? priceMin = null,
        decimal? priceMax = null,
        string? district = null,
        int page = 1,
        int pageSize = 12)
    {
        var query = _db.MasterProfiles
            .Include(m => m.User)
            .Include(m => m.Services.Where(s => s.IsActive))
            .Include(m => m.Reviews)
            .AsQueryable();

        if (category.HasValue)
            query = query.Where(m => m.Services.Any(s => s.Category == category.Value && s.IsActive));

        if (priceMin.HasValue)
            query = query.Where(m => m.Services.Any(s => s.IsActive && s.Price >= priceMin.Value));

        if (priceMax.HasValue)
            query = query.Where(m => m.Services.Any(s => s.IsActive && s.Price <= priceMax.Value));

        if (!string.IsNullOrWhiteSpace(district))
            query = query.Where(m => m.Address != null &&
                m.Address.ToLower().Contains(district.ToLower().Trim()));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task AddAsync(MasterProfile profile)
    {
        await _db.MasterProfiles.AddAsync(profile);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(MasterProfile profile)
    {
        _db.MasterProfiles.Update(profile);
        await _db.SaveChangesAsync();
    }
}

public class ServiceRepository : IServiceRepository
{
    private readonly AppDbContext _db;
    public ServiceRepository(AppDbContext db) => _db = db;

    public Task<Service?> GetByIdAsync(Guid id) =>
        _db.Services.Include(s => s.Master).FirstOrDefaultAsync(s => s.Id == id);

    public Task<List<Service>> GetByMasterIdAsync(Guid masterId) =>
        _db.Services.Where(s => s.MasterId == masterId && s.IsActive)
            .OrderByDescending(s => s.CreatedAt).ToListAsync();

    public async Task AddAsync(Service service)
    {
        await _db.Services.AddAsync(service);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Service service)
    {
        _db.Services.Update(service);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Service service)
    {
        service.IsActive = false;
        _db.Services.Update(service);
        await _db.SaveChangesAsync();
    }
}

public class BookingRepository : IBookingRepository
{
    private readonly AppDbContext _db;
    public BookingRepository(AppDbContext db) => _db = db;

    public Task<Booking?> GetByIdAsync(Guid id) =>
        _db.Bookings
            .Include(b => b.Client)
            .Include(b => b.Service).ThenInclude(s => s.Master).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(b => b.Id == id);

    public Task<List<Booking>> GetByClientIdAsync(Guid clientId) =>
        _db.Bookings
            .Include(b => b.Client)
            .Include(b => b.Service).ThenInclude(s => s.Master).ThenInclude(m => m.User)
            .Where(b => b.ClientId == clientId)
            .OrderByDescending(b => b.CreatedAt).ToListAsync();

    public Task<List<Booking>> GetByMasterIdAsync(Guid masterId) =>
        _db.Bookings
            .Include(b => b.Client)
            .Include(b => b.Service).ThenInclude(s => s.Master).ThenInclude(m => m.User)
            .Where(b => b.Service.MasterId == masterId)
            .OrderByDescending(b => b.CreatedAt).ToListAsync();

    public async Task AddAsync(Booking booking)
    {
        await _db.Bookings.AddAsync(booking);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Booking booking)
    {
        _db.Bookings.Update(booking);
        await _db.SaveChangesAsync();
    }

    public Task<List<Booking>> GetUpcomingForRemindersAsync(DateTime from, DateTime to) =>
        _db.Bookings
            .Include(b => b.Client)
            .Include(b => b.Service).ThenInclude(s => s.Master).ThenInclude(m => m.User)
            .Where(b =>
                b.Status == BookingStatus.Confirmed &&
                b.SlotDateTime.HasValue &&
                b.SlotDateTime.Value >= from &&
                b.SlotDateTime.Value <= to)
            .ToListAsync();
}

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _db;
    public ReviewRepository(AppDbContext db) => _db = db;

    public Task<List<Review>> GetByMasterIdAsync(Guid masterId) =>
        _db.Reviews
            .Include(r => r.Client)
            .Where(r => r.MasterId == masterId)
            .OrderByDescending(r => r.CreatedAt).ToListAsync();

    public Task<bool> ExistsAsync(Guid clientId, Guid masterId, Guid? bookingId) =>
        bookingId.HasValue
            ? _db.Reviews.AnyAsync(r => r.ClientId == clientId && r.BookingId == bookingId)
            : _db.Reviews.AnyAsync(r => r.ClientId == clientId && r.MasterId == masterId);

    public async Task AddAsync(Review review)
    {
        await _db.Reviews.AddAsync(review);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Review review)
    {
        _db.Reviews.Update(review);
        await _db.SaveChangesAsync();
    }
}

public class PortfolioRepository : IPortfolioRepository
{
    private readonly AppDbContext _db;
    public PortfolioRepository(AppDbContext db) => _db = db;

    public Task<List<PortfolioPhoto>> GetByMasterIdAsync(Guid masterId) =>
        _db.PortfolioPhotos
            .Where(p => p.MasterId == masterId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync();

    public Task<PortfolioPhoto?> GetByIdAsync(Guid id) =>
        _db.PortfolioPhotos.FirstOrDefaultAsync(p => p.Id == id);

    public async Task AddAsync(PortfolioPhoto photo)
    {
        await _db.PortfolioPhotos.AddAsync(photo);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(PortfolioPhoto photo)
    {
        _db.PortfolioPhotos.Remove(photo);
        await _db.SaveChangesAsync();
    }
}

public class ScheduleRepository : IScheduleRepository
{
    private readonly AppDbContext _db;
    public ScheduleRepository(AppDbContext db) => _db = db;

    public Task<List<WorkSchedule>> GetByMasterIdAsync(Guid masterId) =>
        _db.WorkSchedules.Where(w => w.MasterId == masterId)
            .OrderBy(w => w.DayOfWeek).ToListAsync();

    public async Task UpsertAsync(Guid masterId, List<WorkSchedule> incoming)
    {
        var existing = await _db.WorkSchedules
            .Where(w => w.MasterId == masterId).ToListAsync();
        _db.WorkSchedules.RemoveRange(existing);
        foreach (var s in incoming) s.MasterId = masterId;
        await _db.WorkSchedules.AddRangeAsync(incoming);
        await _db.SaveChangesAsync();
    }
}

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;
    public NotificationRepository(AppDbContext db) => _db = db;

    public Task<List<Notification>> GetByUserIdAsync(Guid userId, int limit = 30) =>
        _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public Task<int> GetUnreadCountAsync(Guid userId) =>
        _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task AddAsync(Notification notification)
    {
        await _db.Notifications.AddAsync(notification);
        await _db.SaveChangesAsync();
    }

    public async Task MarkReadAsync(Guid notificationId, Guid userId)
    {
        var n = await _db.Notifications
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
        if (n != null) { n.IsRead = true; await _db.SaveChangesAsync(); }
    }

    public async Task MarkAllReadAsync(Guid userId)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        unread.ForEach(n => n.IsRead = true);
        await _db.SaveChangesAsync();
    }
}

public class MessageRepository : IMessageRepository
{
    private readonly AppDbContext _db;
    public MessageRepository(AppDbContext db) => _db = db;

    public Task<List<Message>> GetConversationAsync(Guid userA, Guid userB, int limit = 50) =>
        _db.Messages
            .Where(m => (m.SenderId == userA && m.ReceiverId == userB) ||
                        (m.SenderId == userB && m.ReceiverId == userA))
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

    public async Task<List<(Guid PartnerId, Message LastMessage, int UnreadCount)>> GetConversationsAsync(Guid userId)
    {
        // All messages involving this user
        var messages = await _db.Messages
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        // Group by partner
        return messages
            .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Select(g => (
                PartnerId: g.Key,
                LastMessage: g.First(),
                UnreadCount: g.Count(m => m.ReceiverId == userId && !m.IsRead)
            ))
            .OrderByDescending(x => x.LastMessage.CreatedAt)
            .ToList();
    }

    public Task<int> GetTotalUnreadAsync(Guid userId) =>
        _db.Messages.CountAsync(m => m.ReceiverId == userId && !m.IsRead);

    public async Task AddAsync(Message message)
    {
        await _db.Messages.AddAsync(message);
        await _db.SaveChangesAsync();
    }

    public async Task MarkReadAsync(Guid senderId, Guid receiverId)
    {
        var unread = await _db.Messages
            .Where(m => m.SenderId == senderId && m.ReceiverId == receiverId && !m.IsRead)
            .ToListAsync();
        unread.ForEach(m => m.IsRead = true);
        await _db.SaveChangesAsync();
    }
}

