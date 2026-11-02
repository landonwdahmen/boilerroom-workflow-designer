using Npgsql;

namespace ZitaDataSystem.Services;

public static class ProjectQueries
{
    public static async Task<List<object>> ListAsync(NpgsqlDataSource database, string organizationId,
        string? assignee, CancellationToken cancellationToken)
    {
        await using var command = database.CreateCommand("""
            SELECT id,name,description,status,assignedto,organizationid FROM projects
            WHERE organizationid=@org
            """ + (assignee is null ? "" : " AND assignedto=@assignee") + " ORDER BY id");
        command.Parameters.AddWithValue("org", organizationId);
        if (assignee is not null) command.Parameters.AddWithValue("assignee", assignee);
        var projects = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            projects.Add(new { id = reader.GetGuid(0), name = reader.GetString(1),
                description = reader.IsDBNull(2) ? null : reader.GetString(2), status = reader.GetString(3),
                assignedTo = reader.IsDBNull(4) ? null : reader.GetString(4), organizationId = reader.GetString(5) });
        return projects;
    }
}
