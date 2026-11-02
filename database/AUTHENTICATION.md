# Backend authentication and authorization — October 2026 portfolio work

**M4B verified October 28:** GET/PUT `/api/auth/projects/{projectId:guid}/graph` extend the same DB-validated identity, own-organization administrator/assigned-developer reads and administrator-only CSRF writes. PUT was added to the existing explicit localhost CORS methods. API startup requires graph schema marker 3. Session/invitation/password policies are unchanged. [Graph contracts and completed verification](GRAPH_PERSISTENCE.md) document recovery, both durability stages, graph probe 116/100, repeated full security regression 120/139 and actual Edge 104/301. Exact-owned cleanup restores all runner baselines; execution remains disabled.

This is new individual portfolio-modernization work on the original four-person academic application. Team attribution remains in the root README. M3A does not authorize publication, hosting, real data, or M3B frontend changes.

## Approved policy and mechanism

The owner explicitly selected these policies during M3A:

- A local operator provisions organizations and their first administrators; HTTP registration never creates an administrator or organization.
- Only an organization's administrators issue developer invitations. Invitations are email-bound, expire after 24 hours, and can be redeemed once.
- Administrators manage only their organization's projects, assignments, and user list. Developers read only their assigned projects. Profiles and password changes are self-only, including for administrators.

Selected: built-in ASP.NET Core cookie authentication without introducing Identity/EF Core or JWT dependencies. The framework protects the cookie; `ITicketStore` holds revocable tickets in this single API process. This avoids browser-readable bearer credentials and allows logout/password-change revocation. Signed JWTs would require issuer/audience/signing-key management and additional revocation state to meet immediate logout requirements; the local single-backend SPA gains no benefit from that complexity. Framework [cookie authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-8.0) and [antiforgery guidance](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-8.0) informed the design.

## Endpoint inventory

| Method/route | Required boundary |
| --- | --- |
| GET `/api/auth/csrf` (new) | Public token bootstrap; no user or invitation data. |
| POST `/api/auth/login` | Public with CSRF and rate limiting; uniform invalid-credential response. |
| POST `/api/auth/register` | Public with CSRF and rate limiting; invitation-only developer signup. Reject role/organization manipulation. |
| POST `/api/auth/logout` (new), GET `/api/auth/me` (new) | Valid session; logout requires CSRF and revokes the server ticket. |
| GET/PATCH `/api/auth/profile/{id}` | Self only. Another ID is concealed as 404; PATCH requires CSRF. |
| POST `/api/auth/change-password` | Self only, current password and CSRF; revoke all existing sessions. Optional legacy email must match the signed-in user. |
| GET `/api/auth/users` | Administrator; derive organization from validated DB membership. Foreign organization filter is forbidden. |
| GET `/api/auth/projects` | Derive organization; administrators see own organization; developers only their assignments. |
| POST `/api/auth/projects`, DELETE `/api/auth/projects/{id}` | Administrator in resource organization, CSRF. Any assignee must belong to that organization. |
| GET `/api/RequestHandler/assigned/{userId}` | Own assignments, or administrator viewing a user in the same organization. |
| POST `/api/auth/invitations` (new) | Administrator, own organization, CSRF. Return a new invitation secret once; store only its hash. |
| GET `/api/auth/company-code` | Retired; authenticated callers receive 410. Never return legacy organization-ID codes. |
| Generic RequestHandler GET/POST/PUT/PATCH/DELETE | Disabled. Anonymous requests receive 401; authenticated requests receive 410. Arbitrary API keys never establish an identity or authorize SQL. |
| Future controller routes | Authenticated fallback policy; writes also subject to global antiforgery validation. |

Session identity is revalidated against the current users/companycodes relationship on every request. Neither query/body IDs, client role claims, nor API-key fragments establish membership. Existing project rows have organization and assignee, no creator/owner column; no historical creator ownership is invented.

## Session, password, CSRF and transport contract

