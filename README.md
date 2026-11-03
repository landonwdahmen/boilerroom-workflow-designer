# Boiler-Room / TDS

**M7C.3C private review — November 2, 2026:** Local runtime verification, local Git initialization and the initial private GitHub upload are complete. All three hosted GitHub Actions workflows passed for the initial main-branch commit. The accepted minimatch advisory remains **unpatched**: five moderate affected-package entries, one advisory. Its narrow exception remains conditional on the reviewed dependency graph, source, installed implementations, workflows, production exposure and upstream evidence; new or unverifiable inputs fail closed. Production auditing remains zero-only and registry signatures remain required. See [dependency evidence](DEPENDENCY_SECURITY.md) and [testing](TESTING.md). The repository remains private; public release requires a separate decision. No broad first-party open-source license has been granted.

**Local M7C.3I update — November 2, 2026 (uncommitted):** The owner explicitly renewed the same narrow, temporary minimatch risk exception for the exact assessed Windows verification source. The approved review-date/three-fingerprint refresh is applied: 156 reviewed paths, with 153 prior fingerprints unchanged. Fresh strict local dependency-policy verification passes; the raw full audit still exits 1 with five moderate development affected-package entries, while production audit and signatures pass. The vulnerability remains **OPEN and UNPATCHED**. This is conditional risk acceptance, not remediation or approval of future source changes. This updated source has not run on hosted CI; earlier hosted results apply to their recorded commits. The repository remains private; commit, push and public visibility require separate authorization.

A local software-engineering portfolio application for organization-scoped projects and visual graph design. An ASP.NET Core API and React frontend provide invitation-based access, administrator/developer permissions, and PostgreSQL-backed graph save/reload with optimistic concurrency.

**Graphs describe designs; they do not execute workflows, SQL, HTTP requests, custom code or generated APIs.** This is a locally verified academic portfolio application, with no production deployment or certification claim.

[Architecture](docs/ARCHITECTURE.md) · [Demo walkthrough](DEMO.md) · [Testing](TESTING.md) · [Security](SECURITY.md)

## Background and contributors

Originally developed by **Landon Dahmen, Zander Wysong, Telson Cowan and Jake McBride** as a four-person **South Dakota State University senior-design project, Fall 2024–Spring 2025**, associated with Triode Data Systems. The owner identifies this recovered copy as the April 2025 Senior Design Expo version, followed by a sanitation pass. Sponsor association does not imply endorsement of this portfolio copy.

**Landon's individual October 2026 modernization** added the current local security model, explicit reconstructed database setup, graph persistence/concurrency, automated verification, tooling upgrades and documentation. These improvements are separate from the original team's implementation. Landon reports original contributions to backend development, Python-assisted SQLite-to-PostgreSQL migration, APIs/testing, architecture and integration. The historical migration scripts are absent; this statement does not assign exclusive ownership of individual files. The original academic Git history was not recovered; the new portfolio repository's initial commit does not establish individual authorship of the original files.

## What the current application demonstrates

- HTTPS cookie authentication, CSRF protection, invitation-only developer registration, profiles and password changes.
- Organization-scoped administrators and developers restricted to assigned projects; backend authorization accompanies frontend route guards.
- Project creation with a developer assignment, scoped lists and administrator deletion. Reassignment, project rename and status updates are unavailable.
- Six React Flow design categories: API Trigger, HTTP Request, Database Query, Custom Logic, Send Response and SQL Table; node/edge editing for administrators and read-only inspection for assigned developers.
- Explicit save of validated declarative graphs to PostgreSQL JSONB, reload after navigation/refresh, and revision conflicts that retain the unsaved draft rather than overwrite newer data.
- Disposable-database integration/security/graph/browser verification and locally validated GitHub Actions definitions.

The original Backend-as-a-Service concept is historical context, not a claim of a working execution platform. Generic SQL/dynamic API features are disabled. Password recovery and distributed/durable authentication sessions are not implemented. The current website uses factual project information, unavailable-page messaging and original neutral assets; [third-party notices](THIRD_PARTY_NOTICES.md) record asset provenance and remaining licensing limits.

