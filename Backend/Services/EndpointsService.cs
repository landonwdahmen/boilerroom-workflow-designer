using System;
using System.Linq;
using Npgsql;
using ZitaDataSystem.Models;


namespace ZitaDataSystem.Services
{
    public class EndpointsService
    {
        // Retained academic helper, no longer registered or exposed by RequestHandler (M3A).
        // Academic-only local test key. Disabled unless explicitly configured in Development.
        private static bool IsLocalDemoKey(string key)
        {
            var configured = Environment.GetEnvironmentVariable("TDS_DEMO_API_KEY");
            return string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
                                 "Development", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(configured)
                && string.Equals(configured, key, StringComparison.Ordinal);
        }

        // Returns the expected XML structure as a string for a given endpoint.
        public string? GetHeader(string endpoint)
        {
            // For example, for a "test" endpoint we expect two parameters.
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase))
            {
                return "<root><rows><row><param1></param1><param2></param2></row></rows></root>";
            }
            return null;
        }

        public string? GetGet(string endpoint, string apiKey)
        {
            // Remove any leading slashes
            endpoint = endpoint.TrimStart('/');
            Console.WriteLine($"Trimmed endpoint: '{endpoint}'");

            // The arbitrary-key project path was removed in October 2026. No SQL is returned here.

            // Check for the "test" endpoint
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase) && IsLocalDemoKey(apiKey))
            {
                return "SELECT * FROM test WHERE text = $param1$";
            }

            Console.WriteLine($"No valid endpoint matched for '{endpoint}'. Returning null.");
            return null;
        }

        public string? GetPost(string endpoint, string apiKey)
        {
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase) && IsLocalDemoKey(apiKey))
                return "validKey";
            return null;
        }

        public string? GetPut(string endpoint, string apiKey)
        {
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase) && IsLocalDemoKey(apiKey))
                return "UPDATE test SET text = $param1$ WHERE text = $param2$";
            return null;
        }

        public string? GetInsert(string endpoint, string apiKey)
        {
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase) && IsLocalDemoKey(apiKey))
                return "INSERT INTO test (text) VALUES ($param1$)";
            return null;
        }

        public string? GetDelete(string endpoint, string apiKey)
        {
            if (endpoint.Equals("test", StringComparison.OrdinalIgnoreCase) && IsLocalDemoKey(apiKey))
                return "DELETE FROM test WHERE text = $param1$";
            return null;
        }

        // --- New Methods for Dynamic Endpoints ---

        // NEW: Dynamic endpoint retrieval
        public DynamicEndpoint? GetEndpoint(string endpointName, string method, string apiKey, string connectionString)
        {
            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        SELECT Id, EndpointName, Method, ApiKey, SqlCommand, CreatedAt
                        FROM DynamicEndpoints
                        WHERE EndpointName = @EndpointName AND Method = @Method AND ApiKey = @ApiKey
                    ";
                    cmd.Parameters.AddWithValue("@EndpointName", endpointName);
                    cmd.Parameters.AddWithValue("@Method", method);
                    cmd.Parameters.AddWithValue("@ApiKey", apiKey);

                    using (var reader = cmd.ExecuteReader())
                    {
                        if (!reader.Read())
                            return null;
                        
                        return new DynamicEndpoint
                        {
                            Id = reader.GetInt32(0),
                            EndpointName = reader.GetString(1),
                            Method = reader.GetString(2),
                            ApiKey = reader.GetString(3),
                            SqlCommand = reader.GetString(4),
                            CreatedAt = reader.GetDateTime(5)
                        };
                    }
                }
            }
        }


        // Create a new dynamic endpoint definition in the database.
        public int CreateDynamicEndpoint(CreateDynamicEndpointRequest request, string connectionString)
        {
            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        INSERT INTO DynamicEndpoints (EndpointName, Method, ApiKey, SqlCommand)
                        VALUES (@EndpointName, @Method, @ApiKey, @SqlCommand)
                        RETURNING Id;
                    ";
                    cmd.Parameters.AddWithValue("@EndpointName", request.EndpointName);
                    cmd.Parameters.AddWithValue("@Method", request.Method);
                    cmd.Parameters.AddWithValue("@ApiKey", request.ApiKey);
                    cmd.Parameters.AddWithValue("@SqlCommand", request.SqlCommand);

                    return Convert.ToInt32(cmd.ExecuteScalar());
                }
            }
        }
    }
}
