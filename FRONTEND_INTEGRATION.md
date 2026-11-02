# Local frontend integration and historical Milestone 3B checklist

**Current maintenance/testing pointer — October 30, 2026:** M6B is complete for the approved local scope. Current commands are `npm.cmd test`, `npm.cmd run lint` and `npm.cmd run build`, or the root wrappers in [TESTING.md](TESTING.md). All **87** cases pass; lint is **0 errors/0 warnings**. The protected editor is lazy-loaded with status and explicit load-failure recovery; no auth/API/CSRF policy changed. The final isolated continuation passes PostgreSQL **6/6**, security **120/139**, graph **116/100**, actual Edge **104/297**, including session restoration, direct editor navigation, refresh, save/conflicts and read-only restrictions. Cleanup and development fingerprints/resources match; no completed build/unit/lint check was repeated. See [CODE_QUALITY.md](CODE_QUALITY.md) and PLAN 21.1 for evidence/limits and the two retained React Flow StrictMode diagnostics. Older CRA/Jest commands and counts below describe earlier milestones, not current invocation.

**M5C verified October 28:** current Router/DOM 7.18.5, Axios 1.21.0 and PostCSS 8.5.32 resolve the recorded npm findings; complete and production-only audits both report zero. All 83 tests, production/backend builds, lint (54 warnings/0 errors), graph 116/100, security 120/139 and real Edge 104/302 pass. Direct navigation/protected refresh, trusted HTTPS cookie/CSRF, invitations/profile/password/logout, projects/assignment/tenant limits and real persisted graph editing/reload/conflict/read-only behavior remain verified. All fixture baselines are restored. See [exact advisories, provenance and limits](DEPENDENCY_SECURITY.md); no application API/test/hosting configuration is changed. Dated results below retain historical context.

**M5B verified October 28, 2026:** current tooling is Vite 8.3.5 / Vitest 5.0.5, retaining React/Router/Flow and the same trusted HTTPS cookie/CSRF contract. All 83 tests and production build pass; actual Edge 156.0.4314.50 passes 104 assertions / 299 API responses, zero page errors/external requests, including direct protected navigation/refresh, invitations, profiles/passwords, role/tenant denials, canvas gestures and PostgreSQL save/reload/conflicts. Graph/security probes pass 116/100 and 120/139; all three runners restored the original database baseline. See [migration choices, dependencies, exact evidence and rollback](VITE_MIGRATION.md). M3B/M4A/M4B checklists below preserve historical context.


**M4B complete October 28:** graph loading, explicit administrator Save/Reload, dirty warnings, conflict draft retention and assigned-developer inspection are runtime-verified. After Docker/WSL recovery, 83 frontend tests/six suites and production builds pass; actual Edge passes 104 recorded assertions/301 responses and full security regression 120/139. [Graph persistence](database/GRAPH_PERSISTENCE.md) records contracts, durability, cleanup and limits. Earlier in-memory-only records below are historical.

This is later portfolio work on the original four-person academic application. This checklist was recorded after source review and **before application changes**. Backend contracts and M3A security policy remain authoritative; see database/AUTHENTICATION.md.

**M4A update:** [Editor security/stability](EDITOR_SECURITY.md) records removal of execution, administrator-only local editing and developer read-only inspection. The M3B pre-code inventory below is historical; PLAN section 14 records the latest 58 frontend tests and 84 real Edge checks.

## Prioritized source-confirmed mismatches

