// Individual October 2026 portfolio test infrastructure; synthetic identities only.
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using ZitaDataSystem.Services;

namespace BoilerRoom.Tests;

[Trait("Category", "Unit")]
public sealed class AuthenticationTests
{
    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("            ", false)]
    [InlineData("12345678901", false)]
    [InlineData("123456789012", true)]
    [InlineData(" 1234567890 ", true)]
    public void New_password_boundaries(string? password, bool allowed) =>
        Assert.Equal(allowed, AuthService.PasswordAllowed(password, true));

    [Fact]
    public void Bcrypt_limit_counts_UTF8_bytes()
    {
        Assert.True(AuthService.PasswordAllowed(new string('a', 72), true));
        Assert.False(AuthService.PasswordAllowed(new string('a', 73), true));
        Assert.True(AuthService.PasswordAllowed(new string('é', 36), true));
        Assert.False(AuthService.PasswordAllowed(new string('é', 37), true));
        Assert.True(AuthService.PasswordAllowed("x")); // Existing-login minimum differs deliberately.
    }

    [Fact]
    public void Hash_verification_preserves_whitespace_and_rejects_invalid_hash()
    {
        const string password = " Synthetic test password ";
        var hash = BCrypt.Net.BCrypt.HashPassword(password, 4); // Fast test-only cost; production stays 12.
        Assert.True(AuthService.VerifyPassword(password, hash));
        Assert.False(AuthService.VerifyPassword(password.Trim(), hash));
        Assert.False(AuthService.VerifyPassword(password, "invalid"));
    }

    [Theory]
    [InlineData("administrator")]
    [InlineData("developer")]
    public void Principal_uses_validated_account_identity(string role)
    {
        var account = new Account("synthetic-id", "Synthetic", "user@example.test", role, "org-a", null, "synthetic-hash");
        var principal = AuthService.Principal(account);
        Assert.True(principal.Identity!.IsAuthenticated);
        Assert.Equal(account.Id, principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.True(principal.IsInRole(role));
        Assert.Equal(account.OrganizationId, principal.FindFirstValue(AuthService.OrganizationClaim));
        Assert.Equal(AuthService.PasswordVersion(account.PasswordHash), principal.FindFirstValue(AuthService.PasswordVersionClaim));
        Assert.NotEqual(account.PasswordHash, principal.FindFirstValue(AuthService.PasswordVersionClaim));
    }

    private static AuthenticationTicket Ticket(string user, DateTimeOffset expiry) => new(
        new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user)], "test")),
        new AuthenticationProperties { ExpiresUtc = expiry }, CookieAuthenticationDefaults.AuthenticationScheme);

    [Fact]
    public async Task Sessions_are_independent_serialized_snapshots_and_revocable_per_user()
    {
        var store = new AuthenticationTickets();
        var ticket = Ticket("a", DateTimeOffset.UtcNow.AddMinutes(5));
        var a = await store.StoreAsync(ticket);
        var a2 = await store.StoreAsync(ticket);
        var b = await store.StoreAsync(Ticket("b", DateTimeOffset.UtcNow.AddMinutes(5)));
        Assert.NotEqual(a, a2);
        Assert.Equal(64, a.Length);
        ticket.Properties.ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(-1);
        Assert.NotNull(await store.RetrieveAsync(a));
        store.RevokeUser("a");
        Assert.Null(await store.RetrieveAsync(a));
        Assert.Null(await store.RetrieveAsync(a2));
        Assert.NotNull(await store.RetrieveAsync(b));
        await store.RemoveAsync(b);
        await store.RenewAsync(b, Ticket("b", DateTimeOffset.UtcNow.AddMinutes(5)));
        Assert.Null(await store.RetrieveAsync(b)); // Renewal cannot resurrect a revoked session.
    }

    [Fact]
    public async Task Expired_sessions_and_new_process_store_are_rejected()
    {
        var store = new AuthenticationTickets();
        var expired = await store.StoreAsync(Ticket("a", DateTimeOffset.UtcNow.AddSeconds(-1)));
        Assert.Null(await store.RetrieveAsync(expired));
        var active = await store.StoreAsync(Ticket("a", DateTimeOffset.UtcNow.AddMinutes(5)));
        Assert.Null(await new AuthenticationTickets().RetrieveAsync(active));
        await store.RenewAsync(active, Ticket("a", DateTimeOffset.UtcNow.AddSeconds(-1)));
        Assert.Null(await store.RetrieveAsync(active));
    }

    [Fact]
    public async Task Missing_identity_or_expiry_cannot_create_session()
    {
        var store = new AuthenticationTickets();
        await Assert.ThrowsAsync<InvalidOperationException>(() => store.StoreAsync(new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity()), new AuthenticationProperties(), "test")));
        var ticket = Ticket("a", DateTimeOffset.UtcNow.AddMinutes(5));
        ticket.Properties.ExpiresUtc = null;
        await Assert.ThrowsAsync<InvalidOperationException>(() => store.StoreAsync(ticket));
    }
}