## Technology and architecture

| Layer | Current implementation |
| --- | --- |
| Browser | React 19, React Router 7, React Flow 11, Tailwind CSS 3 |
| Frontend tooling | Vite 8, Vitest 5, ESLint 10; editor route loaded on demand |
| API | C# / ASP.NET Core on .NET 10; cookie/CSRF authentication; BCrypt password hashing |
| Data | Npgsql 9, PostgreSQL 16.15; explicit SQL initialization/migrations |
| Local infrastructure | Docker Compose for PostgreSQL; trusted localhost HTTPS for API and frontend |
| Verification | xUnit, isolated SQL/controller tests, HTTP probes and installed Microsoft Edge via Playwright |

The browser sends credentialed HTTPS requests to the API. Server-side account, role, organization and assignment checks constrain parameterized Npgsql operations. PostgreSQL stores users, projects, invitations and declarative project graphs. Docker hosts PostgreSQL; the API and Vite run as local processes. The browser has no direct database connection.

See the editable [Mermaid architecture diagram and source map](docs/ARCHITECTURE.md). Exact dependency pins remain in the existing project/lockfiles; the table does not imply permission to upgrade them.

## Application screenshots

Actual Microsoft Edge captures from a disposable synthetic environment on October 30, 2026. No production/customer data is shown. Crops omit unconfirmed branding and credential-bearing areas; the application DOM was not altered for presentation. The two editor views use the same dimensions; form/dashboard crops retain their native proportions. [Capture provenance and limits](docs/screenshots/README.md).

**Administrator projects and invitation controls**

![Administrator project list with a synthetic assigned project and an empty invitation form](docs/screenshots/administrator-projects.png)

**Saved graph after a full page reload** — six design categories, two edges, revision 1.

![Administrator editor displaying a reloaded persisted six-node design and its execution-disabled notice](docs/screenshots/saved-graph-reloaded.png)

**Assigned developer access** — the same saved graph with creation/save controls restricted.

![Assigned developer inspecting the persisted graph in read-only mode](docs/screenshots/developer-read-only.png)

The [screenshot inventory](docs/screenshots/README.md) also includes the empty login form and project-creation dialog.

## Local development prerequisites

The verified environment is Windows, **PowerShell 7.2+**, **.NET SDK 10.0.403** (see `global.json`), **Node.js 22.14.0 / npm 10.9.2**, Docker Desktop using the Linux engine, and normally trusted localhost HTTPS certificates. Node must meet the manifest's engine range. Other OS/runtime combinations are not established by the Windows browser evidence.

Use a private local checkout and run the following from its root. No global tool installation or package upgrades are needed. Production/public hosting is outside these instructions.

### Restore and build

```powershell
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Restore
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Restore
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Build
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Build
```

Frontend restore uses the reviewed npm lockfile with lifecycle scripts disabled. Backend/test restore uses locked NuGet resolution. Keep the approved pins and do not substitute automatic audit-fix commands. Helper projects have separate restore/build requirements in [TESTING.md](TESTING.md) and the database guides.

### Database and private configuration

```powershell
pwsh -NoProfile -File scripts/Initialize-LocalEnvironment.ps1
pwsh -NoProfile -File scripts/Start-LocalDatabase.ps1
```

The initializer creates an ignored `.env` with independent random local passwords only when the file is absent; it does not overwrite valid existing settings. Do not print, commit or share that file. The development database defaults to `127.0.0.1:55432`, project `boilerroom-tds-portfolio`, container `boilerroom-tds-portfolio-postgres`, volume `boilerroom-tds-portfolio-pgdata`. Helpers refuse conflicting identities.

Numbered SQL initialization runs on a **new empty volume**. API startup requires schema markers 1/2/3. For an existing database, follow the explicit migration/backup procedures in [database/README.md](database/README.md) and [graph persistence](database/GRAPH_PERSISTENCE.md); never reset its volume to obtain a fresh demo. The supplied schema is a **2026 reconstruction**, not a recovered original database or migration history.

