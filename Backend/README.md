# ASP.NET Core backend

Recovered four-person SDSU 2024–2025 senior-design implementation with individual October 2026 portfolio modernization. Credits and source-available scope are in the [root README](../README.md). Current target is .NET 10; global.json selects SDK 10.0.403 with latestPatch and no prerelease. Npgsql 9.0.3 and BCrypt.Net-Next 4.0.3 retain their approved versions.

Build from the root using the [test/setup commands](../TESTING.md). Configuration starts blank; Initialize-LocalEnvironment creates ignored synthetic local credentials. Start-LocalApi supplies process-only DB/TLS settings and an explicit backend content root. No UserSecretsId or production deployment configuration is claimed.

The API requires Development, loopback HTTPS 8836 (hostname localhost), trusted local TLS and database markers 1/2/3. Framework cookie/CSRF authentication, database identity/role/tenant/assignment checks, invitation registration and graph validation/persistence remain enforced. Public developer registration requires a valid email-bound invitation; administrators are provisioned locally.

See [database setup](../database/README.md), [authentication](../database/AUTHENTICATION.md), [graph contract](../database/GRAPH_PERSISTENCE.md) and [security scope](../SECURITY.md). Generic SQL/API-key execution, graph execution and the legacy backup scheduler remain disabled. Dormant compiled types are retained for build/test compatibility, not advertised as working features. Never run imported legacy code or reset a database to demonstrate this project.
