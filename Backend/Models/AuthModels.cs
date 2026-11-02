// Models/AuthModels.cs
//Holds are the classes for the different functions
using System.ComponentModel.DataAnnotations;

namespace ZitaDataSystem.Models
{



    public class NodeData
    {
        // Retained, disconnected DTO: callers must provide its complete shape.
        public required string Id { get; set; }
        public required string Type { get; set; }
        public required object Data { get; set; }
        public required object Position { get; set; }
    }

    public class CreateProjectRequest
    {
        [Required, StringLength(200)]
        public string Name { get; set; } = "";
        [StringLength(4000)]
        public string? Description { get; set; }
        [StringLength(32)]
        public string? Status { get; set; }
        [StringLength(100)]
        public string? AssignedTo { get; set; }
        [StringLength(100)]
        public string? OrganizationId { get; set; }
    }

    public class UpdateProfileRequest
    {
        [Required, StringLength(100)]
        public string Name { get; set; } = "";
    }
     public class RegisterRequest
    {
        [Required, StringLength(100)]
        public string Name { get; set; } = "";

        [Required, EmailAddress, StringLength(254)]
        public string Email { get; set; } = "";

        [Required, StringLength(72, MinimumLength = 12)]
        public string Password { get; set; } = "";

        [Required, StringLength(32)]
        public string Role { get; set; } = "";
        // For administrators:
        [StringLength(200)]
        public string? OrganizationName { get; set; }
        // For developers/members:
        [StringLength(100)]
        public string? OrganizationId { get; set; }

        // Developer can type this code at sign-up
        [StringLength(128)]
        public string? AccessCode { get; set; }
    }

    public class LoginRequest
    {
        [Required, EmailAddress, StringLength(254)]
        public string Email { get; set; } = null!;
        [Required, StringLength(72)]
        public string Password { get; set; } = null!;
    }

    [System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
    public class InvitationRequest
    {
        [Required, EmailAddress, StringLength(254)]
        public string Email { get; set; } = "";
    }
        // New models for dynamic endpoints
    public class DynamicEndpoint
    {
        public int Id { get; set; }
        public required string EndpointName { get; set; }
        public required string Method { get; set; }
        public required string ApiKey { get; set; }
        public required string SqlCommand { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateDynamicEndpointRequest
    {
        public required string EndpointName { get; set; }
        public required string Method { get; set; }
        public required string ApiKey { get; set; }
        public required string SqlCommand { get; set; }
    }

    public class ChangePasswordRequest
    {
        [Required, StringLength(72)]
        public string CurrentPassword { get; set; } = null!;
        [Required, StringLength(72, MinimumLength = 12)]
        public string NewPassword { get; set; } = null!;
    }
}
