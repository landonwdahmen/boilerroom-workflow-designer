// October 2026 browser-test fixture. PRIVATE stdio protocol to browser-workflows.cjs only.
// Never run with stdout inherited/printed: initial credentials travel only through the parent's pipe.
using System.Security.Cryptography;
using System.Text.Json;
using Npgsql;
using PortfolioTools;

if (args.Length != 1 || args[0] != "--browser-fixture-stdio" || !Console.IsInputRedirected || !Console.IsOutputRedirected) return 2;
try { return await Run(); }
catch { Console.Error.WriteLine("Browser fixture failed; sensitive details withheld."); return 1; }

static async Task<int> Run()
{
    await using var database = LocalDatabase.CreateSource();
    await LocalDatabase.ValidateAsync(database);
    var baseline = await LocalDatabase.BusinessFingerprintAsync(database);
    var run = Guid.NewGuid().ToString("N");
    var a = "org_" + run;
    var b = "org_" + Guid.NewGuid().ToString("N");
    var password = " " + Convert.ToHexString(RandomNumberGenerator.GetBytes(16)) + "Aa! ";
    var newPassword = " " + Convert.ToHexString(RandomNumberGenerator.GetBytes(16)) + "Bb! ";
    var emailA = "browser-admin-a-" + run + "@example.test";
    var emailB = "browser-admin-b-" + run + "@example.test";
    var devEmail = "browser-developer-" + run + "@example.test";
    try
    {
        var adminId = await LocalDatabase.ProvisionAdministratorAsync(database, a, "Synthetic M3B Organization A",
            "Synthetic M3B Administrator A", emailA, password);
        var otherId = await LocalDatabase.ProvisionAdministratorAsync(database, b, "Synthetic M3B Organization B",
            "Synthetic M3B Administrator B", emailB, password);
        // This line is consumed privately by Node, never forwarded to terminal or report.
        Reply(new { run, a, b, adminId, otherId, emailA, emailB, devEmail, password, newPassword });
        string? command;
        while ((command = await Console.In.ReadLineAsync()) is not null)
        {
            if (command == "cleanup") break;
            if (command == "expire")
            {
                await using var expire = database.CreateCommand("""
                    UPDATE invitations SET created_at=CURRENT_TIMESTAMP-interval '2 days',
                        expires_at=CURRENT_TIMESTAMP-interval '1 second'
                    WHERE organizationid=@a AND email=@email AND consumed_at IS NULL
                    """);
                expire.Parameters.AddWithValue("a", a);
                expire.Parameters.AddWithValue("email", "browser-expired-" + run + "@example.test");
                Reply(new { expired = await expire.ExecuteNonQueryAsync() == 1 });
            }
            else if (command == "verify")
            {
                await using var verify = database.CreateCommand("""
                    SELECT EXISTS(SELECT 1 FROM users WHERE email=@dev AND organizationid=@a
                        AND name='Synthetic M3B Developer Updated' AND role='developer'),
                        EXISTS(SELECT 1 FROM projects p JOIN users u ON u.id=p.assignedto AND u.organizationid=p.organizationid
                            WHERE p.organizationid=@a AND p.name='Synthetic M3B Assigned' AND p.status='active' AND u.email=@dev),
                        NOT EXISTS(SELECT 1 FROM projects WHERE organizationid=@a AND name='Synthetic M3B Unassigned'),
                        EXISTS(SELECT 1 FROM invitations WHERE organizationid=@a AND email=@dev AND consumed_at IS NOT NULL),
                        EXISTS(SELECT 1 FROM invitations WHERE organizationid=@a AND email=@dev AND consumed_at IS NULL),
                        (SELECT password FROM users WHERE email=@dev AND organizationid=@a)
                    """);
                verify.Parameters.AddWithValue("a", a); verify.Parameters.AddWithValue("dev", devEmail);
                await using var reader = await verify.ExecuteReaderAsync();
                await reader.ReadAsync();
                var changed = !reader.IsDBNull(5) && BCrypt.Net.BCrypt.Verify(newPassword, reader.GetString(5));
                Reply(new { profile = reader.GetBoolean(0), assignment = reader.GetBoolean(1), deletion = reader.GetBoolean(2),
                    consumedInvitation = reader.GetBoolean(3), duplicateInvitationUnconsumed = reader.GetBoolean(4), passwordChanged = changed });
            }
            else throw new InvalidOperationException("Unknown fixture command.");
        }
    }
    finally
    {
        await LocalDatabase.ValidateAsync(database);
        await using var connection = await database.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await using var cleanup = new NpgsqlCommand("""
            SELECT NOT EXISTS(SELECT 1 FROM users WHERE organizationid IN (@a,@b)
                    AND (email NOT LIKE @email OR name NOT LIKE 'Synthetic M3B%'))
                AND NOT EXISTS(SELECT 1 FROM projects WHERE organizationid IN (@a,@b) AND name NOT LIKE 'Synthetic M3B%')
                AND NOT EXISTS(SELECT 1 FROM invitations WHERE organizationid IN (@a,@b) AND email NOT LIKE @email)
                AND NOT EXISTS(SELECT 1 FROM companycodes WHERE organizationid IN (@a,@b) AND code NOT LIKE 'retired_%')
            """, connection, transaction);
        cleanup.Parameters.AddWithValue("a", a); cleanup.Parameters.AddWithValue("b", b);
        cleanup.Parameters.AddWithValue("email", "browser-%-" + run + "@example.test");
        if (await cleanup.ExecuteScalarAsync() is not true) throw new InvalidOperationException("Unknown rows; cleanup refused.");
        cleanup.CommandText = """
            DELETE FROM invitations WHERE organizationid IN (@a,@b);
            DELETE FROM projects WHERE organizationid IN (@a,@b);
            DELETE FROM users WHERE organizationid IN (@a,@b);
            DELETE FROM companycodes WHERE organizationid IN (@a,@b) AND code LIKE 'retired_%';
            """;
        var deleted = await cleanup.ExecuteNonQueryAsync();
        await transaction.CommitAsync();
        var restored = baseline == await LocalDatabase.BusinessFingerprintAsync(database);
        Reply(new { cleaned = true, deleted, originalStateRestored = restored });
        if (!restored) throw new InvalidOperationException("Original state mismatch.");
    }
    return 0;
}
static void Reply(object value) => Console.WriteLine(JsonSerializer.Serialize(value));
