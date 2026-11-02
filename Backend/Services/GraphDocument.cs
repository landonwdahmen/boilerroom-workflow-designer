// October 2026: bounded declarative documents. This validator never interprets or executes node data.
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ZitaDataSystem.Services;

public static class GraphDocument
{
    public const int MaxBytes = 12 * 1024;
    public const long MaxRevision = 9007199254740991; // Exact in JavaScript as well as PostgreSQL.
    public const string Empty = "{\"schemaVersion\":1,\"nodes\":[],\"edges\":[]}";
    private static readonly string[] Methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    private static readonly Dictionary<string, string[]> Fields = new()
    {
        ["apiTrigger"] = ["label", "path", "method"],
        ["httpRequest"] = ["label", "url", "method", "headers"],
        ["databaseQuery"] = ["label"], ["customLogic"] = ["label"],
        ["sendResponse"] = ["label", "statusCode", "headers"],
        ["sqlTable"] = ["label", "tableName", "columns"]
    };

    public static bool Save(JsonElement request, out long expectedRevision, out JsonElement graph)
    {
        expectedRevision = 0; graph = default;
        return Object(request, "expectedRevision", "graph") && request.TryGetProperty("expectedRevision", out var revision)
            && revision.ValueKind == JsonValueKind.Number && revision.TryGetInt64(out expectedRevision) && expectedRevision is >= 0 and < MaxRevision
            && request.TryGetProperty("graph", out graph) && Valid(graph);
    }