| Priority | Frontend mismatch | Required repair |
| --- | --- | --- |
| P0 | Active forms/pages hardcode HTTP 8836; dormant services/config target JSON Server 3001; requests omit credentials. | One environment-configured HTTPS localhost API, credentialed requests, HTTPS SPA at localhost:3000, normal certificate trust. Keep explicit backend CORS/cookie flags. |
| P0 | Axios reads bearer localStorage and retries unsupported refresh; AuthContext trusts stored user/token and logs it; login expects token/nested data and trims passwords. | Memory-only display identity from flat login/me responses, real session restoration, no credential logs/storage, preserve password whitespace, remove refresh retries. |
| P0 | No CSRF bootstrap/headers or identity transition refresh. Logout only clears storage; password change leaves authenticated UI. | Framework CSRF bootstrap before writes, refresh after identity changes, no automatic write replay; real logout, 401/session-expiration handling, password change requires new login. |
| P1 | Signup offers administrator/organization creation, organization-ID code and automatic sign-in. | Developer-only invitation signup; email-bound 64-hex invitation, 12-character/72-UTF-8-byte password policy, explicit subsequent login and invalid/expired/used/duplicate errors. |
| P1 | CompanyCodeDisplay calls retired company-code route and fabricates simulated codes. | Admin email-only invitation issuance; one-time secret stays in component memory, explicit dismissal/expiry, no fake code. |
| P1 | Profiles use inconsistent id/userId, raw unauthenticated fetch and login() for display edits; password endpoint/query and dormant service verbs disagree. | Own userId profile GET/PATCH(name), POST change-password(currentPassword,newPassword), update display state separately; safe response handling. |
| P1 | Admin lists filter in browser, load completes early, MemberList imported but never rendered; create adds invented createdAt, empty assignment; delete sends x-api-key. | Server-scoped users/projects; actual loading/errors/empty/retry; render user list; create valid/null assignment and active status; cookie/CSRF delete. Assignment is supported **on creation only**. |
| P1 | Developer dashboard splits token for assignment GET; role aliases admin/member/viewer differ from administrator/developer; navigation sends admins to developer page. | Backend role vocabulary throughout active guards/navigation; credentialed assigned list, no admin controls for developers. |
| P1 | Password recovery calls nonexistent forgot/verify/reset endpoints; dormant auth service has unsupported password/profile routes; dormant org service invents organizations CRUD and project service invents member CRUD/detail. | Disable unavailable recovery UI and unsupported service operations with explicit local errors. Use supported project list/create/delete; resolve project detail from authorized list. Do not add backend routes. |
| P2 | Playground route accepts arbitrary project ID; visual editor has no graph persistence and unsafe custom JavaScript/browser fetch. | Verify selected project against server-scoped list before showing editor; preserve editor without expanding execution/persistence. Do not execute untrusted graphs or external requests in tests. Track existing execution risk. |
| P2 | Stale starter test/CRA Jest Router 7 resolver failure; existing lint/dependency debt. | Focused API/session/form/route tests using installed tooling, production builds, repeat M3A security probe, real trusted-HTTPS browser workflows if available; report limits independently. |

The three historical 500s are already addressed in M3A: default active status, blank assignment -> NULL / invalid membership -> 400, transactional invited signup with safe duplicate 409 and rollback. Reverify rather than redesigning them. Existing unrelated dormant broken AdminDashboard stays disconnected; no new editor feature, schema, dependency upgrade, or authentication-policy change is planned.

## Execution status

- [x] Source review and prioritized checklist recorded before application edits.
- [x] Secure local HTTPS setup and shared API client.
- [x] Session, invitation/signup, logout and password-state integration.
- [x] Own profile and server-scoped project/user workflows.
- [x] Unsupported operations disabled and active routes/roles aligned.
- [x] Focused tests, production builds, M3A regression and browser evidence.
- [x] Final documentation, fixture cleanup and acceptance assessment (PLAN section 13).

## Local HTTPS workflow

Use PowerShell 7.2+, the pinned .NET 10 SDK/installed Node toolchain and this project's PostgreSQL only; see [M5A requirements and compatibility](DOTNET10_UPGRADE.md). Complete the [database setup](database/README.md) and [operator provisioning](database/AUTHENTICATION.md) first. Restore the reviewed current frontend lockfile with `npm.cmd ci --ignore-scripts --no-audit --no-fund` from TDS-Frontend-main. Current Node/npm requirements and dependency lifecycle review are in VITE_MIGRATION.md.

