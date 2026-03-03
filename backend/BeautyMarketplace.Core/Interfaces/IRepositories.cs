using BeautyMarketplace.Core.Entities;

namespace BeautyMarketplace.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<List<User>> SearchAsync(string query, Guid excludeUserId);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}

public interface IMasterRepository
{
    Task<MasterProfile?> GetByUserIdAsync(Guid userId);
    Task<MasterProfile?> GetByIdAsync(Guid id);
    Task<(List<MasterProfile> Items, int Total)> GetAllAsync(
        ServiceCategory? category = null,
        decimal? priceMin = null,
        decimal? priceMax = null,
        string? district = null,
        int page = 1,
        int pageSize = 12
    );
    Task AddAsync(MasterProfile profile);
    Task UpdateAsync(MasterProfile profile);
}

public interface IServiceRepository
{
    Task<Service?> GetByIdAsync(Guid id);
    Task<List<Service>> GetByMasterIdAsync(Guid masterId);
    Task AddAsync(Service service);
    Task UpdateAsync(Service service);
    Task DeleteAsync(Service service);
}

public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(Guid id);
    Task<List<Booking>> GetByClientIdAsync(Guid clientId);
    Task<List<Booking>> GetByMasterIdAsync(Guid masterId);
    Task AddAsync(Booking booking);
    Task UpdateAsync(Booking booking);
    /// Возвращает подтверждённые записи со SlotDateTime, которым нужно отправить напоминание
    Task<List<Booking>> GetUpcomingForRemindersAsync(DateTime from, DateTime to);
}

public interface IReviewRepository
{
    Task<List<Review>> GetByMasterIdAsync(Guid masterId);
    Task<bool> ExistsAsync(Guid clientId, Guid masterId, Guid? bookingId);
    Task AddAsync(Review review);
}

public interface IPortfolioRepository
{
    Task<List<PortfolioPhoto>> GetByMasterIdAsync(Guid masterId);
    Task<PortfolioPhoto?> GetByIdAsync(Guid id);
    Task AddAsync(PortfolioPhoto photo);
    Task DeleteAsync(PortfolioPhoto photo);
}

public interface IScheduleRepository
{
    Task<List<WorkSchedule>> GetByMasterIdAsync(Guid masterId);
    Task UpsertAsync(Guid masterId, List<WorkSchedule> schedules);
}

public interface IMessageRepository
{
    Task<List<Message>> GetConversationAsync(Guid userA, Guid userB, int limit = 50);
    Task<List<(Guid PartnerId, Message LastMessage, int UnreadCount)>> GetConversationsAsync(Guid userId);
    Task<int> GetTotalUnreadAsync(Guid userId);
    Task AddAsync(Message message);
    Task MarkReadAsync(Guid senderId, Guid receiverId);
}

public interface INotificationRepository
{
    Task<List<Notification>> GetByUserIdAsync(Guid userId, int limit = 30);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task AddAsync(Notification notification);
    Task MarkReadAsync(Guid notificationId, Guid userId);
    Task MarkAllReadAsync(Guid userId);
}

public interface ISlotService
{
    /// Returns list of (slotDateTime, isAvailable) for given master+date+service duration
    Task<List<(DateTime Slot, bool Available)>> GetSlotsAsync(
        Guid masterId, DateOnly date, int durationMinutes);
}
