# Local demonstration

This guide presents the verified October 2026 local portfolio behavior, separate from the original four-person 2024–2025 SDSU implementation. Use synthetic identities and inert graph metadata throughout. There is no hosted demo, workflow execution or public administrator-registration endpoint.

## Repeatable isolated rehearsal

The existing browser regression is the supported **automated, disposable demonstration**. It provisions its own synthetic organizations and administrator accounts, starts the built API and Vite, drives actual Edge, verifies the steps below, and cleans up. It does not leave an interactive demo server running or expose fixture passwords for manual use.

1. Follow [README prerequisites/restore](README.md#local-development-prerequisites), [HTTPS setup](FRONTEND_INTEGRATION.md) and [TESTING.md](TESTING.md). Docker must be responsive in Linux mode and the digest-pinned image must already be cached. The runner uses `--pull never`; consult TESTING for a new authorized machine. Do not reset Docker or persistent resources to make the test pass.
2. Restore missing helper assets using the official source and enabled vulnerability auditing below, then build the API/test projects and all four helpers **before** starting any API. On an already built workspace, reuse matching verified artifacts; do not restore/rebuild solely to repeat a completed presentation check.
3. Leave the existing development PostgreSQL container/volume unchanged. Ports 3000, 8836 and 55433 must be free of application/test listeners; stop only processes you own. Do not stop the development database to make room.
4. Run the existing guarded browser suite, providing the real absolute path to an **already installed** Playwright module. Do not install packages or bypass certificate checks to run this demonstration.

```powershell
# First setup only, if helper restore assets are missing. Keep vulnerability checks enabled.
foreach ($helperName in @('SecurityRegressionProbe', 'GraphIntegrationProbe', 'BrowserWorkflowFixture', 'LocalAdministrator')) {
    dotnet restore "tools/$helperName/$helperName.csproj" --source https://api.nuget.org/v3/index.json --disable-parallel -p:NuGetAudit=true -p:NuGetAuditMode=all
    if ($LASTEXITCODE -ne 0) { throw 'Helper restore failed; stop and review before continuing.' }
}

pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Build
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Tools
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Browser -PlaywrightModule '<absolute path to an existing playwright module>'
```

The module-path placeholder must be replaced; it is not a command to run literally. This is the full established browser regression, including real one-minute expiry testing, not the smaller M7B screenshot capture. Run fixture suites sequentially. No credentials are accepted on this command line or printed by the fixture.

The wrapper uses standalone `compose.tests.yaml`, an explicit empty env file and random run-owned `boilerroom-tds-m6a-<run>` resources. Only the disposable database on loopback 55433 is written. Fresh guards verify the image, labels, exact volume attachment, schema and test marker. Private evidence stays under ignored `.local/m6a/<run>`. The persistent development volume and original M2 fixture are fingerprinted read-only before/after.

## What to show and explain

These are the actual UI steps exercised by the browser runner, also suitable as a narration alongside the [reviewed screenshots](docs/screenshots/README.md). A human tour requires a separately provisioned synthetic environment; do not extract the automated fixture's private credential stream or point its cleanup at another database.

| Step | Action and expected behavior |
| --- | --- |
| Operator provisioning | The guarded fixture transactionally creates synthetic organization A/admin A and organization B/admin B using the shared provisioning code. Administrator creation is local-operator-only, not public signup. |
| Administrator sign-in | Open `/login`, sign in with privately provisioned credentials, then refresh. The cookie-backed session restores the organization dashboard. No credentials belong in screenshots. |
| Invitation | Use **Invite a developer** with a synthetic `example.test` address. Privately transfer the one-time, email-bound code; dismiss the displayed code before any screen capture. Reuse/expiry/duplicate attempts are rejected by the established regression. |
| Developer registration | In a separate browser context, register using the matching invitation email and private code. Registration requires an explicit subsequent login; it does not grant administrator privileges. |
| Project creation | Refresh the administrator user list, choose **Create New Project**, enter a synthetic name/description and assign the invited developer. Assignment is made at creation; no project reassignment/rename/status feature is claimed. |
| Permissions | The assigned developer sees that project. Foreign organization/project requests and developer administrator access are denied. UI hiding supplements server enforcement. Use existing regression assertions instead of trying foreign IDs from real data. |
| Graph design | As administrator open **Playground**. Add API Trigger, HTTP Request, Database Query, Custom Logic, Send Response and SQL Table; connect permitted handles. Configure a harmless `https://example.invalid/` URL and synthetic table/column descriptions when required. No request or SQL is executed. |
| Explicit persistence | Click **Save graph**, observe the saved revision, refresh and reopen the project. Nodes, edges and allowed properties reload. Editing alone is not persistence. Code/query/body/parameters are excluded and nonempty excluded values are rejected. |
| Revision conflict | Open the saved graph in two administrator tabs. Save an edit in the first, then save the stale second draft. Expect 409 and a retained draft; explicitly choose **Reload saved graph** only when ready to discard that draft. No automatic merge/overwrite is claimed. |
| Read-only inspection | In the assigned developer context open the same graph. Verify the read-only status, disabled creation/deletion, no Save control and the persisted graph. API writes remain denied even if UI controls are circumvented. |
| Session boundaries | The established runner also checks logout, password-change revocation and real expiry with its supported test-only one-minute lifetime. Normal local sessions default to 30 minutes. |

## Interactive local setup reference

[README startup](README.md#local-development-prerequisites) starts the persistent local application. For a **deliberately configured synthetic local database**, the existing operator tool can create a new organization and administrator interactively:

```powershell
dotnet run --project tools/LocalAdministrator/LocalAdministrator.csproj --configuration Release --no-build
```

Build/restore the tool first. It uses the configured local database, prompts for synthetic name/email/organization, hides the password and performs transactional creation rather than overwriting accounts. Use only `example.test` identities and a newly chosen private password meeting its documented limits. Verify the configured target before executing: this tool is **not** a disposable-environment launcher and must not be run against the preserved development fixture merely to repeat a presentation. There is no current unattended interactive-demo provisioning/teardown wrapper. Prefer the guarded automated rehearsal above; do not invent manual DELETE/reset commands for cleanup.

## Cleanup and evidence

Successful rehearsal requires probe completion, exact-owned synthetic row cleanup, restored empty test business tables, unchanged development fingerprint and existing resource inventory. The runner stops only its application processes and removes only its freshly verified disposable container, volume and empty network. A passing `result.json` records preservation and resource removal.

If any guard/test fails, stop. Failed test resources are deliberately retained with an ownership journal. After investigating, the documented [journaled cleanup procedure](TESTING.md#database-isolation-and-failure-recovery) rechecks ownership before removal. Never use `docker compose down -v`, volume prune, persistent database resets or deletion of uncertain rows/resources. Keep sanitized private evidence; do not upload `.local`, traces, credentials or raw fixture output.

## Verification status

M6B's established full Edge suite passed **104 assertions / 297 API responses**, alongside the separate security/graph/database suites. M7B's fresh screenshot workflow passed **19 focused checks** with Edge 156.0.4314.50, trusted TLS, no uncaught page errors or external requests, and successful cleanup/development preservation. It captured invitation registration, project assignment, graph save/reload and developer read-only access; it did not rerun conflict/revocation/expiry coverage. See [PORTFOLIO_PRESENTATION_REVIEW.md](README.md) for dated evidence and the single capture-harness correction.
