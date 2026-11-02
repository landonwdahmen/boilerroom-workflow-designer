# Project graph persistence — October 2026 portfolio work

This is individual modernization of the original four-person SDSU/TDS academic application. It stores **design configuration**, with no workflow execution, outbound node requests, user-authored SQL, JavaScript interpreter or generated endpoints. Original team attribution and publication restrictions remain in the root README.

**Acceptance: complete for the approved local M4B scope, October 28, 2026.** Following owner-operated Windows/WSL recovery, the graph probe passed **116 recorded assertions/100 HTTP responses**, full security regression **120/139**, actual Edge **104/301**, and frontend **83 tests/six suites**. Release/production builds pass. Separate API-only and normal project-database restarts preserve nodes, edges, positions, properties, revision and creation timestamp. Empty replacement, project-delete cascade, stale/concurrent saves, invalid-input preservation and permissions pass. All final runner fingerprints are restored; retained state is users=0/projects=1/organizations=1/test=0/invitations=0/graphs=0, with the original M2 fixture intact. Task API/frontend are stopped; database healthy. See PLAN section 15.1 for exact commands, failed intermediate attempt, evidence and limits.

Historical October 24 run `3ddfaa054a3140d7a54b2e4d13a06dd6` remains recorded as incomplete (102 assertions/86 responses). Its pending records were cleaned on October 28 by the guarded recovery command: nine directly deleted rows plus its graph cascade; other business rows preserved. Separate `recovery.json` records that result without rewriting the original failure.

## Storage and migration

Apply `scripts/Update-LocalGraphSchema.ps1` from the repository root with PowerShell 7.2+, after the existing authentication migration. Shared guards verify local engine, exact project labels/image/volume/loopback binding and original schema marker. The bootstrap role applies `database/init/003-project-graphs.sql` explicitly; marker 3 is `boilerroom-tds-portfolio-graphs-v3`. Reapplication is a no-op. Fresh empty volumes use numbered initialization 001, 002, 003; never reset an existing volume to migrate.

`project_graphs` has `project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE`, `schema_version integer=1`, positive `revision bigint` bounded by JavaScript's maximum safe integer, `document jsonb`, and nonnull `created_at`/`updated_at timestamptz`. Checks require an object with version 1 and node/edge arrays, and updated_at >= created_at. The primary-key index supplies the one-row constraint, lookup and FK cascade. No separate tenant column duplicates project ownership. The bootstrap role owns the table; the existing restricted API role has graph CRUD and no DDL. Application validation is stricter than the database's structural checks; direct operator SQL is not an alternate supported graph writer.

Migration and repeated no-op were runtime verified against the existing volume. The complete original five-business-table fingerprint matched before/after both applications; the new graph table initially contained zero rows. No users/projects/organizations/assignments/fixtures were migrated, replaced or deleted by DDL. The API wrapper and startup now require schema marker 3; neither migrates implicitly. Test cleanup fingerprints include all six business tables, including graphs.

## API contract

GET and PUT `/api/auth/projects/{projectId:guid}/graph` use the existing secure cookie, DB-validated account, no-store responses and explicit localhost HTTPS CORS. PUT is the only added CORS verb. Every PUT requires identity-bound CSRF. IDs must be existing project UUIDs; clients never submit organization/role/owner fields.

- Own-organization administrator: GET and PUT. Assigned developer in that organization: GET only. Developer PUT: 403. Anonymous: 401.
- Foreign, missing or unassigned project: concealed 404. Route IDs that are not UUIDs do not match and return 404. Removing an assignment takes effect on the next GET.
- Authorized project with no row: 200, revision 0, null timestamps and empty version-1 graph. A saved empty graph has positive revision and timestamps.
- Invalid document/envelope: 400, oversized graph/body: 413, stale revision: 409. Errors never echo submitted graph/SQL/database details. Unsupported/corrupt stored data returns a safe 500 instead of rendering or repairing it.

PUT body:

```json
{
  "expectedRevision": 0,
  "graph": {
    "schemaVersion": 1,
    "nodes": [{"id":"trigger_1","type":"apiTrigger","position":{"x":80,"y":80},"data":{"label":"Synthetic design","path":"/synthetic/design","method":"GET"}}],
    "edges": []
  }
}
```

Successful GET/PUT envelope: `{projectId, revision, createdAt, updatedAt, graph}`. Timestamps are UTC ISO strings (null only for revision 0). PUT returns the full accepted graph and incremented revision. Schema version and save revision are separate concepts.

