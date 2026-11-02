// October 2026 portfolio modernization; replaces the unsigned stub and incompatible integer-ID helper.
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.Cookies;
using Npgsql;

namespace ZitaDataSystem.Services;

public sealed record Account(string Id, string Name, string Email, string Role, string OrganizationId,
    string? OrganizationName, string PasswordHash)
{
    public object Profile => new { userId = Id, name = Name, email = Email, role = Role,
        organizationId = OrganizationId, organizationName = OrganizationName };
}

public sealed class AuthService(NpgsqlDataSource database)
{
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword(
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24)), 12);
    public const string PasswordVersionClaim = "tds:password-version";
    public const string OrganizationClaim = "tds:organization";

    public static string PasswordVersion(string passwordHash) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)));

    public static bool PasswordAllowed(string? password, bool creating = false) => !string.IsNullOrWhiteSpace(password) &&
        password.Length >= (creating ? 12 : 1) && Encoding.UTF8.GetByteCount(password) <= 72;

    public static bool VerifyPassword(string password, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch (Exception ex) when (ex is BCrypt.Net.SaltParseException or ArgumentException or FormatException) { return false; }
    }

    public async Task<Account?> FindAsync(string value, bool byEmail, CancellationToken cancellationToken)
    {
        await using var command = database.CreateCommand($"""
            SELECT u.id,u.name,u.email,u.role,u.organizationid,u.organizationname,u.password
            FROM users u JOIN companycodes c ON c.organizationid=u.organizationid
            WHERE {(byEmail ? "lower(u.email)=@value" : "u.id=@value")}
              AND u.role IN ('administrator','developer')
            """);
        command.Parameters.AddWithValue("value", value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? new Account(reader.GetString(0), reader.GetString(1),
            reader.GetString(2), reader.GetString(3), reader.GetString(4), reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.GetString(6)) : null;
    }

    public async Task<Account?> AuthenticateAsync(string email, string password, CancellationToken cancellationToken)
    {
        var account = await FindAsync(email.Trim().ToLowerInvariant(), true, cancellationToken);
        var verified = VerifyPassword(password, account?.PasswordHash ?? DummyHash);
        return verified ? account : null;
    }

    public static ClaimsPrincipal Principal(Account account) => new(new ClaimsIdentity(new[]
    {
        new Claim(ClaimTypes.NameIdentifier, account.Id), new Claim(ClaimTypes.Name, account.Name),
        new Claim(ClaimTypes.Role, account.Role), new Claim(OrganizationClaim, account.OrganizationId),
        new Claim(PasswordVersionClaim, PasswordVersion(account.PasswordHash))
    }, CookieAuthenticationDefaults.AuthenticationScheme));
}
