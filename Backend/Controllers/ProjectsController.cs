// October 2026: restrict the recovered delete route to the validated administrator's organization.
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace ZitaDataSystem.Controllers;

[ApiController, Route("api/auth/projects"), Authorize(Roles = "administrator")]
public sealed class ProjectsController(NpgsqlDataSource database) : SecuredController
{
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var projectId)) return BadRequest(new { message = "Invalid project ID." });
        await using var command = database.CreateCommand("DELETE FROM projects WHERE id=@id AND organizationid=@org");
        command.Parameters.AddWithValue("id", projectId);
        command.Parameters.AddWithValue("org", Current.OrganizationId);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 0 ? NotFound() :
            Ok(new { message = "Project deleted successfully." });
    }
}
