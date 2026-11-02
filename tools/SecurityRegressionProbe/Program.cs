// October 2026 security regression scenarios. No external services or testing packages.
using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Npgsql;
using PortfolioTools;

try { return await Verify(args); }
catch
{
    Console.Error.WriteLine("Security verification failed; sensitive exception/response details withheld. Inspect the sanitized report.");
    return 1;
}

static async Task<int> Verify(string[] args)
{
    if (args.Length != 1 || !int.TryParse(args[0], out var pid)) throw new InvalidOperationException();
    using var api = Process.GetProcessById(pid);
    if (api.HasExited || api.MainModule?.ModuleName != "dotnet.exe") throw new InvalidOperationException();
    ApiClient.ApiAlive = () => !api.HasExited;
    // Independently verify PID command line/socket and Docker resource identity BEFORE launching this program.
    using var certificate = X509Certificate2.CreateFromPem(File.ReadAllText(".local/https/localhost.pem"));
    await using var database = LocalDatabase.CreateSource();
    await LocalDatabase.ValidateAsync(database);
    var baseline = await LocalDatabase.BusinessFingerprintAsync(database);
    var run = ProbeReport.Run;
    var orgA = "m3a_" + run + "_a";
    var orgB = "m3a_" + run + "_b";
    var emailA = "admin-a-" + run + "@example.test";
    var emailB = "admin-b-" + run + "@example.test";
    var devEmail = "developer-" + run + "@example.test";
    var unusedEmail = "unused-" + run + "@example.test";
    var password = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
    var newPassword = " " + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)) + " ";
    ProbeReport.Save(); // Random ownership marker exists before provisioning/writes.
    ProbeReport.Check("All-space password rejected consistently", !ZitaDataSystem.Services.AuthService.PasswordAllowed(new string(' ', 12), true));
    ProbeReport.Check("BCrypt UTF-8 limit rejects overlong ASCII and multibyte passwords",
        !ZitaDataSystem.Services.AuthService.PasswordAllowed(new string('a', 73), true) &&
        !ZitaDataSystem.Services.AuthService.PasswordAllowed(new string('\u00e9', 40), true));
    ProbeReport.Check("Valid password boundary whitespace is retained", ZitaDataSystem.Services.AuthService.PasswordAllowed(newPassword, true));
    using var anonymous = new ApiClient("anonymous", certificate);
    using var admin = new ApiClient("admin-a", certificate);
    using var other = new ApiClient("admin-b", certificate);
    using var developer = new ApiClient("developer", certificate);
    try
    {
        var adminId = await LocalDatabase.ProvisionAdministratorAsync(database, orgA, "Synthetic M3A Organization A",
            "Synthetic M3A Administrator A", emailA, password);
        var duplicateRejected = false;
        try { await LocalDatabase.ProvisionAdministratorAsync(database, orgB, "Synthetic M3A Duplicate",
            "Synthetic M3A Duplicate", emailA, password); }
        catch (PostgresException exception) when (exception.SqlState == "23505") { duplicateRejected = true; }
        ProbeReport.Check("Local administrator provisioning rolls back duplicate email and organization",
            duplicateRejected && await Scalar<long>(database, "SELECT count(*) FROM companycodes WHERE organizationid=@org", ("org", orgB)) == 0);
        var otherId = await LocalDatabase.ProvisionAdministratorAsync(database, orgB, "Synthetic M3A Organization B",
            "Synthetic M3A Administrator B", emailB, password);
        await anonymous.Send("login without CSRF rejected", "POST", "/api/auth/login", new { email = emailA, password }, expected: 400);
        var login = await admin.Login(emailA, password);
        ProbeReport.Check("Secure HttpOnly Strict cookie and no bearer token response",
            admin.SecureCookieObserved && !login.TryGetProperty("token", out _) && Text(login, "userId") == adminId);
        await other.Login(emailB, password);
        await anonymous.RefreshCsrf();
        var wrong = await anonymous.Send("incorrect password", "POST", "/api/auth/login",
            new { email = emailA, password = newPassword }, expected: 401);
        var missing = await anonymous.Send("unknown account", "POST", "/api/auth/login",
            new { email = unusedEmail, password }, expected: 401);
        ProbeReport.Check("Unknown account and wrong password have identical public errors", wrong.Json.ToString() == missing.Json.ToString());
        await anonymous.Send("anonymous administrator registration forbidden", "POST", "/api/auth/register", new
        {
            name = "Synthetic M3A Forbidden", email = unusedEmail, password, role = "administrator", organizationId = orgA
        }, expected: 403);
        await anonymous.Send("unsupported role rejected", "POST", "/api/auth/register", new
        {
            name = "Synthetic M3A Forbidden", email = unusedEmail, password, role = "owner", accessCode = orgA
        }, expected: 400);
        await anonymous.Send("legacy organization ID is not an invitation", "POST", "/api/auth/register", new
        {
            name = "Synthetic M3A Forbidden", email = unusedEmail, password, role = "developer", accessCode = orgA
        }, expected: 400);

        var invitation = await admin.Send("issue developer invitation", "POST", "/api/auth/invitations", new { email = devEmail });
        var code = Text(invitation.Json, "accessCode");
        var inviteId = invitation.Json.GetProperty("invitationId").GetGuid();
        ProbeReport.Check("Invitation secret differs from ID and is hashed in PostgreSQL",
            code != orgA && code.Length == 64 && await Scalar<bool>(database,
                "SELECT token_hash=@hash AND token_hash<>@code AND expires_at>created_at FROM invitations WHERE id=@id AND organizationid=@org",
                ("hash", Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)))) , ("code", code), ("id", inviteId), ("org", orgA)));
        await anonymous.Send("invitation email mismatch rejected", "POST", "/api/auth/register", Registration(unusedEmail, code), expected: 400);
        var registered = await anonymous.Send("invited developer registration", "POST", "/api/auth/register", Registration(devEmail, code));
        var devId = Text(registered.Json, "userId");
        ProbeReport.Check("Registration is separate from login", !registered.Json.TryGetProperty("token", out _) &&
            Text(registered.Json, "organizationId") == orgA);
        await anonymous.Send("registration did not authenticate", "GET", "/api/auth/me", expected: 401);
        await anonymous.Send("single-use invitation replay rejected", "POST", "/api/auth/register", Registration(devEmail, code), expected: 400);
        await developer.Login(devEmail, password);
        await admin.Send("invitation cannot select another organization", "POST", "/api/auth/invitations",
            new { email = unusedEmail, organizationId = orgB }, expected: 400);
        var expiredInvite = await admin.Send("issue invitation for expiry test", "POST", "/api/auth/invitations", new { email = unusedEmail });
        await Execute(database, """
            UPDATE invitations SET created_at=CURRENT_TIMESTAMP-interval '2 days',expires_at=CURRENT_TIMESTAMP-interval '1 day'
            WHERE id=@id AND organizationid=@org
            """, ("id", expiredInvite.Json.GetProperty("invitationId").GetGuid()), ("org", orgA));
        await anonymous.Send("expired invitation rejected", "POST", "/api/auth/register",
            Registration(unusedEmail, Text(expiredInvite.Json, "accessCode")), expected: 400);
        var duplicateInvite = await admin.Send("issue existing-email invitation", "POST", "/api/auth/invitations", new { email = devEmail });
        var conflict = await anonymous.Send("duplicate registration returns safe conflict", "POST", "/api/auth/register",
            Registration(devEmail, Text(duplicateInvite.Json, "accessCode")), expected: 409);
        ProbeReport.Check("Failed registration does not consume invitation or expose SQL details",
            !conflict.Json.ToString().Contains("23505") && await Scalar<bool>(database,
                "SELECT consumed_at IS NULL FROM invitations WHERE id=@id AND organizationid=@org",
                ("id", duplicateInvite.Json.GetProperty("invitationId").GetGuid()), ("org", orgA)));

        var project = await admin.Send("assigned project creation", "POST", "/api/auth/projects", Project(orgA, devId));
        var projectId = Text(project.Json, "id");
        var unassigned = await admin.Send("omitted status and empty assignment normalized", "POST", "/api/auth/projects",
            new { name = "Synthetic M3A unassigned", organizationId = orgA, assignedTo = "" });
        var unassignedId = Text(unassigned.Json, "id");
        var otherProject = await other.Send("other organization legitimate project", "POST", "/api/auth/projects", Project(orgB, null));
        var otherProjectId = Text(otherProject.Json, "id");
        var list = await admin.Send("organization list defaults to own tenant", "GET", "/api/auth/projects");
        ProbeReport.Check("Admin list is tenant scoped with normalized defaults", list.Json.GetArrayLength() == 2 &&
            list.Json.EnumerateArray().All(p => Text(p, "organizationId") == orgA && Text(p, "status") == "active") &&
            list.Json.EnumerateArray().Any(p => Text(p, "id") == unassignedId && p.GetProperty("assignedTo").ValueKind == JsonValueKind.Null));
        list = await developer.Send("developer sees assigned projects only", "GET", "/api/auth/projects");
        ProbeReport.Check("Developer cannot list unassigned or foreign projects", list.Json.GetArrayLength() == 1 && Text(list.Json[0], "id") == projectId);
        var assignment = await developer.Send("own assignment read", "GET", "/api/RequestHandler/assigned/" + devId);
        ProbeReport.Check("Assignment read matches created project", assignment.Json.GetArrayLength() == 1 && Text(assignment.Json[0], "id") == projectId);
        await admin.Send("administrator same-tenant assignment read", "GET", "/api/RequestHandler/assigned/" + devId);
        var users = await admin.Send("administrator own user list", "GET", "/api/auth/users");
        ProbeReport.Check("User list excludes other organizations", users.Json.GetArrayLength() == 2 && users.Json.EnumerateArray().All(u => Text(u, "organizationId") == orgA));

        // The exact eleven M2 failure classes, now asserting denial rather than the insecure baseline.
        await anonymous.Send("regression 01 invitation disclosure", "GET", "/api/auth/company-code?organizationId=" + orgA, expected: 401);
        await anonymous.Send("regression 02 profile read", "GET", "/api/auth/profile/" + devId, expected: 401);
        await anonymous.Send("regression 03 profile mutation", "PATCH", "/api/auth/profile/" + devId, new { name = "Synthetic M3A forbidden" }, expected: 401);
        await anonymous.Send("regression 04 user list", "GET", "/api/auth/users?organizationId=" + orgA, expected: 401);
        await anonymous.Send("regression 05 assigned projects", "GET", "/api/RequestHandler/assigned/" + devId, expected: 401);
        await anonymous.Send("regression 06 project list", "GET", "/api/auth/projects?organizationId=" + orgA, expected: 401);
        await anonymous.Send("regression 07 invalid bearer", "GET", "/api/auth/projects?organizationId=" + orgA,
            expected: 401, headers: new() { ["Authorization"] = "Bearer invalid-local-probe" });
        await anonymous.Send("regression 08 project creation", "POST", "/api/auth/projects", Project(orgA, null), expected: 401);
        await anonymous.Send("regression 09 project deletion", "DELETE", "/api/auth/projects/" + unassignedId, expected: 401);
        await other.Send("regression 10 cross-organization profile", "GET", "/api/auth/profile/" + devId, expected: 404);
        await other.Send("regression 11 cross-organization create", "POST", "/api/auth/projects", Project(orgA, null), expected: 403);

        using var malformed = new ApiClient("malformed-cookie", certificate, "__Host-tds.session=not-a-valid-cookie");
        await malformed.Send("malformed credential rejected", "GET", "/api/auth/me", expected: 401);
        var tamperedCookie = Regex.Replace(admin.CookieSnapshot, "(__Host-tds.session=)([^;]+)", match =>
        {
            var value = match.Groups[2].Value;
            var middle = value.Length / 2;
            return match.Groups[1].Value + value[..middle] + (value[middle] == 'A' ? 'B' : 'A') + value[(middle + 1)..];
        });
        using var tampered = new ApiClient("tampered-cookie", certificate, tamperedCookie);
        await tampered.Send("protected credential integrity enforced", "GET", "/api/auth/me", expected: 401);
        await developer.Send("wrong role project creation", "POST", "/api/auth/projects", Project(orgA, null), expected: 403);
        await developer.Send("wrong role project deletion", "DELETE", "/api/auth/projects/" + projectId, expected: 403);
        await developer.Send("wrong role user list", "GET", "/api/auth/users", expected: 403);
        await developer.Send("wrong role invitation issuance", "POST", "/api/auth/invitations", new { email = unusedEmail }, expected: 403);
        await anonymous.Send("anonymous invitation issuance", "POST", "/api/auth/invitations", new { email = unusedEmail }, expected: 401);
        await developer.Send("same-organization other profile concealed", "GET", "/api/auth/profile/" + adminId, expected: 404);
        await developer.Send("other user's assignment concealed", "GET", "/api/RequestHandler/assigned/" + adminId, expected: 404);
        await other.Send("foreign assignment concealed", "GET", "/api/RequestHandler/assigned/" + devId, expected: 404);
        await other.Send("foreign profile modification blocked", "PATCH", "/api/auth/profile/" + devId, new { name = "Synthetic M3A forbidden" }, expected: 404);
        await other.Send("foreign project deletion concealed", "DELETE", "/api/auth/projects/" + projectId, expected: 404);
        await other.Send("foreign project filter forbidden", "GET", "/api/auth/projects?organizationId=" + orgA, expected: 403);
        await other.Send("foreign user filter forbidden", "GET", "/api/auth/users?organizationId=" + orgA, expected: 403);
        await admin.Send("foreign assignee rejected", "POST", "/api/auth/projects", Project(orgA, otherId), expected: 400);
        await other.Send("foreign password selector forbidden", "POST", "/api/auth/change-password?email=" + devEmail,
            new { currentPassword = password, newPassword }, expected: 403);
        await admin.Send("old company code retired", "GET", "/api/auth/company-code?organizationId=" + orgA, expected: 410);
        foreach (var method in new[] { "GET", "POST", "PUT", "PATCH", "DELETE" })
        {
            await anonymous.Send("arbitrary API key is not authentication " + method, method,
                "/api/RequestHandler/projects/" + projectId, expected: 401,
                headers: new() { ["x-api-key"] = "arbitrary-local-probe" });
            await admin.Send("legacy SQL disabled " + method, method, "/api/RequestHandler/projects/" + projectId,
                expected: 410, headers: new() { ["x-api-key"] = "arbitrary-local-probe" });
        }

        await developer.Send("profile change without CSRF blocked", "PATCH", "/api/auth/profile/" + devId,
            new { name = "Synthetic M3A forbidden" }, expected: 400, csrf: false);
        await developer.Send("profile change with invalid CSRF blocked", "PATCH", "/api/auth/profile/" + devId,
            new { name = "Synthetic M3A forbidden" }, expected: 400, csrf: false, headers: new() { ["X-CSRF-TOKEN"] = "invalid" });
        await developer.Send("legitimate own profile update", "PATCH", "/api/auth/profile/" + devId, new { name = "Synthetic M3A updated" });
        var profile = await developer.Send("own profile readback", "GET", "/api/auth/profile/" + devId);
        ProbeReport.Check("Own profile changed and role remained developer", Text(profile.Json, "name") == "Synthetic M3A updated" && Text(profile.Json, "role") == "developer");
        var preflight = await anonymous.Send("allowed HTTPS frontend preflight", "OPTIONS", "/api/auth/projects", expected: 204,
            headers: Cors("https://localhost:3000"));
        ProbeReport.Check("Credentialed CORS grants only configured HTTPS frontend", preflight.AllowedOrigin == "https://localhost:3000" && preflight.CredentialsAllowed);
        preflight = await anonymous.Send("unapproved origin preflight", "OPTIONS", "/api/auth/projects", expected: 204, headers: Cors("https://other.invalid"));
        ProbeReport.Check("Unapproved origin receives no CORS credential grant", preflight.AllowedOrigin is null && !preflight.CredentialsAllowed);

        using var loggedOutReplay = new ApiClient("logged-out-replay", certificate, admin.CookieSnapshot);
        await admin.Send("logout requires CSRF", "POST", "/api/auth/logout", expected: 400, csrf: false);
        await admin.Send("logout revokes server ticket", "POST", "/api/auth/logout", expected: 204);
        await loggedOutReplay.Send("copied pre-logout credential rejected", "GET", "/api/auth/me", expected: 401);
        await admin.Login(emailA, password);
        using var secondDevSession = new ApiClient("second-developer-session", certificate);
        await secondDevSession.Login(devEmail, password);
        using var changedReplay = new ApiClient("password-change-replay", certificate, developer.CookieSnapshot);
        await developer.Send("wrong current password rejected", "POST", "/api/auth/change-password",
            new { currentPassword = newPassword, newPassword }, expected: 401);
        await developer.Send("own password change", "POST", "/api/auth/change-password", new { currentPassword = password, newPassword });
        await changedReplay.Send("copied old session rejected after password change", "GET", "/api/auth/me", expected: 401);
        await secondDevSession.Send("other existing session revoked", "GET", "/api/auth/me", expected: 401);
        await anonymous.Send("old password login rejected", "POST", "/api/auth/login", new { email = devEmail, password }, expected: 401);
        await developer.Login(devEmail, newPassword);
        await admin.Send("legitimate organization project deletion", "DELETE", "/api/auth/projects/" + unassignedId);
        ProbeReport.Check("Legitimate deletion committed", await Scalar<long>(database,
            "SELECT count(*) FROM projects WHERE id=@id AND organizationid=@org", ("id", Guid.Parse(unassignedId)), ("org", orgA)) == 0);
        ProbeReport.Check("All HTTP writes committed with proper tenant/assignment and BCrypt storage", await Scalar<bool>(database, """
            SELECT (SELECT count(*) FROM users WHERE organizationid IN (@a,@b))=3
                AND (SELECT count(*) FROM projects WHERE organizationid IN (@a,@b))=2
                AND EXISTS(SELECT 1 FROM projects WHERE id=@project AND organizationid=@a AND assignedto=@dev)
                AND EXISTS(SELECT 1 FROM users WHERE id=@dev AND organizationid=@a AND name='Synthetic M3A updated'
                    AND length(password)=60 AND left(password,4) IN ('$2a$','$2b$','$2y$'))
                AND EXISTS(SELECT 1 FROM invitations WHERE id=@invite AND consumed_at IS NOT NULL)
            """, ("a", orgA), ("b", orgB), ("project", Guid.Parse(projectId)), ("dev", devId), ("invite", inviteId)));
        await Execute(database, "UPDATE users SET role='developer' WHERE id=@id AND organizationid=@org", ("id", otherId), ("org", orgB));
        await other.Send("DB role change invalidates existing claims", "GET", "/api/auth/users", expected: 401);
        await Execute(database, "UPDATE users SET role='administrator' WHERE id=@id AND organizationid=@org", ("id", otherId), ("org", orgB));
        await other.Login(emailB, password);

        using var expiresClient = new ApiClient("expiry", certificate);
        var expiryLogin = await expiresClient.Login(emailA, password);
        var expiry = expiryLogin.GetProperty("expiresAt").GetDateTimeOffset();
        ProbeReport.Check("Verification uses supported one-minute session setting", expiry > DateTimeOffset.UtcNow && expiry - DateTimeOffset.UtcNow < TimeSpan.FromSeconds(75));
        using var expiryReplay = new ApiClient("expired-cookie-replay", certificate, expiresClient.CookieSnapshot);
        Console.WriteLine("Waiting for real server-side absolute session expiration.");
        await Task.Delay(expiry - DateTimeOffset.UtcNow + TimeSpan.FromSeconds(2));
        await expiryReplay.Send("expired credential rejected by server", "GET", "/api/auth/me", expected: 401);
        await expiresClient.Login(emailA, password);
        await expiresClient.Send("fresh session works after previous expiry", "GET", "/api/auth/me");
        await expiresClient.Send("final session logout", "POST", "/api/auth/logout", expected: 204);
        var limited = false;
        for (var i = 0; i < 31 && !limited; i++)
        {
            var attempt = await anonymous.Send("bounded credential rate-limit check", "POST", "/api/auth/login",
                new { email = unusedEmail, password }, allowed: new[] { 401, 429 });
            limited = attempt.Status == 429;
        }
        ProbeReport.Check("Credential endpoint rate limit enforced", limited);
        ProbeReport.Completed = true;
        Console.WriteLine("Security boundary and legitimate persistence assertions completed.");
        return 0;

        object Registration(string email, string accessCode) => new { name = "Synthetic M3A Developer", email, password, role = "developer", accessCode };
    }
    finally
    {
        try
        {
            await Cleanup(database, run, orgA, orgB);
            ProbeReport.Cleaned = true;
            ProbeReport.OriginalStateRestored = baseline == await LocalDatabase.BusinessFingerprintAsync(database);
            ProbeReport.Check("Original six-table business state restored", ProbeReport.OriginalStateRestored);
        }
        finally { ProbeReport.Save(); Console.WriteLine("Sanitized report: " + Path.Combine(ProbeReport.DirectoryPath, "report.json")); }
    }
}

