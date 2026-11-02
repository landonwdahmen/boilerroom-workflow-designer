using System.Net;
using System.Net.Security;
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

namespace PortfolioTools;

public sealed record ApiReply(int Status, JsonElement Json, string? AllowedOrigin, bool CredentialsAllowed);

public sealed class ApiClient : IDisposable
{
    private readonly string _actor;
    private readonly HttpClient _client;
    private readonly HttpClientHandler _handler;
    private readonly string? _cookieOverride;
    private string? _csrf;
    public static readonly Uri Address = new("https://localhost:8836");
    public string CookieSnapshot => _handler.CookieContainer.GetCookieHeader(Address);
    public bool SecureCookieObserved { get; private set; }
    public static Func<bool> ApiAlive { get; set; } = () => false;

    public ApiClient(string actor, X509Certificate2 expectedCertificate, string? cookieOverride = null)
    {
        _actor = actor;
        _cookieOverride = cookieOverride;
        _handler = new HttpClientHandler { UseProxy = false, AllowAutoRedirect = false, UseCookies = cookieOverride is null };
        _handler.ServerCertificateCustomValidationCallback = (_, certificate, _, errors) =>
        {
            if (certificate is null || (errors & (SslPolicyErrors.RemoteCertificateNameMismatch |
                SslPolicyErrors.RemoteCertificateNotAvailable)) != 0 ||
                !certificate.RawData.AsSpan().SequenceEqual(expectedCertificate.RawData)) return false;
            using var chain = new X509Chain();
            chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
            chain.ChainPolicy.CustomTrustStore.Add(expectedCertificate);
            chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck; // Local self-signed development root only.
            return chain.Build(certificate);
        };
        _client = new HttpClient(_handler) { BaseAddress = Address, Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<ApiReply> Send(string label, string method, string path, object? body = null,
        int expected = 200, bool csrf = true, Dictionary<string, string>? headers = null, int[]? allowed = null, string? rawJson = null)
    {
        if (!ApiAlive()) throw new InvalidOperationException("Verified API process exited.");
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (_cookieOverride is not null) request.Headers.TryAddWithoutValidation("Cookie", _cookieOverride);
        if (csrf && method is not ("GET" or "HEAD" or "OPTIONS") && _csrf is not null)
            request.Headers.Add("X-CSRF-TOKEN", _csrf);
        if (headers is not null) foreach (var pair in headers) request.Headers.TryAddWithoutValidation(pair.Key, pair.Value);
        if (rawJson is not null) request.Content = new StringContent(rawJson, System.Text.Encoding.UTF8, "application/json");
        else if (body is not null) request.Content = JsonContent.Create(body);
        using var response = await _client.SendAsync(request);
        var raw = await response.Content.ReadAsStringAsync(); // Never print/store any response or request body.
        ProbeReport.Observe(_actor + ": " + label, (int)response.StatusCode, allowed ?? new[] { expected });
        if (response.Headers.TryGetValues("Set-Cookie", out var cookies))
            SecureCookieObserved |= cookies.Any(cookie => cookie.StartsWith("__Host-tds.session=") &&
                cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase) &&
                cookie.Contains("secure", StringComparison.OrdinalIgnoreCase) &&
                cookie.Contains("samesite=strict", StringComparison.OrdinalIgnoreCase) &&
                !cookie.Contains("domain=", StringComparison.OrdinalIgnoreCase));
        JsonElement json = default;
        if (response.Content.Headers.ContentType?.MediaType?.Contains("json") == true && raw.Length > 0)
        {
            using var document = JsonDocument.Parse(raw);
            json = document.RootElement.Clone();
        }
        var origin = response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins) ? origins.Single() : null;
        var credentials = response.Headers.TryGetValues("Access-Control-Allow-Credentials", out var grants) && grants.Single() == "true";
        return new ApiReply((int)response.StatusCode, json, origin, credentials);
    }

    public async Task RefreshCsrf()
    {
        var reply = await Send("CSRF bootstrap", "GET", "/api/auth/csrf");
        _csrf = reply.Json.GetProperty("requestToken").GetString();
        ProbeReport.Check(_actor + " CSRF token available", !string.IsNullOrEmpty(_csrf));
    }

    public async Task<JsonElement> Login(string email, string password)
    {
        await RefreshCsrf();
        var reply = await Send("credential login", "POST", "/api/auth/login", new { email, password });
        await RefreshCsrf(); // Request tokens are bound to the newly authenticated identity.
        return reply.Json;
    }

    public void Dispose() { _client.Dispose(); }
}
