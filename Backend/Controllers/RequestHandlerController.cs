// Original legacy SQL surface deliberately disabled during October 2026 security modernization.
// The dedicated assignment read remains, using validated session identity and DB organization boundaries.
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using ZitaDataSystem.Services;

namespace ZitaDataSystem.Controllers;

[ApiController, Route("api/RequestHandler")]
public sealed class RequestHandlerController(NpgsqlDataSource database) : SecuredController
{
    [HttpGet("assigned/{userId}")]
    public async Task<IActionResult> Assigned(string userId, CancellationToken cancellationToken)
    {
        if (Current.Role != "administrator" && userId != Current.Id) return NotFound();
        await using var member = database.CreateCommand(
            "SELECT 1 FROM users WHERE id=@id AND organizationid=@org");
        member.Parameters.AddWithValue("id", userId);
        member.Parameters.AddWithValue("org", Current.OrganizationId);
        if (await member.ExecuteScalarAsync(cancellationToken) is null) return NotFound();
        return Ok(await ProjectQueries.ListAsync(database, Current.OrganizationId, userId, cancellationToken));
    }

    [Route("{**endpoint}")]
    [AcceptVerbs("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE")]
    [IgnoreAntiforgeryToken] // Disabled handler never reads a body, executes SQL, or changes state.
    public IActionResult Retired() => StatusCode(410, new { message = "Legacy SQL/API-key endpoints are disabled." });
}
