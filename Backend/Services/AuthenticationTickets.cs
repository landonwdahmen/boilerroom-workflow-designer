// October 2026 portfolio modernization. Standard cookie middleware ticket-store extension.
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ZitaDataSystem.Services;

public sealed class AuthenticationTickets : ITicketStore
{
    private sealed record Entry(string UserId, DateTimeOffset Expires, byte[] SerializedTicket);
    private readonly ConcurrentDictionary<string, Entry> _tickets = new();

    public Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        foreach (var pair in _tickets)
            if (pair.Value.Expires <= DateTimeOffset.UtcNow) _tickets.TryRemove(pair.Key, out _);
        if (_tickets.Count >= 1024) throw new InvalidOperationException("Session capacity reached.");
        var key = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _tickets[key] = MakeEntry(ticket);
        return Task.FromResult(key);
    }

    public Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        if (_tickets.TryGetValue(key, out var previous)) _tickets.TryUpdate(key, MakeEntry(ticket), previous);
        return Task.CompletedTask;
    }

    public Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        if (_tickets.TryGetValue(key, out var entry) && entry.Expires > DateTimeOffset.UtcNow)
            return Task.FromResult(TicketSerializer.Default.Deserialize(entry.SerializedTicket));
        _tickets.TryRemove(key, out _);
        return Task.FromResult<AuthenticationTicket?>(null);
    }

    public Task RemoveAsync(string key)
    {
        _tickets.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public void RevokeUser(string userId)
    {
        foreach (var pair in _tickets)
            if (pair.Value.UserId == userId) _tickets.TryRemove(pair.Key, out _);
    }

    private static Entry MakeEntry(AuthenticationTicket ticket) => new(
        ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Missing user."),
        ticket.Properties.ExpiresUtc ?? throw new InvalidOperationException("Missing session expiration."),
        TicketSerializer.Default.Serialize(ticket));
}