For initial certificate setup, from the root:

```powershell
New-Item -ItemType Directory -Path .local/https -Force | Out-Null
dotnet dev-certs https --export-path .local/https/localhost.pem --format Pem --no-password
dotnet dev-certs https --trust
dotnet dev-certs https --check --trust
```

Reuse valid existing exports; do not run certificate clean/import or replace other projects' certificates. Accept the normal Windows trust confirmation only for the expected localhost development certificate. On October 24 the owner accepted that dialog and the SDK confirmed the existing exported certificate was trusted. Both servers use the same PEM/private key; private exports remain ignored. No certificate-verification bypass or antivirus change is used. Other operating systems/browser trust stores are unverified.

Build before starting the API. Run these in separate terminals at the root:

```powershell
dotnet build Backend/ZitaDataSystem.csproj --configuration Release --no-restore
pwsh -NoProfile -File ./scripts/Start-LocalApi.ps1
```

```powershell
pwsh -NoProfile -File ./scripts/Start-LocalFrontend.ps1
```

Open **https://localhost:3000**. The frontend helper supplies the public VITE_API_URL only in the child process and launches this workspace's Vite script. Vite fixes localhost, strict port 3000 and the existing trusted PEM/key in its Node-side configuration. It does not open a browser or change system settings. `npm run dev` / `npm start` use the same HTTPS configuration and require those certificate files; missing files fail instead of falling back to HTTP. Host checks remain enabled.

`VITE_API_URL` is the public environment/build-time API setting; see TDS-Frontend-main/.env.example. Its default is https://localhost:8836/api; validation rejects other origins, schemes, paths or credential-bearing URLs. Never put secrets in VITE_*; the parent PostgreSQL .env is not a frontend input. Output is fixed to frontend build/, with assets/ for bundled JS/CSS. No proxy, wildcard CORS, plaintext listener, cookie downgrade or browser TLS override is added.

## Current workflows and limits

- A local operator provisions a new organization/administrator. HTTP signup exposes only invited developer registration; registration does not sign in. Administrators issue an email-bound 24-hour code from their dashboard. The code stays only in component memory and is shown once with dismissal; share it privately outside this app. There is no email delivery or invitation retrieval/revocation UI.
- Login uses the flat cookie-based response; refresh uses `GET /auth/me`. Protected 401 ends display identity; wrong login credentials show a login error. Wrong-current-password 401 checks `/me` to distinguish it from an expired session. Roles are `administrator` and `developer`; route guards improve navigation while the API remains authoritative.
- The shared fetch client always includes cookies, uses a bounded timeout, refuses unexpected API origins, bootstraps CSRF before each write, and refreshes after identity changes. It never automatically replays a rejected write. Errors retain status and use fixed safe messages rather than echoing raw response bodies, ProblemDetails inputs or SQL exceptions. Empty 204 logout is handled without JSON parsing.
- Logout calls the backend before clearing identity; a network failure explains that the server session may remain active. Password change revokes all sessions and returns to login. No auth token or trusted identity is stored in localStorage/sessionStorage; old known keys are removed without reading their contents. Focus and protected requests consult the server; idle display alone is not proof of a live session.
- Profiles read/update the current userId only, using GET/PATCH(name). Profile edits update in-memory display data without pretending to authenticate. Passwords preserve spaces and follow the actual 12-character / 72-UTF-8-byte policy; strength suggestions are optional.
- Administrators see the server-scoped user/project lists, issue invitations, create active projects with an optional developer assignee, and delete projects after confirmation. Assignment is **at creation only**. Reassignment, project rename/status changes, user editing/deletion, public administrator/organization signup and public password recovery have no supported endpoint and are not advertised as working.
- Developers receive only assigned projects from the secured assignment endpoint. Playground IDs must pass a backend-scoped lookup; graph APIs independently enforce membership/assignment. M4B adds explicit administrator graph saves and assigned-developer inspection after refresh/reopen. Execution, graph-driven requests and API generation remain disabled. See database/GRAPH_PERSISTENCE.md for the implemented contract and EDITOR_SECURITY.md for historical findings.
- Historical unsupported organization/member/recovery services now fail locally rather than calling invented routes. The disconnected, syntactically defective old `components/dashboard/admin/AdminDashboard.js` is retained and must not be wired in; its obsolete HTTP/API-key code is documented historical debt. Dynamic SQL/API-key endpoints remain disabled.