static string Text(JsonElement json, string property) => json.GetProperty(property).GetString() ?? throw new InvalidOperationException();
static object Project(string org, string? assigned) => new { name = "Synthetic M3A project", description = "Local security verification only.", organizationId = org, assignedTo = assigned, status = "active" };
static Dictionary<string, string> Cors(string origin) => new() { ["Origin"] = origin, ["Access-Control-Request-Method"] = "POST", ["Access-Control-Request-Headers"] = "Content-Type,X-CSRF-TOKEN" };
static async Task<T> Scalar<T>(NpgsqlDataSource database, string sql, params (string, object)[] values)
{
    await using var command = database.CreateCommand(sql);
    foreach (var (key, value) in values) command.Parameters.AddWithValue(key, value);
    return (T)(await command.ExecuteScalarAsync())!;
}
static async Task Execute(NpgsqlDataSource database, string sql, params (string, object)[] values)
{
    await using var command = database.CreateCommand(sql);
    foreach (var (key, value) in values) command.Parameters.AddWithValue(key, value);
    if (await command.ExecuteNonQueryAsync() != 1) throw new InvalidOperationException("Owned fixture mutation failed.");
}
static async Task Cleanup(NpgsqlDataSource database, string run, string a, string b)
{
    if (!Regex.IsMatch(run, "^[a-f0-9]{32}$") || a != "m3a_" + run + "_a" || b != "m3a_" + run + "_b")
        throw new InvalidOperationException("Invalid cleanup scope.");
    await LocalDatabase.ValidateAsync(database);
    await using var connection = await database.OpenConnectionAsync();
    await using var transaction = await connection.BeginTransactionAsync();
    await using var command = new NpgsqlCommand("""
        SELECT NOT EXISTS(SELECT 1 FROM users WHERE organizationid IN (@a,@b)
            AND (email NOT LIKE @email OR name NOT LIKE 'Synthetic M3A%'))
            AND NOT EXISTS(SELECT 1 FROM projects WHERE organizationid IN (@a,@b) AND name NOT LIKE 'Synthetic M3A%')
            AND NOT EXISTS(SELECT 1 FROM invitations WHERE organizationid IN (@a,@b) AND email NOT LIKE @email)
        """, connection, transaction);
    command.Parameters.AddWithValue("a", a);
    command.Parameters.AddWithValue("b", b);
    command.Parameters.AddWithValue("email", "%-" + run + "@example.test");
    if (await command.ExecuteScalarAsync() is not true) throw new InvalidOperationException("Unknown rows; cleanup refused.");
    command.CommandText = """
        DELETE FROM invitations WHERE organizationid IN (@a,@b);
        DELETE FROM projects WHERE organizationid IN (@a,@b);
        DELETE FROM users WHERE organizationid IN (@a,@b);
        DELETE FROM companycodes WHERE organizationid IN (@a,@b) AND code LIKE 'retired_%';
        """;
    var deleted = await command.ExecuteNonQueryAsync();
    await transaction.CommitAsync();
    Console.WriteLine("Run-scoped cleanup committed; removed rows: " + deleted);
}
