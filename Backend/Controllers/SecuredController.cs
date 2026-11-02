using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ZitaDataSystem.Services;

namespace ZitaDataSystem.Controllers;

[Authorize]
public abstract class SecuredController : ControllerBase
{
    // Set exclusively by database-backed cookie validation, never model binding.
    protected Account Current => (Account)HttpContext.Items[typeof(Account)]!;
    protected bool OrganizationMatches(string? supplied) =>
        string.IsNullOrWhiteSpace(supplied) || supplied == Current.OrganizationId;
}