- The `__Host-tds.session` cookie is HttpOnly, Secure, SameSite=Strict, host-only, Path=/ and nonpersistent. Server tickets have an absolute **30-minute** default lifetime, no sliding renewal; `Authentication:SessionMinutes` accepts 1–30 for bounded local verification. Cookie integrity/confidentiality uses framework Data Protection. Windows keys are DPAPI-protected under ignored `.local/auth-keys`, scoped to this application. Non-Windows execution is unverified and selects ephemeral protection.
- Tickets are held in this single process, capped at 1,024 with expired-entry pruning on login. Restart invalidates every session. Logout deletes the server ticket, so a copied old cookie cannot be replayed. Login rotates the caller's existing ticket. Password change revokes all that user's tickets, expires the current cookie, and requires a fresh login. Already executing requests cannot be recalled.
- On each request, current DB role/organization and a fingerprint of the stored BCrypt hash must match the server ticket. Removing/changing membership or changing the hash outside the API also invalidates a stale identity on its next request. Hashes/fingerprints are not returned to clients. No client role, bearer stub, API-key fragment, or localStorage value is trusted.
- BCrypt remains the password algorithm (work factor 12 for new hashes). New passwords require 12+ characters and at most 72 **UTF-8 bytes**, avoiding BCrypt truncation; passwords are never trimmed. Existing compatible hashes can still be verified. Invalid login accounts/passwords share HTTP 401 and the same message. Login/registration share a framework limit of 30 attempts per minute per peer IP, with no forwarded-header trust or request queue.
- GET `/api/auth/csrf` returns a request token; the framework also sets a Secure/HttpOnly/Strict antiforgery cookie. Send the token in `X-CSRF-TOKEN` on every state-changing call, including login, registration and logout. Fetch a fresh token after login/logout because it is identity-bound. Missing/invalid tokens produce **400**. Unauthorized protected calls produce **401** before controller CSRF handling. The disabled generic handler never performs writes and ignores antiforgery solely to return 410.
- Listen only on **https://127.0.0.1:8836**, accessed as **https://localhost:8836** for certificate hostname validation. There is no plaintext HTTP listener or compatibility fallback. CORS permits credentials only from **https://localhost:3000**, with Content-Type/X-CSRF-TOKEN and the selected methods. Both SPA and API must use HTTPS and the same hostname; `http://localhost:3000` and `127.0.0.1` are not equivalent browser origins/sites. CORS is not authorization.
- Responses use no-store. Unexpected DB/application errors return sanitized 400/409/503/500 messages; exception objects/messages and request/response bodies are not logged by the API's error handler. The request body limit is 16 KiB. These local controls are not a production abuse-monitoring or distributed-session system.

## Setup on the verified Windows toolchain

From the repository root, follow the M1 restore instructions if needed, then:

```powershell
pwsh -NoProfile -File ./scripts/Start-LocalDatabase.ps1
pwsh -NoProfile -File ./scripts/Update-LocalAuthenticationSchema.ps1
New-Item -ItemType Directory -Path .local/https -Force | Out-Null
dotnet dev-certs https --export-path .local/https/localhost.pem --format Pem --no-password
dotnet build Backend/ZitaDataSystem.csproj --configuration Release --no-restore
dotnet build tools/LocalAdministrator/LocalAdministrator.csproj --configuration Release
```

The explicit migration adds only `invitations` and schema marker 2, with issuer/organization FK, unique SHA-256 token hashes, target email, expiry, and consumption metadata. The same `002-auth-invitations.sql` runs after 001 for new empty volumes. Rerunning it with the correct version-2 marker is a no-op; existing-volume migration is explicit, never a reset. Existing users/projects/companycodes/test rows are preserved. The application role receives invitation CRUD, not DDL/role privileges. The API refuses startup without the version-2 marker or with a privileged DB role. Legacy companycodes.code remains a compatibility column and is no longer a usable invitation.

The standard SDK certificate command may create a certificate in the current user's personal development store and exports public PEM plus a private `.key` under ignored `.local/https`. It **does not trust a root** without `--trust`. Keep the private key private; no real certificate/key belongs in source. The C# regression client trusts only that exact local certificate with hostname, chain and validity checks. It does not use a global certificate-validation bypass. Browser use in M3B additionally requires the user to trust the local development certificate using the normal OS/SDK workflow (`dotnet dev-certs https --trust`); that trust-store change was not performed by this milestone.

Validate Docker ownership/schema first using `Assert-LocalSchema` from `scripts/LocalDevelopment.ps1`. Provision synthetic administrators in an interactive terminal:

```powershell
dotnet run --project tools/LocalAdministrator/LocalAdministrator.csproj --configuration Release --no-build
```

The tool prompts for a synthetic `example.test` identity, a new organization name and hidden password/confirmation. It creates a fresh organization/administrator in one transaction through the restricted local DB account; it never overwrites existing rows. Passwords are not CLI arguments or output. It reads only this project's ignored `.env`, connects to loopback and validates schema/privileges. There is no HTTP provisioning endpoint or startup seed. The security probe calls the same provisioning routine with disposable synthetic data; console password-entry UX is separately source-reviewed rather than a browser workflow.

