// October 2026 individual portfolio modernization. Stored designs have no execution path.
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;
using ZitaDataSystem.Services;

namespace ZitaDataSystem.Controllers;

[ApiController, Route("api/auth/projects/{projectId:guid}/graph")]
public sealed class ProjectGraphsController(NpgsqlDataSource database) : SecuredController
{
    [HttpGet, Authorize(Roles = "administrator,developer")]
    public async Task<IActionResult> Read(Guid projectId, CancellationToken cancellationToken)
    {
        await using var command = database.CreateCommand("""
            SELECT g.revision,g.document::text,g.created_at,g.updated_at FROM projects p
            LEFT JOIN project_graphs g ON g.project_id=p.id
            WHERE p.id=@id AND p.organizationid=@org AND (@admin OR p.assignedto=@user)
            """);
        Scope(command, projectId);
        command.Parameters.AddWithValue("admin", Current.Role == "administrator");
        command.Parameters.AddWithValue("user", Current.Id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound();
        if (reader.IsDBNull(0))
        {
            using var empty = JsonDocument.Parse(GraphDocument.Empty);
            return Ok(new { projectId, revision = 0L, createdAt = (DateTime?)null,
                updatedAt = (DateTime?)null, graph = empty.RootElement.Clone() });
        }
        using var document = JsonDocument.Parse(reader.GetString(1));
        if (!GraphDocument.Valid(document.RootElement)) return StatusCode(500, new { message = "Stored graph is unsupported or invalid." });
        return Ok(new { projectId, revision = reader.GetInt64(0), createdAt = reader.GetDateTime(2),
            updatedAt = reader.GetDateTime(3), graph = document.RootElement.Clone() });
    }

    [HttpPut, Authorize(Roles = "administrator")]
    public async Task<IActionResult> Save(Guid projectId, [FromBody] JsonElement request, CancellationToken cancellationToken)
    {
        if (request.ValueKind == JsonValueKind.Object && request.TryGetProperty("graph", out var candidate) &&
            System.Text.Encoding.UTF8.GetByteCount(candidate.GetRawText()) > GraphDocument.MaxBytes)
            return StatusCode(413, new { message = "Graph exceeds the 12 KiB limit." });
        if (!GraphDocument.Save(request, out var expected, out var graph))
            return BadRequest(new { message = "Invalid graph. Check the documented schema, limits and design-only fields." });
        await using var connection = await database.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        // Prevent project deletion/assignment changes during this save, without serializing graph writers.
        await using (var project = new NpgsqlCommand("SELECT id FROM projects WHERE id=@id AND organizationid=@org FOR KEY SHARE", connection, transaction))
        {
            Scope(project, projectId);
            if (await project.ExecuteScalarAsync(cancellationToken) is null) return NotFound();
        }
        await using var command = new NpgsqlCommand(expected == 0 ? """
            INSERT INTO project_graphs(project_id,schema_version,revision,document)
            SELECT p.id,1,1,@document FROM projects p WHERE p.id=@id AND p.organizationid=@org
            ON CONFLICT(project_id) DO NOTHING
            RETURNING revision,created_at,updated_at
            """ : """
            UPDATE project_graphs g SET document=@document,revision=g.revision+1,updated_at=clock_timestamp()
            FROM projects p WHERE g.project_id=p.id AND p.id=@id AND p.organizationid=@org AND g.revision=@expected
            RETURNING g.revision,g.created_at,g.updated_at
            """, connection, transaction);
        Scope(command, projectId);
        command.Parameters.AddWithValue("expected", expected);
        command.Parameters.AddWithValue("document", NpgsqlDbType.Jsonb, graph.GetRawText());
        long revision; DateTime createdAt; DateTime updatedAt;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken)) return Conflict(new { message = "Graph changed. Preserve your draft and reload the saved graph before editing again." });
            revision = reader.GetInt64(0); createdAt = reader.GetDateTime(1); updatedAt = reader.GetDateTime(2);
        }
        await transaction.CommitAsync(cancellationToken);
        return Ok(new { projectId, revision, createdAt, updatedAt, graph = graph.Clone() });
    }

    private void Scope(NpgsqlCommand command, Guid projectId)
    {
        command.Parameters.AddWithValue("id", projectId);
        command.Parameters.AddWithValue("org", Current.OrganizationId);
    }
}
