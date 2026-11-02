// Recovery for interrupted verification only. Caller first verifies Docker resource ownership with shared guards.
using System.Text.Json;
using System.Text.RegularExpressions;
using Npgsql;
using PortfolioTools;

static class GraphProbeRecovery
{
    public static async Task<int> Cleanup(string run)
    {
        if (!Regex.IsMatch(run, "^[a-f0-9]{32}$")) throw new InvalidOperationException();
        var directory = Path.Combine(".local", "graph-probe", run);
        using var report = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory, "report.json")));
        if (report.RootElement.GetProperty("Run").GetString() != run) throw new InvalidOperationException();
        await using var database = LocalDatabase.CreateSource();
        await LocalDatabase.ValidateAsync(database);
        await using var connection = await database.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        var organizations = new List<string>();
        await using (var find = new NpgsqlCommand("""
            SELECT organizationid FROM companycodes WHERE organizationid=@a OR organizationid IN
                (SELECT organizationid FROM users WHERE email=@email AND name='Synthetic M4B Administrator' AND role='administrator')
            """, connection, transaction))
        {
            find.Parameters.AddWithValue("a", "org_" + run);
            find.Parameters.AddWithValue("email", "graph-other-" + run + "@example.test");
            await using var reader = await find.ExecuteReaderAsync();
            while (await reader.ReadAsync()) organizations.Add(reader.GetString(0));
        }
        if (organizations.Count > 2 || organizations.Any(org => !Regex.IsMatch(org, "^org_[a-f0-9]{32}$"))) throw new InvalidOperationException();
        await using var command = new NpgsqlCommand("""
            SELECT NOT EXISTS(SELECT 1 FROM users WHERE organizationid=ANY(@orgs) AND (email NOT LIKE @pattern OR name NOT LIKE 'Synthetic M4B%'))
                AND NOT EXISTS(SELECT 1 FROM projects WHERE organizationid=ANY(@orgs) AND name NOT LIKE 'Synthetic M4B%')
                AND NOT EXISTS(SELECT 1 FROM invitations WHERE organizationid=ANY(@orgs) AND email NOT LIKE @pattern)
                AND NOT EXISTS(SELECT 1 FROM companycodes WHERE organizationid=ANY(@orgs) AND code NOT LIKE 'retired_%')
            """, connection, transaction);
        command.Parameters.AddWithValue("orgs", organizations.ToArray());
        command.Parameters.AddWithValue("pattern", "graph-%-" + run + "@example.test");
        if (await command.ExecuteScalarAsync() is not true) throw new InvalidOperationException("Unknown rows; recovery refused.");
        const string fingerprint = """
            SELECT md5(concat(
                (SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY id)::text,'[]') FROM users u WHERE organizationid IS NULL OR NOT organizationid=ANY(@orgs)),
                (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]') FROM projects p WHERE NOT organizationid=ANY(@orgs)),
                (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY organizationid)::text,'[]') FROM companycodes c WHERE NOT organizationid=ANY(@orgs)),
                (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY text)::text,'[]') FROM test t),
                (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY id)::text,'[]') FROM invitations i WHERE NOT organizationid=ANY(@orgs)),
                (SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY project_id)::text,'[]') FROM project_graphs g JOIN projects p ON p.id=g.project_id WHERE NOT p.organizationid=ANY(@orgs))))
            """;
        command.CommandText = fingerprint;
        var before = (string)(await command.ExecuteScalarAsync())!;
        command.CommandText = """
            DELETE FROM invitations WHERE organizationid=ANY(@orgs);
            DELETE FROM projects WHERE organizationid=ANY(@orgs);
            DELETE FROM users WHERE organizationid=ANY(@orgs);
            DELETE FROM companycodes WHERE organizationid=ANY(@orgs) AND code LIKE 'retired_%';
            """;
        var deleted = await command.ExecuteNonQueryAsync();
        command.CommandText = fingerprint;
        var preserved = before == (string)(await command.ExecuteScalarAsync())!;
        if (!preserved) throw new InvalidOperationException("Other-row fingerprint mismatch; recovery rolled back.");
        await transaction.CommitAsync();
        File.WriteAllText(Path.Combine(directory, "recovery.json"), JsonSerializer.Serialize(new {
            Run = run, Cleaned = true, DeletedRows = deleted, OtherBusinessRowsPreserved = preserved,
            OriginalProbeCompleted = report.RootElement.GetProperty("Completed").GetBoolean()
        }, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine("Owned verification records cleaned; other business rows preserved. Original probe outcome is unchanged.");
        return 0;
    }
}
