// Local operator/test tooling only; never exposed through the API.
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Npgsql;
using ZitaDataSystem.Services;

namespace PortfolioTools;

public static class LocalDatabase
{
    public static NpgsqlDataSource CreateSource()
    {
        if (!File.Exists("compose.yaml") || !File.Exists("Backend/ZitaDataSystem.csproj"))
            throw new InvalidOperationException("Run at the project root.");
        var settings = new Dictionary<string, string>();
        foreach (var line in File.ReadAllLines(".env"))
        {
            if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#')) continue;
            var pair = line.Split('=', 2);
            if (pair.Length != 2 || !settings.TryAdd(pair[0], pair[1])) throw new InvalidOperationException("Invalid local configuration.");
        }
        foreach (var key in new[] { "POSTGRES_DB", "TDS_APP_DB_USER" })
            if (!Regex.IsMatch(settings[key], "^[a-z_][a-z0-9_]{0,62}$")) throw new InvalidOperationException("Invalid local identifier.");
        if (!Regex.IsMatch(settings["TDS_APP_DB_PASSWORD"], "^[a-fA-F0-9]{64}$") ||
            !int.TryParse(settings["TDS_POSTGRES_PORT"], out var port) || port is < 1024 or > 65535)
            throw new InvalidOperationException("Invalid local configuration.");
        return NpgsqlDataSource.Create(new NpgsqlConnectionStringBuilder
        {
            Host = "127.0.0.1", Port = port, Database = settings["POSTGRES_DB"], Username = settings["TDS_APP_DB_USER"],
            Password = settings["TDS_APP_DB_PASSWORD"], IncludeErrorDetail = false, Timeout = 5, CommandTimeout = 10,
            SslMode = SslMode.Disable
        }.ConnectionString);
    }

    public static async Task ValidateAsync(NpgsqlDataSource database)
    {
        await using var command = database.CreateCommand("""
            SELECT EXISTS(SELECT 1 FROM portfolio_schema_versions WHERE version=1
                AND project_key='boilerroom-tds-portfolio-local-v1')
                AND EXISTS(SELECT 1 FROM portfolio_schema_versions WHERE version=2
                AND project_key='boilerroom-tds-portfolio-auth-v2')
                AND EXISTS(SELECT 1 FROM portfolio_schema_versions WHERE version=3
                AND project_key='boilerroom-tds-portfolio-graphs-v3')
                AND NOT (SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname=current_user)
            """);
        if (await command.ExecuteScalarAsync() is not true) throw new InvalidOperationException("Local DB identity/privilege check failed.");
    }

    public static async Task<string> ProvisionAdministratorAsync(NpgsqlDataSource database, string organizationId,
        string organizationName, string name, string email, string password)
    {
        if (!Regex.IsMatch(organizationId, "^(org_[a-f0-9]{32}|m3a_[a-f0-9]{32}_[ab])$") ||
            string.IsNullOrWhiteSpace(name) || name.Length > 100 || string.IsNullOrWhiteSpace(organizationName) ||
            organizationName.Length > 200 || !new EmailAddressAttribute().IsValid(email) || email.Length > 254 ||
            !email.EndsWith("@example.test", StringComparison.OrdinalIgnoreCase) || !AuthService.PasswordAllowed(password, true))
            throw new InvalidOperationException("Use valid synthetic example.test identities and a 12-72 UTF-8 byte password.");
        await ValidateAsync(database);
        await using var connection = await database.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await using (var company = new NpgsqlCommand(
            "INSERT INTO companycodes(organizationid,code) VALUES(@org,@retired)", connection, transaction))
        {
            company.Parameters.AddWithValue("org", organizationId);
            company.Parameters.AddWithValue("retired", "retired_" + Guid.NewGuid().ToString("N"));
            await company.ExecuteNonQueryAsync();
        }
        var id = Guid.NewGuid().ToString();
        await using (var user = new NpgsqlCommand("""
            INSERT INTO users(id,name,email,password,role,organizationid,organizationname)
            VALUES(@id,@name,@email,@password,'administrator',@org,@orgName)
            """, connection, transaction))
        {
            user.Parameters.AddWithValue("id", id);
            user.Parameters.AddWithValue("name", name.Trim());
            user.Parameters.AddWithValue("email", email.Trim().ToLowerInvariant());
            user.Parameters.AddWithValue("password", BCrypt.Net.BCrypt.HashPassword(password, 12));
            user.Parameters.AddWithValue("org", organizationId);
            user.Parameters.AddWithValue("orgName", organizationName.Trim());
            await user.ExecuteNonQueryAsync();
        }
        await transaction.CommitAsync();
        return id;
    }

    public static async Task<string> BusinessFingerprintAsync(NpgsqlDataSource database)
    {
        await using var command = database.CreateCommand("""
            SELECT md5(concat(
                (SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY id)::text,'[]') FROM users u),
                (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]') FROM projects p),
                (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY organizationid)::text,'[]') FROM companycodes c),
                (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY text)::text,'[]') FROM test t),
                (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY id)::text,'[]') FROM invitations i),
                (SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY project_id)::text,'[]') FROM project_graphs g)))
            """);
        return (string)(await command.ExecuteScalarAsync())!;
    }
}
