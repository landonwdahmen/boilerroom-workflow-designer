using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using ZitaDataSystem.Controllers;
using ZitaDataSystem.Services;

namespace BoilerRoom.Tests;

// Controller/SQL integration, NOT middleware or real TLS verification (covered by existing probes).
[Trait("Category", "Database")]
public sealed class DatabaseTests : IAsyncLifetime
{
    private NpgsqlDataSource database = null!;
    private readonly string org = "m6a_" + Guid.NewGuid().ToString("N");
    private readonly string foreign = "m6a_" + Guid.NewGuid().ToString("N");
    private readonly string developer = Guid.NewGuid().ToString();
    private readonly Guid project = Guid.NewGuid();
    private readonly Guid foreignProject = Guid.NewGuid();
    private bool identityVerified;

    public async Task InitializeAsync()
    {
        var raw = Environment.GetEnvironmentVariable("TDS_M6A_CONNECTION");
        if (string.IsNullOrEmpty(raw)) throw new InvalidOperationException("Use scripts/Test-IsolatedDatabase.ps1 -Suite Database; no development DB fallback.");
        var settings = new NpgsqlConnectionStringBuilder(raw);
        if (settings.Host != "127.0.0.1" || settings.Port != 55433 || settings.Database != "tds_m6a_test" || settings.Username != "app_m6a")
            throw new InvalidOperationException("Isolated test database identity mismatch.");
        database = NpgsqlDataSource.Create(raw);
        Assert.True(await Scalar<bool>("""
            SELECT current_database()='tds_m6a_test'
            AND (SELECT scope='isolated-synthetic-tests' FROM m6a_test_identity)
            AND (SELECT count(*)=3 FROM portfolio_schema_versions WHERE version IN (1,2,3))
            AND NOT (SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname=current_user)
            """));
        identityVerified = true;
        await Execute("INSERT INTO companycodes(organizationid,code) VALUES(@org,@org),(@foreign,@foreign)");
        await Execute("""
            INSERT INTO users(id,name,email,password,role,organizationid)
            VALUES(@dev,'Synthetic M6A Developer',@email,'non-login-test-sentinel','developer',@org);
            INSERT INTO projects(id,name,organizationid,assignedto,status)
            VALUES(@id,'Synthetic M6A Project',@org,@dev,'active'),
                  (@other,'Synthetic M6A Foreign Project',@foreign,NULL,'active')
            """);
    }

    private T Controller<T>(T controller, string organization, string role = "administrator", string user = "synthetic-admin") where T : ControllerBase
    {
        var account = new Account(user, "Synthetic", "user@example.test", role, organization, null, "test-sentinel");
        var context = new DefaultHttpContext { User = AuthService.Principal(account) };
        context.Items[typeof(Account)] = account;
        controller.ControllerContext = new ControllerContext { HttpContext = context };
        return controller;
    }
    private ProjectGraphsController Graph(string? organization = null, string role = "administrator", string user = "synthetic-admin") =>
        Controller(new ProjectGraphsController(database), organization ?? org, role, user);
    private static JsonElement Save(long revision) => JsonDocument.Parse($"{{\"expectedRevision\":{revision},\"graph\":{GraphDocument.Empty}}}").RootElement.Clone();