## Allowed document and limits

Only root `schemaVersion`, `nodes`, `edges`; node `id`, `type`, `position:{x,y}`, `data`; edge `id`, `source`, `target`, `sourceHandle:"out"`, `targetHandle:"in"`, `type:"default"`. Unknown and duplicate JSON property names are rejected, including inside JSON-text header/column fields. Nodes/edges have separate unique ID sets, matching ASCII `[A-Za-z0-9_-]{1,100}`. Endpoints must exist; self/duplicate links, cycles, response outputs and trigger inputs are rejected.

| Bound | Value |
| --- | --- |
| Graph aggregate | 12 KiB UTF-8: submitted graph text and normalized System.Text.Json serialization; whitespace/HTML/non-ASCII escaping can affect this bound |
| Global HTTP request | Existing 16 KiB limit retained |
| Nesting | <=16, including separately parsed header/column JSON text |
| Nodes / edges | 100 / 200; aggregate size may be reached first |
| Label / other property | Nonblank label <=100 UTF-16 characters; string properties <=4096 |
| Coordinates | Finite numbers, absolute value <=100000 |
| Expected revision | Integer 0 through 9007199254740990; stored revision <=9007199254740991 |

Every node's data requires label. Per-type allowlist:

| Type | Persisted configuration |
| --- | --- |
| apiTrigger | path starting `/`, without query/fragment/control characters; method GET/POST/PUT/DELETE/PATCH |
| httpRequest | Absolute HTTP(S) URL without user info/query/fragment/control characters, method, optional headers |
| databaseQuery / customLogic | Label only; disabled placeholders |
| sendResponse | Status string 100–599; optional headers |
| sqlTable | Identifier tableName; JSON-text columns array with 1–50 unique case-insensitive identifier names |

Headers are optional empty text or JSON-object text, with only exact `Accept` and `Content-Type` keys and fixed MIME values `application/json`, `text/plain`, `application/octet-stream`. Column types are INTEGER/TEXT/VARCHAR/BOOLEAN/UUID/TIMESTAMP/NUMERIC; optional primaryKey/autoIncrement/notNull are booleans; optional length is integer 1–4096 for VARCHAR only. Identifier names match `[A-Za-z_][A-Za-z0-9_]{0,62}`. No defaults/expressions or SQL are stored/interpreted.

Code, raw queries, parameters and request bodies are excluded. The serializer omits their empty editor defaults; nonempty entered values produce an explicit error and remain in the draft until the user clears them. No silent discard on save. Runtime measurements, selection, implementations, nodeDefinitionId, callbacks and results are omitted; trusted node types reconstruct renderer/default metadata. Text renders through React escaping. These restrictions cannot identify a secret pasted into an ordinary label/path: use synthetic metadata only, never real records, passwords, keys or confidential text.

## Revisions and editor behavior

Initial expectedRevision 0 uses INSERT ON CONFLICT DO NOTHING. Updates use parameterized UPDATE with matching revision and increment, joined to the validated account's project organization. A transaction locks the scoped project FOR KEY SHARE against deletion; competing graph writers still race through atomic compare-and-swap. Exactly one initial/update writer wins, with the other returning 409. No blind retry, merge or silent overwrite. Creation time remains unchanged; update time advances. Project deletion cascades its graph; the actual HTTP delete/SQL absence check passed after recovery.

Opening an authorized project loads/validates its saved graph before mounting the canvas. Explicit administrator Save, Reload saved graph, loading/saving/error messages, dirty detection and saved revision are implemented. Edits are disabled while loading/saving. Save failures retain the draft; an uncertain network response does not prove the server did not commit. A stale save disables retry until explicit reload, with discard confirmation. Read-only developers can select/inspect but cannot mutate through controls, callbacks or reducer.

Unsaved edits warn on browser unload and the editor's Back to dashboard / Reload controls. Browser-controlled warning wording is normal. BrowserRouter's other in-app history transitions are not comprehensively blocked; no durable draft cache or full navigation blocker was added. Account/project changes invalidate old access; focus rechecks project permissions without silently loading over a still-valid draft. Single-process sessions still end on API restart. No autosave, named graphs, history UI, collaboration, import/export, graph execution or schema generation.

The verified database restart procedure stops the API before restarting PostgreSQL, then starts the API again. Keeping a live API continuously available through a database outage was not tested or claimed.

## Repeatable verification and interrupted-run recovery

