// Individual 2026 maintenance: retained academic helpers stay disconnected from HTTP.
using System.Text.Json;
using ZitaDataSystem.Models;
using ZitaDataSystem.Services;

namespace BoilerRoom.Tests;

[Trait("Category", "Unit")]
public sealed class LegacyContractTests
{
    [Theory]
    [InlineData(typeof(NodeData))]
    [InlineData(typeof(RequestPayload))]
    [InlineData(typeof(DynamicEndpoint))]
    [InlineData(typeof(CreateDynamicEndpointRequest))]
    public void Incomplete_legacy_shapes_are_not_silently_defaulted(Type contract) =>
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize("{}", contract));

    [Fact]
    public void Complete_legacy_payload_preserves_values()
    {
        var node = JsonSerializer.Deserialize<NodeData>("""
            {"Id":"synthetic-node","Type":"design-only","Data":{},"Position":{"x":1,"y":2}}
            """);
        Assert.NotNull(node);
        Assert.Equal("synthetic-node", node.Id);
        var payload = JsonSerializer.Deserialize<RequestPayload>("""{"rows":[{"key":"synthetic"}]}""");
        Assert.NotNull(payload);
        Assert.Equal("synthetic", Assert.Single(payload.rows)["key"]);
    }

    [Fact]
    public void Unknown_legacy_templates_have_no_result()
    {
        var service = new EndpointsService();
        Assert.Null(service.GetHeader("unknown-synthetic"));
        Assert.Null(service.GetGet("unknown-synthetic", "unused-synthetic"));
        Assert.Null(service.GetPost("unknown-synthetic", "unused-synthetic"));
        Assert.Null(service.GetPut("unknown-synthetic", "unused-synthetic"));
        Assert.Null(service.GetInsert("unknown-synthetic", "unused-synthetic"));
        Assert.Null(service.GetDelete("unknown-synthetic", "unused-synthetic"));
    }
}