`Backend/appsettings.json` keeps its connection string blank. The API wrapper supplies process-only configuration; frontend `VITE_*` values are public and must contain no secrets. See [database authentication](database/AUTHENTICATION.md) for the restricted database role and operator provisioning.

### HTTPS and application startup

On a machine without the documented certificate, perform the normal local development-certificate setup once:

```powershell
New-Item -ItemType Directory -Path .local/https -Force
dotnet dev-certs https --export-path .local/https/localhost.pem --format Pem --no-password
dotnet dev-certs https --trust
```

Accept the normal OS trust workflow. Keep both generated PEM/key files private; never bypass browser or TLS validation. See [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) for verification and troubleshooting.

Start each application process in its own PowerShell terminal, after building:

```powershell
pwsh -NoProfile -File scripts/Start-LocalApi.ps1
```

```powershell
pwsh -NoProfile -File scripts/Start-LocalFrontend.ps1
```

Open **https://localhost:3000/login**; API origin is **https://localhost:8836**. Stop only your own application processes when finished. Leave persistent database resources intact.

## Demonstration and tests

[DEMO.md](DEMO.md) provides a repeatable isolated rehearsal and a human-readable tour of administrator provisioning, invitation registration, project permissions, graph persistence, revision conflicts and read-only access. Automated demo fixtures are removed by the guarded runner; they do not write to the persistent development database.

```powershell
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Unit
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Unit
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Lint
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Database
node scripts/validate-ci.cjs
```

Build/restore prerequisites and separate Windows security/graph/Edge commands are in [TESTING.md](TESTING.md). Fixture suites must run sequentially against disposable resources on port 55433, with strict TLS and ownership checks.

**Latest focused M7B.3 evidence:** 100 frontend tests, ESLint 0/0, production build without a chunk warning and 108 real Edge content/signup/role/graph smoke checks pass. Disposable fixtures/resources were cleaned and development data preserved. These focused results do not replace or rerun the full prior suites.

Verified local evidence through M7A.1: **36 backend unit tests, 87 frontend tests, six isolated PostgreSQL tests plus transactional SQL checks**, security **120 assertions / 139 responses**, graph **116 / 100**, and Edge **104 / 297** (M6B). Backend/compiler and ESLint warnings are zero; production compilation has no chunk warning. Two React Flow development diagnostics remain documented. M7B adds a separate **19-check screenshot capture**, not another run of those full suites. See [CODE_QUALITY.md](CODE_QUALITY.md) and [screenshot provenance](docs/screenshots/README.md).

The three [GitHub Actions workflows](.github/workflows) passed on initial main-branch commit `250927f603a40727dc5d42dc8af6564113865eee`:

