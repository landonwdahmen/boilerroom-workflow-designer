// Original team application; October 2026 backend security modernization.
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;
using ZitaDataSystem.Services;

var builder = WebApplication.CreateBuilder(args);
if (!builder.Environment.IsDevelopment())
    throw new InvalidOperationException("This portfolio API is local-development-only.");
if (builder.Configuration.GetSection("Kestrel:Endpoints").GetChildren().Any())
    throw new InvalidOperationException("Configured endpoints are not supported; use the fixed loopback HTTPS listener.");
var sessionMinutes = builder.Configuration.GetValue("Authentication:SessionMinutes", 30);
if (sessionMinutes is < 1 or > 30) throw new InvalidOperationException("Session lifetime must be 1 to 30 minutes.");
builder.Services.AddSingleton(new SessionSettings(TimeSpan.FromMinutes(sessionMinutes)));
NpgsqlConnectionStringBuilder connection;
try { connection = new(builder.Configuration.GetConnectionString("PrimaryDatabase")); }
catch { throw new InvalidOperationException("Invalid local database configuration."); }
if (connection.Host != "127.0.0.1" || connection.Port < 1024 || string.IsNullOrWhiteSpace(connection.Database) ||
    string.IsNullOrWhiteSpace(connection.Username) || string.IsNullOrWhiteSpace(connection.Password))
    throw new InvalidOperationException("A configured loopback development database is required.");
connection.IncludeErrorDetail = false;
builder.Services.AddSingleton(NpgsqlDataSource.Create(connection.ConnectionString));
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<AuthenticationTickets>();
builder.Services.AddScoped<DatabaseCookieEvents>();
var keyDirectory = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../.local/auth-keys"));
var protection = builder.Services.AddDataProtection().SetApplicationName("BoilerRoomTDS.Portfolio")
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));
if (OperatingSystem.IsWindows()) protection.ProtectKeysWithDpapi();
else protection.UseEphemeralDataProtectionProvider(); // Non-Windows runtime remains unverified.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "__Host-tds.session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Path = "/";
    options.ExpireTimeSpan = TimeSpan.FromMinutes(sessionMinutes);
    options.SlidingExpiration = false;
    options.EventsType = typeof(DatabaseCookieEvents);
});
builder.Services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
    .Configure<AuthenticationTickets>((options, tickets) => options.SessionStore = tickets);
builder.Services.AddAuthorization(options =>
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Host-tds.csrf";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Path = "/";
});
// MVC's built-in antiforgery authorization filter is registered by the ViewFeatures services.
builder.Services.AddControllersWithViews(options => options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()))
    .AddXmlSerializerFormatters();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("credentials", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0, AutoReplenishment = true }));
});
builder.Services.AddCors(options => options.AddPolicy("AllowFrontend", policy =>
    policy.WithOrigins("https://localhost:3000").WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .WithHeaders("Content-Type", "X-CSRF-TOKEN").AllowCredentials()));
builder.Services.AddHostedService<Worker>();
builder.Host.UseWindowsService();
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 16 * 1024;
    options.Listen(IPAddress.Loopback, 8836, listener => listener.UseHttps());
});
var app = builder.Build();
// Explicit migration prerequisite; no schema mutations or secret-bearing startup diagnostics.
try
{
    await using var command = app.Services.GetRequiredService<NpgsqlDataSource>().CreateCommand("""
        SELECT EXISTS(SELECT 1 FROM portfolio_schema_versions
            WHERE version=3 AND project_key='boilerroom-tds-portfolio-graphs-v3')
            AND NOT (SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname=current_user)
        """);
    if (await command.ExecuteScalarAsync() is not true) throw new InvalidOperationException();
}
catch { throw new InvalidOperationException("Local restricted database/schema check failed. Apply graph schema version 3."); }

app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    try { await next(context); }
    catch (Exception exception) when (!context.Response.HasStarted)
    {
        // Do not log exception objects/messages: database details may contain sensitive values.
        var status = exception is BadHttpRequestException badRequest ? badRequest.StatusCode :
            exception is PostgresException { SqlState: "23505" } ? 409 :
            exception is PostgresException { SqlState: "23503" or "23514" or "23502" } ? 400 :
            exception is NpgsqlException ? 503 : 500;
        app.Logger.LogWarning("API request failed; sanitized category {Category}.", exception.GetType().Name);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { message = status == 409 ? "Request conflicts with existing data." :
            status == 400 ? "Invalid request." : "Request could not be completed." });
    }
});
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// Disabled SQLite backup, XML sessions and dynamic SQL helpers are not authentication services.
await app.RunAsync();

public sealed record SessionSettings(TimeSpan Lifetime);
