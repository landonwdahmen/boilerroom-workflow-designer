using System.Text.Json;
using System.Text.Json.Nodes;
using ZitaDataSystem.Services;

namespace BoilerRoom.Tests;

[Trait("Category", "Unit")]
public sealed class GraphValidationTests
{
    private static JsonElement Json(string text) => JsonDocument.Parse(text).RootElement.Clone();
    private static JsonObject Node(string id, string type = "customLogic") => new()
    {
        ["id"] = id, ["type"] = type,
        ["position"] = new JsonObject { ["x"] = 0, ["y"] = -25.5 },
        ["data"] = new JsonObject { ["label"] = "Synthetic inert metadata" }
    };
    private static JsonObject Edge(string id, string source, string target) => new()
    {
        ["id"] = id, ["source"] = source, ["target"] = target,
        ["sourceHandle"] = "out", ["targetHandle"] = "in", ["type"] = "default"
    };

    [Theory]
    [InlineData("{\"schemaVersion\":1,\"nodes\":[],\"edges\":[]}", true)]
    [InlineData("{\"schemaVersion\":2,\"nodes\":[],\"edges\":[]}", false)]
    [InlineData("{\"schemaVersion\":1,\"schemaVersion\":1,\"nodes\":[],\"edges\":[]}", false)]
    [InlineData("{\"schemaVersion\":1,\"nodes\":[],\"edges\":[],\"code\":\"inert\"}", false)]
    [InlineData("[]", false)]
    [InlineData("null", false)]
    [InlineData("{\"schemaVersion\":1,\"nodes\":{},\"edges\":[]}", false)]
    public void Root_contract(string text, bool valid) => Assert.Equal(valid, GraphDocument.Valid(Json(text)));

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(9007199254740990, true)]
    [InlineData(9007199254740991, false)]
    public void Save_revision_boundaries(long revision, bool valid)
    {
        var request = Json($"{{\"expectedRevision\":{revision},\"graph\":{GraphDocument.Empty}}}");
        Assert.Equal(valid, GraphDocument.Save(request, out _, out _));
    }

    [Fact]
    public void Cycles_dangling_edges_duplicate_ids_and_self_links_are_rejected()
    {
        var graph = new JsonObject { ["schemaVersion"] = 1,
            ["nodes"] = new JsonArray(Node("a"), Node("b")), ["edges"] = new JsonArray(Edge("ab", "a", "b")) };
        Assert.True(GraphDocument.Valid(Json(graph.ToJsonString())));
        var edges = graph["edges"]!.AsArray();
        edges.Add(Edge("ba", "b", "a"));
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
        edges.Clear(); edges.Add(Edge("missing", "a", "unknown"));
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
        edges.Clear(); edges.Add(Edge("self", "a", "a"));
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
        edges.Clear(); graph["nodes"]!.AsArray().Add(Node("a"));
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
    }

    [Theory]
    [InlineData("code")]
    [InlineData("query")]
    [InlineData("body")]
    [InlineData("parameters")]
    public void Executable_fields_are_rejected_instead_of_silently_dropped(string field)
    {
        var node = Node("a"); node["data"]![field] = "synthetic inert text";
        var graph = new JsonObject { ["schemaVersion"] = 1, ["nodes"] = new JsonArray(node), ["edges"] = new JsonArray() };
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
    }

    [Fact]
    public void Coordinates_labels_and_UTF8_aggregate_are_bounded()
    {
        var node = Node("a");
        var graph = new JsonObject { ["schemaVersion"] = 1, ["nodes"] = new JsonArray(node), ["edges"] = new JsonArray() };
        node["position"]!["x"] = 100001;
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
        node["position"]!["x"] = 0;
        node["data"]!["label"] = new string('x', 101);
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
        graph["nodes"] = new JsonArray(Enumerable.Range(0, 100).Select(i => {
            var large = Node("n" + i); large["data"]!["label"] = new string('é', 100); return (JsonNode)large;
        }).ToArray());
        Assert.True(System.Text.Encoding.UTF8.GetByteCount(graph.ToJsonString()) > GraphDocument.MaxBytes);
        Assert.False(GraphDocument.Valid(Json(graph.ToJsonString())));
    }
}