- [Frontend verification](https://github.com/landonwdahmen/boilerroom-workflow-designer/actions/runs/41386325472): 100 tests across nine files, production build, lint and workflow validation passed.
- [Backend and isolated PostgreSQL](https://github.com/landonwdahmen/boilerroom-workflow-designer/actions/runs/41386325391): Release builds completed with zero warnings/errors; 36 backend unit tests and six PostgreSQL integration tests passed, with disposable-resource cleanup reported successful.
- [Complete dependency security checks](https://github.com/landonwdahmen/boilerroom-workflow-designer/actions/runs/41386325404): 31 audit-policy tests and both complete NuGet graph checks passed. The full npm audit disclosed the five unpatched moderate development-package entries under the approved conditional exception; production auditing and signature verification remained strict.

These Linux CI results do not claim execution of the separate Windows security, graph and Edge suites. Those retain their documented local evidence. See [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md) for the accepted advisory and remaining limitations.

## Security model and scope

The server validates authenticated database identity and tenant membership, including developer project assignment. Sessions use HttpOnly/Secure/Strict cookies, CSRF-protected writes, an absolute 30-minute default and revocation on logout/password change. Tickets are in-memory and end on API restart. Passwords use BCrypt and bounded input; invitation registration is email-bound, expiring and single-use. Explicit graph validation, parameterized SQL and restricted database credentials complement authorization.

These are selected verified local controls, not a security certification. Workflow execution remains disabled. Do not expose local services publicly. Read [SECURITY.md](SECURITY.md), [EDITOR_SECURITY.md](EDITOR_SECURITY.md) and [authentication details](database/AUTHENTICATION.md) for the actual boundaries.

## Publication, licensing and acknowledgments

The owner confirms that the original senior-design source may be published on their personal public GitHub portfolio with appropriate attribution. This records their confirmation; supporting permission documentation has not been reviewed and it is **not described as written authorization**.

This is a **source-available portfolio presentation**. **No broad first-party open-source license has been selected or granted.** Publishing on GitHub permits viewing and forking under GitHub's terms; it does not automatically grant broad independent reuse rights. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) identifies verified component notices, the original neutral mark's provenance and the unresolved xunit.abstractions exact-license issue. Those licenses apply to their identified third-party material, independently of first-party licensing. Preserve all four original team credits. Confidentiality, final selected-file security/notice review and publication authorization remain separate. Local Git initialization, the initial commit, private repository creation and the approved private source upload are complete. The repository remains private; public release has not been approved, and the application has not been deployed. The exact historical xunit.abstractions 2.0.3 license text remains unresolved; this source edition includes dependency references and locks, not its package binaries or copied source.

Thanks to the original SDSU team and academic project context, and to the maintainers of the frameworks and tools named above. This acknowledgment makes no sponsor endorsement or exclusive authorship claim.

## Clean source edition

This source-available portfolio edition retains buildable backend/frontend source, all meaningful tests and guarded tools, versioned schema reconstruction, exact manifests/locks, local setup guidance, architecture and five reviewed synthetic screenshots. Historical Bruno collections, obsolete HTTP/blocked PowerShell probes, disconnected frontend prototype modules, old CRA templates and private audit/relocation records are preserved privately in the development workspace. Dormant backend types remain because SDK compilation and legacy-contract tests require them. No historical source authorship is reassigned.

This copy contains no dependencies, compiled output, database data, private TLS exports or local .env. Restore generates private output; keep it excluded. Database Compose uses fixed development identities, so never start it concurrently with another copy on the same Docker Engine or adopt an existing database merely to test this export. Dedicated Gitleaks results and current CI-policy/risk evidence are verified privately against each exact candidate before publication. No first-party open-source license is supplied.

## M7C.2 staged verification — November 1, 2026

Fresh selected-copy Release build passes with zero warnings/errors; production frontend build passes (553 modules; initial JS 336.78 kB/gzip 96.10; deferred editor 175.62/gzip 56.28; no chunk warning). All four helper builds, three local workflow validations and 31 focused audit-policy tests pass. The actual full npm audit exits 1 with the same five moderate entries; production and signatures exit 0, zero invalid/missing signatures. The separate policy process exits 0 only after all reviewed conditions pass. Prior 36 backend units, 100 frontend tests, lint 0/0 and completed NuGet evidence are reused; these suites were not unnecessarily repeated.

**Historical M7C.2 attempt:** Fresh isolated browser verification was attempted but **blocked before browser assertions**: the API logged HTTPS startup, while Windows socket enumeration exposed no corresponding listener, so independent process/socket ownership could not be established. The guard was not weakened or bypassed; no fresh frontend startup/authentication/project/graph browser pass is claimed. Fresh guards identified only the failed invocation's disposable resources; its isolated marker and zero business rows were verified before exact container/volume/network disposal. The original development schema markers 1/2/3 and established business/M2 fingerprint matched before and after, its resource inventory was unchanged, and its original stopped state was restored. Raw journals, credentials and reports remain private.

**Subsequent runtime resolution (M7C.2A):** The isolated Microsoft Edge verification passed 105 assertions across 299 API responses, with zero false assertions, uncaught page errors or external requests. Fixture cleanup and disposable-resource removal succeeded; development fingerprints and resource inventory were preserved, and the development container's original stopped state was restored.

**Historical M7C.2A method:** That verification used a private Windows listener adapter validated by 21 focused cases. The adapter was not included in the source edition at that checkpoint, and the shipped Windows wrapper did not complete unchanged on the verification host. The M7C.3G section below records the subsequent distributed correction and its separate fresh results.

**Verified repository checkpoint through M7C.3E:** Local Git initialization and the private GitHub upload are complete. All three hosted workflows passed for the initial main commit. The three featured README images and the architecture Mermaid diagram passed manual GitHub rendering review. Public visibility remains a separate approval decision. The accepted minimatch advisory remains open and unpatched; the source-only xunit.abstractions 2.0.3 historical exact-license limitation and absence of a broad first-party open-source grant remain unchanged.

## M7C.3G — distributed Windows verification correction

The affected Windows host returned real listening sockets with misleading state metadata. The runner now loads [WindowsListenerGuard.ps1](scripts/WindowsListenerGuard.ps1) only for Windows Security/Graph/Browser verification. Native IPv4/IPv6 listener-only owner-PID tables independently establish listening status; raw state is diagnostic. Exact port/loopback/PID, executable and command argument paths, parent and creation time, two consistent observations and unfiltered CIM corroboration remain mandatory. Normally trusted localhost HTTPS is checked without a validation callback, proxy, redirect or HTTP fallback, then ownership is rechecked. Missing APIs, ambiguous listeners, identity mismatch, process exit or TLS failure stop verification. Linux's Database path does not load Windows interop.

Fresh local results from this updated checkout's actual shipped runner, not a private adapter:

- **44 focused Windows guard tests** pass, including real IPv4/IPv6 ownership/disposal, misleading state, identity/ambiguity/failure/timeout cases, untrusted TLS rejection and owned-child cleanup isolation.
- **Security: 120 assertions / 139 responses; Graph: 116 / 100; Microsoft Edge: 105 / 296**, all passing with zero false assertions. Graph includes both API-only and isolated-database restart checkpoints. Edge reports zero uncaught page errors and zero external requests.
- Each suite completed synthetic fixture cleanup and removed only its verified disposable resources. Development schema 1/2/3, the established logical business/M2 fingerprint, and all original Docker resource identities/inventory were preserved. The separately authorized existing development container was used only for read-only baseline checks and restored to its original stopped state. No persistent data/schema or unrelated resource was modified.

Run the focused checks on Windows with `pwsh -NoProfile -File scripts/Test-WindowsListenerGuard.ps1`. Full-suite prerequisites and commands remain in [TESTING.md](TESTING.md). Verified matching generated artifacts were reused; no dependency was installed/upgraded and no OS certificate trust was changed. These are selected local results, not proof on every Windows version or a fresh hosted Linux run.

**M7C.3I source-review renewal and local verification:** Explicit owner approval covers only the exact M7C.3G source/install/workflow/exposure conditions and approved fingerprint refresh. All 31 policy tests and seven applied-state checks pass; source/install/workflow verification and the actual strict dependency runner pass. Fresh full npm audit: raw exit 1, same five moderate entries; conditional policy: exit 0; production audit: exit 0/zero findings; signatures: exit 0/zero invalid or missing. Fresh NuGet complete-graph checks report zero vulnerabilities for backend and tests. Current upstream review finds no compatible parent-supported fix and unchanged advisory evidence. Production proof has 218 emitted modules, zero affected or external modules. New advisories, affected paths/versions, source/inventory/configuration/workflows, input exposure, incomplete safeguards or compatible fixes still invalidate review. The release inventory contains 201 distributable files including both new scripts; the unstaged Git index still contains 199 until a separately authorized commit preparation. Historical manifests, source-available terms, four-person credits, separate 2026 modernization and the xunit.abstractions historical exact-license limitation remain preserved. No commit/push/publication occurred.
