namespace BeautyMarketplace.API.Hubs;

/// Thread-safe in-memory tracker: userId → set of connectionIds.
/// A user is "online" as long as they have at least one active connection.
public class PresenceTracker
{
    private readonly Dictionary<Guid, HashSet<string>> _connections = new();
    private readonly object _lock = new();

    /// Returns true if this is the user's FIRST connection (just came online).
    public bool UserConnected(Guid userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_connections.TryGetValue(userId, out var conns))
            {
                conns = new HashSet<string>();
                _connections[userId] = conns;
            }
            conns.Add(connectionId);
            return conns.Count == 1;
        }
    }

    /// Returns true if this was the user's LAST connection (just went offline).
    public bool UserDisconnected(Guid userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_connections.TryGetValue(userId, out var conns)) return false;
            conns.Remove(connectionId);
            if (conns.Count == 0)
            {
                _connections.Remove(userId);
                return true;
            }
            return false;
        }
    }

    public bool IsOnline(Guid userId)
    {
        lock (_lock)
            return _connections.TryGetValue(userId, out var c) && c.Count > 0;
    }

    public List<Guid> GetOnlineUsers()
    {
        lock (_lock)
            return _connections.Keys.ToList();
    }
}
