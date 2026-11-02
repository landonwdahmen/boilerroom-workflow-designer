# Local PostgreSQL setup

This is new October 2026 reconstruction of the active Npgsql contract, not a recovered Expo database. See [schema assumptions](SCHEMA_INVENTORY.md), [authentication](AUTHENTICATION.md) and [graph persistence](GRAPH_PERSISTENCE.md). No original/development database or export is included; use synthetic local data only.

## Prerequisites and resource identities

Docker Desktop in Linux containers mode, Compose supporting up --wait, PowerShell 7.2+, and the .NET/Node tools in the [root README](../README.md). Compose digest-pins PostgreSQL 16.15. Existing approved image/helper pins remain unchanged.

| Resource | Development default |
| --- | --- |
| Compose project |boilerroom-tds-portfolio|
| Container |boilerroom-tds-portfolio-postgres|
| Named volume |boilerroom-tds-portfolio-pgdata mounted at /var/lib/postgresql/data|
| Host binding |127.0.0.1:55432 to container 5432|
| Initialization |This checkout's database/init mounted read-only at /docker-entrypoint-initdb.d|

**Do not start this candidate concurrently with another copy on the same Engine.** Fixed names can address an existing initialized database. Verify resource identities before any operation; an old bind path does not mean its volume is empty. This export verification does not start/modify any Docker resource. Never down -v, prune, reset or delete a persistent database to obtain passing tests.

## Create private configuration and start a deliberately selected local database

Run from the checkout root only after selecting and verifying the intended local target:

```powershell
pwsh -NoProfile -File scripts/Initialize-LocalEnvironment.ps1
pwsh -NoProfile -File scripts/Start-LocalDatabase.ps1
```

The initializer creates an ignored root .env only when absent, using independent random bootstrap/application passwords. It does not overwrite existing settings. [.env.example](../.env.example) documents names; never print or publish actual .env values. Backend appsettings keeps its connection string blank; Start-LocalApi supplies process-only configuration. No personal records or imported historical database is required.

Initialization scripts 001/002/003 run once on a **new empty volume**. Existing initialized volumes retain their contents; changing the bind source does not rerun initialization. Review the target/schema and obtain an appropriate private verified backup before any explicitly authorized additive migration. For an older existing local schema, apply authentication 002 before graph 003 using the existing guarded helpers:

```powershell
pwsh -NoProfile -File scripts/Update-LocalAuthenticationSchema.ps1
pwsh -NoProfile -File scripts/Update-LocalGraphSchema.ps1
```

These are explicit operator steps, not automatic startup migrations and not commands executed by release verification. API startup requires markers 1/2/3. Bootstrap owns DDL; the API uses a separate non-superuser CRUD role with scoped application authorization. User IDs are text; project IDs are UUID. Parameterized SQL, constraints and role grants are retained. Dormant SDDG/dynamic-helper tables are not reconstructed or activated.

## HTTPS, accounts and tests

Follow normal [trusted local TLS setup](../README.md#https-and-application-startup), then Start-LocalApi/Start-LocalFrontend. Do not expose services publicly or bypass certificate checks. Administrator provisioning is local-operator-only; developer registration requires a valid email-bound invitation. No preloaded real or demo login credentials are distributed.

[TESTING.md](../TESTING.md#database-isolation-and-failure-recovery) describes standalone compose.tests.yaml, fresh run-owned resources, synthetic credentials, test-only marker and loopback 55433. Do not merge that file into development Compose or apply its fourth marker to development. Tests compare development state read-only, write only the isolated DB and remove only freshly verified owned resources after success. Retired HTTP/blocked PowerShell probes, one-time fixture INSERT scripts and private recovery/backup evidence are deliberately excluded. Guarded application-specific migration/test cleanup tools remain included because their target/ownership checks are part of safe reproducibility.