**Current M6A automation:** [TESTING.md](../TESTING.md) documents `pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Graph`. It runs the unchanged graph probe against new synthetic resources and automates both existing independently verified API-PID continuation checkpoints. Only the run-owned test database is restarted; the development volume/M2 fixture is preserved. Frontend tests now use `npm.cmd test` (Vitest), superseding the historical CRA/Jest flags below. The earlier manual recovery/evidence remains historical and applies only to its specifically owned reports.

Build before starting the API on Windows. Reuse existing assets; run restore below only when assets are missing. Do not reapply an already verified migration for every test run:

```powershell
dotnet restore tools/GraphIntegrationProbe/GraphIntegrationProbe.csproj --source https://api.nuget.org/v3/index.json --verbosity minimal
dotnet build tools/GraphIntegrationProbe/GraphIntegrationProbe.csproj --configuration Release --no-restore --verbosity minimal
pwsh -NoProfile -File ./scripts/Update-LocalGraphSchema.ps1
pwsh -NoProfile -File ./scripts/Start-LocalApi.ps1 -SessionMinutes 30
```

In another shell first validate Docker with shared helpers, then independently verify the sole 8836 listener is 127.0.0.1 and its PID/command line identifies this workspace's Release DLL. Run `dotnet tools/GraphIntegrationProbe/bin/Release/net10.0/GraphIntegrationProbe.dll <verified-api-pid>`. It uses pinned local TLS validation, private in-memory credentials, synthetic invitations/projects and sanitized ignored reports. At the first checkpoint, stop/restart only that API, independently verify its new listener/PID and write **only that integer PID** to the displayed `continue-api-pid.txt` within four minutes. After API-only readback, a second checkpoint requests stopping the API, normally restarting only the guarded project DB (no reset), restarting the API, re-verifying identity and writing its new PID to `continue-pid.txt`, again within four minutes. Keep the same container, volume, image and unrelated resource states. Bound Docker operations; stop on timeout. Do not print credentials/cookies or use the blocked PowerShell test.

The probe clears only its own idle Npgsql data-source pool before post-restart SQL readback. Recovery attempt `edb969840763484dad5b0b8bac496a58` proved both HTTP durability stages but then stopped before its SQL assertion while retaining pre-restart idle connections; cleanup restored the baseline. The corrected run completed SQL readback, empty replacement and cascade checks. No application connection policy or write-retry behavior changed. Exception diagnostics retain category names only, without messages or payloads.

The probe's guarded finally cleanup removes only its own synthetic organizations/rows, refuses unexpected rows, and compares all six business-table fingerprints. An infrastructure failure can prevent cleanup. For an interrupted run, first restore normal project-container inspection/connectivity and rerun ownership/schema guards. Then use `dotnet tools/GraphIntegrationProbe/bin/Release/net10.0/GraphIntegrationProbe.dll --cleanup-owned-run <32-hex-run>` for that existing local report. Recovery derives the second exact organization through its run-bound synthetic administrator email, rejects unexpected records and checks the fingerprint of all other business rows before committing. It writes separate `recovery.json` and does **not** turn an incomplete original probe into a passing run. This recovery branch was runtime-verified on October 28 against the exact interrupted fixture.

Run the existing security probe and guarded `scripts/Test-LocalBrowser.ps1` **sequentially**, after clean baseline restoration. Use the supported one-minute API session setting for their real expiry checks; after security's deliberate 429, allow the normal rate window to expire before browser logins. The expanded Edge runner passed the earlier workflows/editor checks and new persisted/reloaded/read-only/conflict/invalid-response cases, using installed Playwright 1.62.1 / Edge 156.0.4314.50 with normal TLS. Reports use America/Chicago dates. Frontend automated tests use `npm.cmd test -- --watchAll=false --runInBand`; production build uses the existing reviewed `npm.cmd run build`. The sandbox initially denied a Jest cache rename; the approved identical command outside the sandbox passed all 83 tests. No dependency install or security-policy change was required. Mocked tests and compilation are separate from real browser/database evidence.

Final ignored evidence: `.local/graph-probe/18fd078e738d42bc8fe8589cbfd7d9f5/report.json`, `.local/security-probe/bfa3f4493b4f4a04b972873c9ff9449c/report.json`, and `.local/browser-probe/e5e32a66a16d4b8ba0f92b98b035af1f/report.json`. The browser run has zero recorded page errors/external requests; synthetic administrator/developer saved-graph screenshots were visually reviewed. These are selected Windows/local checks, not production serving, comprehensive security/accessibility/cross-platform coverage, or execution functionality.