## Reusable verification

From `TDS-Frontend-main`:

```powershell
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
```

Jest 27 resolves Router 7 through explicit installed CommonJS entry mappings in package.json, with TextEncoder/TextDecoder from Node util in setupTests. Tests use the installed router implementation without package upgrades or test framework installation. Focused tests cover transport/status handling, CSRF/204/no replay, session restore/clearing/logout errors, credential whitespace, invited signup errors and password boundaries. These jsdom tests are separate from actual browser evidence.

Repeat the [M3A security procedure](database/AUTHENTICATION.md) first and let it clean up before browser fixtures begin; overlapping test fixtures would invalidate original-state fingerprints. For both security and browser expiration tests use the supported **one-minute** API setting (`Start-LocalApi.ps1 -SessionMinutes 1`). This is a real absolute expiry test, not a clock or authentication bypass. Restart with the normal default for demonstrations afterward.

Build the browser fixture once before starting the API:

```powershell
dotnet restore tools/BrowserWorkflowFixture/BrowserWorkflowFixture.csproj --source https://api.nuget.org/v3/index.json --verbosity minimal -p:NuGetAudit=false
dotnet build tools/BrowserWorkflowFixture/BrowserWorkflowFixture.csproj --configuration Release --no-restore
```

This adds no package versions; it links the existing local provisioning/database helpers and backend dependencies. The audit flag affects this restore only; existing advisories remain tracked in PLAN. With API/SPA already running and a preinstalled Playwright module available:

```powershell
pwsh -NoProfile -File ./scripts/Test-LocalBrowser.ps1 -PlaywrightModule '<absolute path to existing playwright module>'
```

Do not install a global framework/browser just to run this milestone. The verified environment supplied Playwright 1.62.1 through the bundled workspace runtime and existing Microsoft Edge. The wrapper validates Docker/schema, exact loopback API/SPA listener PIDs and their workspace command lines before launching the runner. The runner uses a fresh headless Edge context per identity, normal certificate validation, no saved browser state/traces/videos, and an allowlist of the two local HTTPS origins. Negative permission/CSRF tests use browser fetch in those real contexts; normal workflows use rendered forms/navigation.

The C# fixture tool is **private child-process stdio**, not a command to run manually or log. Random synthetic credentials travel only through an intercepted pipe into Node memory, never CLI arguments, terminal output, files or reports. Reports under ignored `.local/browser-probe/<run>/report.json` contain case labels, statuses and booleans; the screenshot shows only the developer project list. Invitations are never embedded in URLs. Fixture cleanup validates exact new organizations and expected synthetic email/name patterns, deletes only their rows in a transaction, and compares all six business tables with the pre-run fingerprint. EOF also enters finally cleanup. An abrupt forced termination can require reviewed cleanup of that exact run; never reset the volume or delete an arbitrary latest fixture.

Builds verify compilation. The browser runs verify selected synthetic Windows/Edge journeys, including M4A canvas interactions via tools/editor-browser-checks.cjs. Headless Ctrl+R interception is checked separately from explicit page reload; coordinates use fitted visible nodes. These selected checks do not establish production readiness, graph execution, hosted CI, full accessibility/security, dependency safety or publication rights. Graph storage is verified separately in M4B and repeated in M5A/M5B. Current commands: `npm.cmd test` (83 cases), `npm.cmd run lint` (0 errors / 54 warnings), `npm.cmd run build` (passes with a chunk-size warning). See PLAN sections 13–17 for dated evidence.

