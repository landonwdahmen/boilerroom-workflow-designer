// Original routes retained where safe; October 2026 portfolio authentication/authorization work.
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;
using NpgsqlTypes;
using ZitaDataSystem.Models;
using ZitaDataSystem.Services;

namespace ZitaDataSystem.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(NpgsqlDataSource database, AuthService auth, AuthenticationTickets tickets,
    IAntiforgery antiforgery, SessionSettings settings) : SecuredController
{
    [AllowAnonymous, HttpGet("csrf")]
    public IActionResult Csrf() => Ok(new { requestToken = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });

    [AllowAnonymous, HttpPost("login"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (!AuthService.PasswordAllowed(request.Password)) return Unauthorized(new { message = "Invalid credentials." });
        var account = await auth.AuthenticateAsync(request.Email, request.Password, cancellationToken);
        if (account is null) return Unauthorized(new { message = "Invalid credentials." });
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        var expires = DateTimeOffset.UtcNow.Add(settings.Lifetime);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, AuthService.Principal(account),
            new AuthenticationProperties { IsPersistent = false, AllowRefresh = false, ExpiresUtc = expires });
        return Ok(new { userId = account.Id, name = account.Name, email = account.Email, role = account.Role,
            organizationId = account.OrganizationId, organizationName = account.OrganizationName, expiresAt = expires });
    }

    [HttpGet("me")]
    public IActionResult Me() => Ok(Current.Profile);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [AllowAnonymous, HttpPost("register"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (request.Role.Trim().Equals("administrator", StringComparison.OrdinalIgnoreCase))
            return StatusCode(403, new { message = "Administrators are provisioned by the local operator." });
        if (!request.Role.Trim().Equals("developer", StringComparison.OrdinalIgnoreCase) ||
            !string.IsNullOrEmpty(request.OrganizationId) || !string.IsNullOrEmpty(request.OrganizationName) ||
            !AuthService.PasswordAllowed(request.Password, true) || string.IsNullOrWhiteSpace(request.Name) ||
            !Regex.IsMatch(request.AccessCode ?? "", "^[a-f0-9]{64}$"))
            return BadRequest(new { message = "Invalid registration request." });

        var email = request.Email.Trim().ToLowerInvariant();
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.AccessCode!)));
        await using var connection = await database.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        string org;
        string? orgName;
        Guid invitation;
        await using (var select = new NpgsqlCommand("""
            SELECT i.id,i.organizationid,u.organizationname
            FROM invitations i JOIN users u ON u.id=i.created_by AND u.organizationid=i.organizationid
            WHERE i.token_hash=@hash AND i.email=@email AND i.consumed_at IS NULL
                AND i.expires_at>CURRENT_TIMESTAMP AND u.role='administrator'
            FOR UPDATE OF i
            """, connection, transaction))
        {
            select.Parameters.AddWithValue("hash", tokenHash);
            select.Parameters.AddWithValue("email", email);
            await using var reader = await select.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return BadRequest(new { message = "Invalid or unavailable invitation." });
            invitation = reader.GetGuid(0);
            org = reader.GetString(1);
            orgName = reader.IsDBNull(2) ? null : reader.GetString(2);
        }
        var id = Guid.NewGuid().ToString();
        await using (var insert = new NpgsqlCommand("""
            INSERT INTO users(id,name,email,password,role,organizationid,organizationname)
            VALUES(@id,@name,@email,@password,'developer',@org,@orgName)
            """, connection, transaction))
        {
            insert.Parameters.AddWithValue("id", id);
            insert.Parameters.AddWithValue("name", request.Name.Trim());
            insert.Parameters.AddWithValue("email", email);
            insert.Parameters.AddWithValue("password", BCrypt.Net.BCrypt.HashPassword(request.Password, 12));
            insert.Parameters.AddWithValue("org", org);
            insert.Parameters.AddWithValue("orgName", NpgsqlDbType.Text, (object?)orgName ?? DBNull.Value);
            await insert.ExecuteNonQueryAsync(cancellationToken);
        }
        await using (var consume = new NpgsqlCommand(
            "UPDATE invitations SET consumed_at=CURRENT_TIMESTAMP WHERE id=@id", connection, transaction))
        {
            consume.Parameters.AddWithValue("id", invitation);
            await consume.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        // Deliberately no automatic sign-in: registration and credential login remain separate.
        return Ok(new { userId = id, email, role = "developer", organizationId = org, organizationName = orgName,
            message = "Account created. Sign in with your credentials." });
    }

    [Authorize(Roles = "administrator"), HttpPost("invitations")]
    public async Task<IActionResult> Invite(InvitationRequest request, CancellationToken cancellationToken)
    {
        var accessCode = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var id = Guid.NewGuid();
        var expires = DateTimeOffset.UtcNow.AddHours(24);
        await using var command = database.CreateCommand("""
            INSERT INTO invitations(id,token_hash,organizationid,email,created_by,expires_at)
            VALUES(@id,@hash,@org,@email,@creator,@expires)
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("hash", Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(accessCode))));
        command.Parameters.AddWithValue("org", Current.OrganizationId);
        command.Parameters.AddWithValue("email", request.Email.Trim().ToLowerInvariant());
        command.Parameters.AddWithValue("creator", Current.Id);
        command.Parameters.AddWithValue("expires", expires);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return Ok(new { invitationId = id, accessCode, expiresAt = expires });
    }

    [HttpGet("profile/{id}")]
    public IActionResult Profile(string id) => id == Current.Id ? Ok(Current.Profile) : NotFound();

    [HttpPatch("profile/{id}")]
    public async Task<IActionResult> UpdateProfile(string id, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        if (id != Current.Id) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required." });
        await using var command = database.CreateCommand(
            "UPDATE users SET name=@name WHERE id=@id AND organizationid=@org");
        command.Parameters.AddWithValue("name", request.Name.Trim());
        command.Parameters.AddWithValue("id", Current.Id);
        command.Parameters.AddWithValue("org", Current.OrganizationId);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1) return NotFound();
        return Ok((Current with { Name = request.Name.Trim() }).Profile);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, [FromQuery] string? email,
        CancellationToken cancellationToken)
    {
        if (email is not null && email.Trim().ToLowerInvariant() != Current.Email) return Forbid();
        if (!AuthService.PasswordAllowed(request.CurrentPassword) || !AuthService.PasswordAllowed(request.NewPassword, true))
            return BadRequest(new { message = "Password must be 12 or more characters and at most 72 UTF-8 bytes." });
        if (!AuthService.VerifyPassword(request.CurrentPassword, Current.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });
        await using var command = database.CreateCommand("""
            UPDATE users SET password=@password WHERE id=@id AND organizationid=@org AND password=@previous
            """);
        command.Parameters.AddWithValue("password", BCrypt.Net.BCrypt.HashPassword(request.NewPassword, 12));
        command.Parameters.AddWithValue("previous", Current.PasswordHash);
        command.Parameters.AddWithValue("id", Current.Id);
        command.Parameters.AddWithValue("org", Current.OrganizationId);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1)
            return Conflict(new { message = "Account changed; sign in again." });
        tickets.RevokeUser(Current.Id);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Password changed. All sessions revoked; sign in again." });
    }

    [Authorize(Roles = "administrator"), HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? organizationId, CancellationToken cancellationToken)
    {
        if (!OrganizationMatches(organizationId)) return Forbid();
        await using var command = database.CreateCommand(
            "SELECT id,name,email,role,organizationid FROM users WHERE organizationid=@org ORDER BY id");
        command.Parameters.AddWithValue("org", Current.OrganizationId);
        var users = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            users.Add(new { id = reader.GetString(0), name = reader.GetString(1), email = reader.GetString(2),
                role = reader.GetString(3), organizationId = reader.GetString(4) });
        return Ok(users);
    }

    [HttpGet("projects")]
    public async Task<IActionResult> Projects([FromQuery] string? organizationId, CancellationToken cancellationToken)
    {
        if (!OrganizationMatches(organizationId)) return Forbid();
        return Ok(await ProjectQueries.ListAsync(database, Current.OrganizationId,
            Current.Role == "administrator" ? null : Current.Id, cancellationToken));
    }

    [HttpGet("company-code")]
    public IActionResult LegacyCompanyCode() => StatusCode(410, new { message = "Use administrator-issued invitations." });

    [Authorize(Roles = "administrator"), HttpPost("projects")]
    public async Task<IActionResult> CreateProject(CreateProjectRequest request, CancellationToken cancellationToken)
    {
        if (!OrganizationMatches(request.OrganizationId)) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Project name is required." });
        var assignee = string.IsNullOrWhiteSpace(request.AssignedTo) ? null : request.AssignedTo;
        var status = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status.Trim();
        await using var connection = await database.OpenConnectionAsync(cancellationToken);
        // Keep the membership read and insert in one transaction; FK remains the final integrity guard.
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        if (assignee is not null)
        {
            await using var member = new NpgsqlCommand(
                "SELECT 1 FROM users WHERE id=@id AND organizationid=@org FOR KEY SHARE", connection, transaction);
            member.Parameters.AddWithValue("id", assignee);
            member.Parameters.AddWithValue("org", Current.OrganizationId);
            if (await member.ExecuteScalarAsync(cancellationToken) is null)
                return BadRequest(new { message = "Assignee must belong to your organization." });
        }
        var id = Guid.NewGuid();
        await using var insert = new NpgsqlCommand("""
            INSERT INTO projects(id,name,description,status,assignedto,organizationid)
            VALUES(@id,@name,@description,@status,@assigned,@org)
            """, connection, transaction);
        insert.Parameters.AddWithValue("id", id);
        insert.Parameters.AddWithValue("name", request.Name.Trim());
        insert.Parameters.AddWithValue("description", NpgsqlDbType.Text, (object?)request.Description ?? DBNull.Value);
        insert.Parameters.AddWithValue("status", status);
        insert.Parameters.AddWithValue("assigned", NpgsqlDbType.Text, (object?)assignee ?? DBNull.Value);
        insert.Parameters.AddWithValue("org", Current.OrganizationId);
        await insert.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(new { id, message = "Project created successfully." });
    }
}