    public static bool Valid(JsonElement graph)
    {
        try
        {
            if (JsonSerializer.SerializeToUtf8Bytes(graph).Length > MaxBytes || !Depth(graph, 0) ||
                !Object(graph, "schemaVersion", "nodes", "edges") || !graph.TryGetProperty("schemaVersion", out var version) ||
                !version.TryGetInt32(out var schema) || schema != 1 ||
                !graph.TryGetProperty("nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array || nodes.GetArrayLength() > 100 ||
                !graph.TryGetProperty("edges", out var edges) || edges.ValueKind != JsonValueKind.Array || edges.GetArrayLength() > 200) return false;
            var types = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var node in nodes.EnumerateArray())
            {
                if (!Object(node, "id", "type", "position", "data") || !Id(node, "id", out var id) ||
                    !Text(node, "type", 40, out var type) || !Fields.TryGetValue(type, out var fields) || !types.TryAdd(id, type) ||
                    !node.TryGetProperty("position", out var position) || !Object(position, "x", "y") ||
                    !Coordinate(position, "x") || !Coordinate(position, "y") || !node.TryGetProperty("data", out var data) ||
                    !Object(data, fields) || !Text(data, "label", 100, out _) ||
                    data.EnumerateObject().Any(p => p.Value.ValueKind != JsonValueKind.String || p.Value.GetString()!.Length > 4096)) return false;
                if (type == "apiTrigger" && (!Text(data, "path", 4096, out var path) || !path.StartsWith('/') ||
                    path.Contains('?') || path.Contains('#') || !Method(data))) return false;
                if (type == "httpRequest" && (!Text(data, "url", 4096, out var url) ||
                    !Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") ||
                    !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) || !Method(data))) return false;
                if (type is "httpRequest" or "sendResponse" && !Headers(data)) return false;
                if (type == "sendResponse" && (!Text(data, "statusCode", 3, out var status) || !Regex.IsMatch(status, "^[1-5][0-9]{2}$"))) return false;
                if (type == "sqlTable" && (!Text(data, "tableName", 63, out var table) || !Identifier(table) || !Columns(data))) return false;
            }
            var edgeIds = new HashSet<string>(StringComparer.Ordinal);
            var pairs = new HashSet<(string, string)>();
            var adjacency = types.Keys.ToDictionary(id => id, _ => new List<string>(), StringComparer.Ordinal);
            foreach (var edge in edges.EnumerateArray())
            {
                if (!Object(edge, "id", "source", "target", "sourceHandle", "targetHandle", "type") ||
                    !Id(edge, "id", out var id) || !edgeIds.Add(id) || !Id(edge, "source", out var source) ||
                    !Id(edge, "target", out var target) || source == target || !pairs.Add((source, target)) ||
                    !types.ContainsKey(source) || !types.ContainsKey(target) || types[source] == "sendResponse" || types[target] == "apiTrigger" ||
                    !Literal(edge, "sourceHandle", "out") || !Literal(edge, "targetHandle", "in") || !Literal(edge, "type", "default")) return false;
                adjacency[source].Add(target);
            }
            var visiting = new HashSet<string>(); var visited = new HashSet<string>();
            bool Acyclic(string id)
            {
                if (visiting.Contains(id)) return false;
                if (visited.Contains(id)) return true;
                visiting.Add(id);
                foreach (var target in adjacency[id]) if (!Acyclic(target)) return false;
                visiting.Remove(id); visited.Add(id); return true;
            }
            return types.Keys.All(Acyclic);
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException or FormatException) { return false; }
    }

    // Unique property names and explicit allowlists, including objects embedded in JSON text fields.
    private static bool Object(JsonElement value, params string[] allowed) => value.ValueKind == JsonValueKind.Object &&
        value.EnumerateObject().All(p => allowed.Contains(p.Name, StringComparer.Ordinal)) &&
        value.EnumerateObject().Select(p => p.Name).Distinct(StringComparer.Ordinal).Count() == value.EnumerateObject().Count();
    private static bool Depth(JsonElement value, int depth) => depth <= 16 && (value.ValueKind switch
    {
        JsonValueKind.Object => value.EnumerateObject().All(p => Depth(p.Value, depth + 1)),
        JsonValueKind.Array => value.EnumerateArray().All(p => Depth(p, depth + 1)), _ => true
    });
    private static bool Text(JsonElement parent, string name, int max, out string text)
    {
        text = "";
        if (!parent.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String) return false;
        text = value.GetString()!;
        return !string.IsNullOrWhiteSpace(text) && text.Length <= max && !text.Any(char.IsControl);
    }
    private static bool Id(JsonElement value, string name, out string id) => Text(value, name, 100, out id) && Regex.IsMatch(id, "^[A-Za-z0-9_-]+$");
    private static bool Identifier(string value) => Regex.IsMatch(value, "^[A-Za-z_][A-Za-z0-9_]{0,62}$");
    private static bool Literal(JsonElement value, string name, string expected) => Text(value, name, 100, out var text) && text == expected;
    private static bool Method(JsonElement value) => Text(value, "method", 6, out var method) && Methods.Contains(method);
    private static bool Coordinate(JsonElement value, string name) => value.TryGetProperty(name, out var coordinate) &&
        coordinate.ValueKind == JsonValueKind.Number && coordinate.TryGetDouble(out var number) && double.IsFinite(number) && Math.Abs(number) <= 100000;
    private static bool Headers(JsonElement data)
    {
        if (!data.TryGetProperty("headers", out var value) || value.GetString() == "") return true;
        using var document = JsonDocument.Parse(value.GetString()!, new JsonDocumentOptions { MaxDepth = 16 });
        var root = document.RootElement;
        return Object(root, "Accept", "Content-Type") && root.EnumerateObject().All(p => p.Value.ValueKind == JsonValueKind.String &&
            p.Value.GetString() is "application/json" or "text/plain" or "application/octet-stream");
    }
    private static bool Columns(JsonElement data)
    {
        if (!data.TryGetProperty("columns", out var value) || value.ValueKind != JsonValueKind.String) return false;
        using var document = JsonDocument.Parse(value.GetString()!, new JsonDocumentOptions { MaxDepth = 16 });
        var columns = document.RootElement; var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (columns.ValueKind != JsonValueKind.Array || columns.GetArrayLength() is < 1 or > 50) return false;
        foreach (var column in columns.EnumerateArray())
        {
            if (!Object(column, "name", "type", "length", "primaryKey", "autoIncrement", "notNull") ||
                !Text(column, "name", 63, out var name) || !Identifier(name) || !names.Add(name) ||
                !Text(column, "type", 20, out var type) || !new[] { "INTEGER", "TEXT", "VARCHAR", "BOOLEAN", "UUID", "TIMESTAMP", "NUMERIC" }.Contains(type)) return false;
            foreach (var property in column.EnumerateObject())
            {
                if (property.Name is "primaryKey" or "autoIncrement" or "notNull" && property.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
                if (property.Name == "length" && (type != "VARCHAR" || !property.Value.TryGetInt32(out var length) || length is < 1 or > 4096)) return false;
            }
        }
        return true;
    }
}