Start the API in its own terminal, using the existing environment-only connection wrapper:

```powershell
pwsh -NoProfile -File ./scripts/Start-LocalApi.ps1
```

Ctrl+C stops this API; tickets do not survive restart. The DB volume/fixture remains intact. Never run the antivirus-blocked `Test-LocalDatabase.ps1`; the historical M2 HttpIntegrationProbe expects the retired insecure HTTP contract and is not the current verification procedure.

## Automated security verification

Build `tools/SecurityRegressionProbe/SecurityRegressionProbe.csproj` in Release. For the real-expiration test, start the API using `Start-LocalApi.ps1 -SessionMinutes 1` (a normal supported lifetime setting, not an authentication bypass). In a second terminal at the project root:

```powershell
. ./scripts/LocalDevelopment.ps1
Assert-LocalSchema
$listeners = @(Get-NetTCPConnection -LocalPort 8836 -State Listen -ErrorAction Stop)
if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1') { throw 'Unexpected listener.' }
$apiIdentity = Get-CimInstance Win32_Process -Filter "ProcessId = $($listeners[0].OwningProcess)"
$expectedDll = Join-Path $script:ProjectRoot 'Backend/bin/Release/net10.0/ZitaDataSystem.dll'
if (-not $apiIdentity -or $apiIdentity.Name -ne 'dotnet.exe' -or -not $apiIdentity.CommandLine.Contains($expectedDll)) {
    throw 'Unexpected API process; do not send credentials.'
}
dotnet run --project tools/SecurityRegressionProbe/SecurityRegressionProbe.csproj --configuration Release --no-build -- $apiIdentity.ProcessId
```

The probe checks process liveness but relies on those independent command-line/socket/Docker checks for identity. It uses fixed HTTPS localhost, no proxy/redirects, exact-certificate trust and in-memory credentials/cookies/CSRF/invitation secrets. It writes only sanitized case labels/statuses/booleans to ignored `.local/security-probe/<run>/report.json`. The report is created before writes. A supported one-minute session is required so actual server expiry is tested without weakening validation or modifying a clock.

Local provisioning creates two owned organizations/admins, and HTTP creates the invited developer/projects. SQL-only fixture adjustments make one owned invitation expired and temporarily change one owned administrator's role to verify DB revalidation. Cleanup runs in finally, validates exact random organizations plus expected synthetic email/name ownership, removes their invitations/projects/users/companycodes in a transaction, and compares all six business tables (including graphs) with the pre-run fingerprint. Unknown rows cause refusal, not broader deletion. Interrupted processes may require manual reviewed cleanup using the exact report run; never reset the volume or choose an arbitrary latest report. Current backend/helpers target net10.0; [M5A](../DOTNET10_UPGRADE.md) records framework compatibility without changing this security policy.

## Frontend contract (M3B implemented October 24, 2026)

The [M3B integration record](../FRONTEND_INTEGRATION.md) documents the implemented frontend, normal Windows certificate trust, HTTPS helpers and actual browser verification. The contract table remains authoritative. The original M3A handoff checklist below is preserved as historical implementation guidance; its selected integration work is complete, with limitations explicitly recorded in PLAN section 13.

Current JSON field contracts (field names only; no credential examples):

