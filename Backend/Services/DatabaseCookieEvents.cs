using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ZitaDataSystem.Services;

// Re-check DB membership and password version, including changes made outside this process.
public sealed class DatabaseCookieEvents(AuthService auth) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var id = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var account = id is null ? null : await auth.FindAsync(id, false, context.HttpContext.RequestAborted);
        if (account is null || principal is null || principal.FindFirstValue(ClaimTypes.Role) != account.Role ||
            principal.FindFirstValue(AuthService.OrganizationClaim) != account.OrganizationId ||
            principal.FindFirstValue(AuthService.PasswordVersionClaim) != AuthService.PasswordVersion(account.PasswordHash))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }
        context.HttpContext.Items[typeof(Account)] = account;
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