    [Fact]
    public async Task Initial_and_update_races_have_exactly_one_winner_and_persist_across_connections()
    {
        var first = await Task.WhenAll(Graph().Save(project, Save(0), default), Graph().Save(project, Save(0), default));
        Assert.Single(first.OfType<OkObjectResult>());
        Assert.Single(first.OfType<ConflictObjectResult>());
        var second = await Task.WhenAll(Graph().Save(project, Save(1), default), Graph().Save(project, Save(1), default));
        Assert.Single(second.OfType<OkObjectResult>());
        Assert.Single(second.OfType<ConflictObjectResult>());
        Assert.IsType<ConflictObjectResult>(await Graph().Save(project, Save(1), default));
        // A new physical connection observes committed state, independent of the writer pool.
        // DataSource.ConnectionString intentionally strips its password after opening.
        await using var connection = new NpgsqlConnection(Environment.GetEnvironmentVariable("TDS_M6A_CONNECTION"));
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT revision FROM project_graphs WHERE project_id=@id", connection);
        command.Parameters.AddWithValue("id", project);
        Assert.Equal(2L, await command.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Reads_enforce_organization_and_current_assignment()
    {
        Assert.IsType<OkObjectResult>(await Graph(role: "developer", user: developer).Read(project, default));
        Assert.IsType<NotFoundResult>(await Graph(role: "developer", user: "unassigned").Read(project, default));
        Assert.IsType<NotFoundResult>(await Graph(foreign).Read(project, default));
        Assert.IsType<NotFoundResult>(await Graph().Read(foreignProject, default));
        Assert.IsType<NotFoundResult>(await Graph(foreign).Save(project, Save(0), default));
        await Execute("UPDATE projects SET assignedto=NULL WHERE id=@id");
        Assert.IsType<NotFoundResult>(await Graph(role: "developer", user: developer).Read(project, default));
    }

    [Fact]
    public async Task Delete_is_tenant_scoped_and_cascades_graph_only_for_owned_project()
    {
        Assert.IsType<OkObjectResult>(await Graph().Save(project, Save(0), default));
        var controller = Controller(new ProjectsController(database), org);
        Assert.IsType<BadRequestObjectResult>(await controller.Delete("invalid", default));
        Assert.IsType<NotFoundResult>(await controller.Delete(foreignProject.ToString(), default));
        Assert.IsType<OkObjectResult>(await controller.Delete(project.ToString(), default));
        Assert.False(await Scalar<bool>("SELECT EXISTS(SELECT 1 FROM project_graphs WHERE project_id=@id)"));
        Assert.True(await Scalar<bool>("SELECT EXISTS(SELECT 1 FROM projects WHERE id=@other)"));
    }

    [Fact]
    public async Task Database_account_lookup_revalidates_role_and_organization_membership()
    {
        var auth = new AuthService(database);
        var account = await auth.FindAsync(developer, false, default);
        Assert.NotNull(account);
        Assert.Equal(org, account.OrganizationId);
        Assert.Equal("developer", account.Role);
        Assert.Null(await auth.AuthenticateAsync(developer + "@example.test", "incorrect synthetic password", default));
        Assert.Null(await auth.FindAsync("absent", false, default));
    }

    [Fact]
    public async Task Foreign_organization_assignment_is_rejected_by_database()
    {
        var exception = await Assert.ThrowsAsync<PostgresException>(() => Execute("UPDATE projects SET assignedto=@dev WHERE id=@other"));
        Assert.Equal("23503", exception.SqlState);
        Assert.True(await Scalar<bool>("SELECT assignedto IS NULL FROM projects WHERE id=@other"));
    }

    [Fact]
    public async Task Invalid_graph_is_rejected_before_persistence()
    {
        var invalid = JsonDocument.Parse("{\"expectedRevision\":0,\"graph\":{\"schemaVersion\":2,\"nodes\":[],\"edges\":[]}}").RootElement.Clone();
        Assert.IsType<BadRequestObjectResult>(await Graph().Save(project, invalid, default));
        Assert.False(await Scalar<bool>("SELECT EXISTS(SELECT 1 FROM project_graphs WHERE project_id=@id)"));
    }

    private NpgsqlCommand Command(string sql)
    {
        var command = database.CreateCommand(sql);
        command.Parameters.AddWithValue("org", org); command.Parameters.AddWithValue("foreign", foreign);
        command.Parameters.AddWithValue("dev", developer); command.Parameters.AddWithValue("email", developer + "@example.test");
        command.Parameters.AddWithValue("id", project); command.Parameters.AddWithValue("other", foreignProject);
        return command;
    }
    private async Task Execute(string sql) { await using var command = Command(sql); await command.ExecuteNonQueryAsync(); }
    private async Task<T> Scalar<T>(string sql) { await using var command = Command(sql); return (T)(await command.ExecuteScalarAsync())!; }
    public async Task DisposeAsync()
    {
        if (database is null) return;
        try { if (identityVerified) await Execute("DELETE FROM projects WHERE organizationid IN (@org,@foreign); DELETE FROM users WHERE organizationid IN (@org,@foreign); DELETE FROM companycodes WHERE organizationid IN (@org,@foreign)"); }
        finally { await database.DisposeAsync(); }
    }
}