| Call | Request / successful response |
| --- | --- |
| GET csrf | Response `requestToken`; keep it in memory and send the header. |
| POST login | Request `email,password`; response `userId,name,email,role,organizationId,organizationName,expiresAt`, plus the HttpOnly session cookie. No bearer token. |
| POST register | Request `name,email,password,role` (developer), `accessCode`; omit organization fields. Response `userId,email,role,organizationId,organizationName,message`; no automatic sign-in. |
| GET me or own profile; PATCH own profile | Profile `userId,name,email,role,organizationId,organizationName`; PATCH request `name`. |
| POST change-password | Request `currentPassword,newPassword`; optional legacy email query must match the user. Response message; all sessions revoked. |
| POST invitations | Request `email`; response `invitationId,accessCode,expiresAt`. Secret is shown once to the authorized administrator. |
| GET users | Array of `id,name,email,role,organizationId` (administrator's own organization). |
| POST / GET projects; GET assigned | Create accepts `name,description,status,assignedTo,organizationId`; organization may be omitted, but a supplied value must match. Create responds `id,message`; lists contain `id,name,description,status,assignedTo,organizationId`. |
| DELETE project / POST logout | Delete responds message (200); logout is **204 with no body**. |

Validation may return framework ProblemDetails; permission denials may have no body. Parse content/status deliberately rather than assuming every response contains JSON or a message field. Credentials/CSRF/invitation values must never be logged.

At M3A completion the unchanged frontend could not authenticate. M3B repaired these contracts; production compilation and browser evidence are reported separately:

1. Centralize API calls on `https://localhost:8836`; run the SPA at trusted `https://localhost:3000`. Supply `credentials: 'include'` / Axios `withCredentials` and the current antiforgery request header.
2. Bootstrap CSRF before public POSTs and refresh after identity changes. Treat 401 as unauthenticated, 403 as forbidden, and 400 CSRF failures deliberately; do not retry writes blindly.
3. Stop storing/reading token stubs in localStorage/sessionStorage and remove Authorization/x-api-key construction, token splitting and unsupported refresh calls. Use `/api/auth/me` for session restoration. Keep user-display state separate from server authorization.
4. Public signup is invited developer signup only, followed by explicit login. Remove anonymous administrator/organization signup. Replace reusable company-code UI with administrator-issued email-bound invitations; show a secret once without console logging or persistence.
5. Logout calls the backend with CSRF before clearing UI state. Password change ends all sessions; return to login. Profiles are self-only. Admin lists are server-scoped; developer project lists are assignment-scoped. Do not fabricate project update/reassignment/reset functionality.
6. Preserve error/loading behavior and test login, reload, expiry, logout, password changes, role navigation and invitations in a browser. No frontend source change is authorized or implemented as part of M3A.

M4A subsequently removes unsafe custom graph execution and graph-driven requests; the [editor inventory/proposal](../EDITOR_SECURITY.md) documents read-only developer inspection, administrator local editing and future server requirements. Graph persistence/execution, dependency advisories, production hardening, delivery/recovery, distributed sessions and publication approvals remain out of scope. Invitations have no delivery/revocation UI. Operator DB access is trusted local administration, not an HTTP role. M3A/M3B results are in PLAN sections 12–13; M4A is section 14.

## Runtime verification — October 22, 2026

The final run completed **139 HTTP requests**, **120 recorded assertions true**, zero false assertions. Requests are retained individually; repeated labels such as CSRF bootstrap/rate-limit attempts share assertion keys. Status totals: 200=45, 204=4, 400=11, 401=56, 403=9, 404=6, 409=1, 410=6, 429=1. All eleven M2 access regressions now deny: nine anonymous/invalid-bearer cases return 401, cross-organization profile read 404, cross-organization creation 403.

Verified: cookie integrity/flags, malformed/tampered/expired credential rejection, CSRF missing/invalid rejection, role/tenant/self boundaries, arbitrary API-key rejection and retirement of generic SQL for all five tested verbs, login error uniformity, invitation email/expiry/single-use/hash storage, safe duplicate registration rollback, actual logout-cookie replay rejection, two-session password-change revocation, live DB role revalidation, real one-minute ticket expiration, rate limit, and allowed/disallowed CORS preflights. Legitimate administrator provisioning, invited registration/login, profile/password changes, assigned/unassigned project creation/listing/assignment read/deletion, and committed SQL effects passed. Final review aligned all-space password rejection between provisioning and MVC; added assertions cover ASCII/multibyte UTF-8 limits. The final password-change/new-login scenario used a password with leading/trailing spaces and passed, verifying preservation rather than trimming.

An initial one-request run caught missing framework antiforgery-filter services (500 instead of 400). Adding MVC ViewFeatures through AddControllersWithViews fixed it; final CSRF tests return 400. Both initial and final runs cleaned up and matched their original fingerprints. The final run removed ten owned rows (three invitations, two remaining projects, three users, two organizations). Final state: users=0, projects=1, companycodes=1, test=0, invitations=0; original M2 fixture intact, DB healthy, API stopped. The additive migration was rerun as a no-op with business rows preserved.

Final backend full Release rebuild passed with 20 warnings (19 existing nullable warnings in retained dormant models/helpers plus one legacy SQLite RID warning). Security/local-operator tools build without new package versions; the same inherited SQLite RID warning can propagate through project references. Frontend production compilation passed with the existing 18 ESLint diagnostics and stale Browserslist warning, unchanged reported JS/CSS output hashes. No Jest or browser workflow is claimed. A fresh empty-volume v1+v2 init, interactive console input UX, non-Windows runtime, and comprehensive security audit were not performed during M3A.
