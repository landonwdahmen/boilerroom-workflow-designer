# Local testing and evidence boundaries

**M7C.2 local preparation:** the accepted minimatch advisory remains unpatched and visible (five moderate package entries, one advisory). The dependency runner now evaluates only that exact reviewed graph and source/install/workflow/production/upstream conditions; new or unverifiable inputs fail closed. Production auditing remains zero-only and registry signatures remain required. See [dependency evidence](DEPENDENCY_SECURITY.md) and [testing](TESTING.md). GitHub-hosted CI has not run. This private source-available candidate has no first-party open-source grant or upload approval. Original four-person credits and separate October 2026 modernization remain unchanged.

Use PowerShell 7.2+, .NET SDK selected by global.json, Node 22.14.0 and npm 10.9.2. No global tool installation, lifecycle hooks, security bypass or dependency upgrades are needed. These commands operate on this checkout, not private original-machine paths.

## Repeatable commands

From the checkout root:

```powershell
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Restore
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Restore
dotnet build "Backend/TDS New - Copy.sln" --configuration Release --no-restore
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Build
pwsh -NoProfile -File scripts/Test-Backend.ps1 -Task Unit
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Unit
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Lint
pwsh -NoProfile -File scripts/Test-Frontend.ps1 -Task Build
node scripts/validate-ci.cjs
```

Frontend restore uses locked npm ci with hooks disabled and bounded registry requests. Backend/test restore uses locked-mode resolution and all-graph NuGet auditing; advisory warnings are not suppressed. The production backend has no separately checked-in NuGet lock; its direct versions are exact references, with the test graph protected by packages.lock.json. No offline restore or fully cold package cache is implied.

## Inventory and evidence boundaries

| Layer | Established development-workspace evidence | Limits |
| --- | --- | --- |
| Backend unit |36 xUnit cases|No DB or certificate; production authentication/session/graph validation and dormant required/null contracts.|
| Frontend |100 Vitest cases across nine files|Existing routing/auth/transport/graph/editor plus content/navigation/signup coverage; jsdom geometry is mocked.|
| PostgreSQL/controller |Six cases plus transactional SQL checks|Real restricted-role DB and production controller methods; no HTTP middleware coverage.|
| Security HTTP |120 assertions /139 responses|Cookies/CSRF/invitations/tenant-role-project boundaries/revocation/expiry with strict TLS.|
| Graph HTTP/DB |116 assertions /100 responses|Validation/scoping/races/conflicts/readback plus API and isolated DB restart checkpoints.|
| Full Edge |104 assertions /297 responses (M6B)|Actual Vite/API/DB/Edge, normal certificate trust; full helper has subsequently been updated for checkbox removal and not rerun as a whole.|
| Focused Edge |108 checks (M7B.3)|Content/signup/session/roles/project and six-node/two-edge graph save/reload/read-only smoke; successful fixture/resource cleanup.|

Fresh candidate-specific checks are recorded privately during release verification. Earlier development runs are dated prior evidence, not new staged runtime or hosted CI passes. No coverage percentage or production/security certification is claimed. Two known development-only React Flow StrictMode diagnostics remain documented; protections are not disabled to hide them.

## Database isolation and failure recovery

Do not run database/browser suites merely to repeat a passed check. When independently authorized, use the standalone compose.tests.yaml and existing guarded wrapper, never development Compose as a write target:

```powershell
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Database
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Security
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Graph
pwsh -NoProfile -File scripts/Test-IsolatedDatabase.ps1 -Suite Browser -PlaywrightModule '<absolute path to an existing playwright module>'
```

Restore and build missing helpers before starting the API, as documented in [DEMO.md](DEMO.md). Real HTTP/Edge suites require Windows process/socket checks, an already installed Playwright module and normally trusted private localhost TLS. No automatic browser install or certificate bypass. Build/unit tests do not require TLS exports.

Each invocation owns a random 32-hex boilerroom-tds-m6a run, separate container/volume/network, explicit empty env file, loopback 55433 and a test-only marker. The isolated compose file intentionally uses public synthetic 64-character test passwords; they grant no development/production authority. HTTP fixture credentials remain random/private child stdio. Never print fixture streams. Do not run two fixtures concurrently.

Fresh guards verify labels/run/image/attachment/port/schema before writes, compare development schema/M2/six-table fingerprints and existing resource inventory, and remove only newly owned resources after success. Failed resources remain for inspection. For an exact known run, after reviewing its private journal and failure, guarded cleanup rechecks ownership:

```powershell
pwsh -NoProfile -File scripts/Remove-IsolatedTestResources.ps1 -Run '<exact 32-hex run ID>'
```

Never reset a persistent database, prune Docker, adopt foreign resources, disable protection or run retired HTTP/blocked PowerShell database probes. Those historical files are intentionally absent from this edition. Unknown rows/identities require stopping and investigating, not broader cleanup.

## Dependencies and workflows

```powershell
pwsh -NoProfile -File scripts/Test-Dependencies.ps1 -Check Npm
pwsh -NoProfile -File scripts/Test-Dependencies.ps1 -Check NuGet
```

These checks correctly fail on incomplete registry/audit/signature queries. Preserve advisory and signature results separately, use bounded operations, no audit fix/force, no source changes or TLS bypass to force green. No broad first-party license is selected; exact xunit.abstractions 2.0.3 license-text evidence remains unresolved; this edition distributes references/locks, not dependency DLLs/source.

Three workflows have passed local YAML/project-policy validation only; GitHub-hosted execution and platform portability are not established. The existing action versions are now pinned to immutable commits verified through official public unauthenticated upstream metadata. No hosted run or authenticated GitHub operation occurred. Actual Mermaid rendering and explicit source-upload authorization remain outstanding.

## Reviewed CI audit exception — M7C.2

The raw full npm audit is executed with development dependencies included; its exit 1/five moderate entries are retained in private JSON and visibly disclosed. Only GHSA-g3hv-75wg-m249 / CVE-2026-118764 and its reviewed version/severity/relationship/path graph can use the owner's temporary exception. The pipeline result is distinct from the raw audit result; the vulnerability is not fixed. New findings, extra/moved paths, production vulnerabilities, malformed/partial data, command failures, changed source/config/workflows/installed callers or production inclusion fail.

The guard uses canonical-LF fingerprints for reviewed source/configuration and exact installed package implementations, checks read-only workflow conditions, performs a no-write production-module analysis, and queries current public advisory/compatible-parent release metadata with bounded requests. A supported compatible fix or changed advisory details expires acceptance. Lockfiles and package versions are unchanged. Historical inactive files remain private/excluded; unknown new code or workflow paths invalidate review. No private credential or environment value is stored in the exception record.

Production-only audit and signatures are independent strict gates; full audit is never replaced by production filtering. No automatic fixes, upgrades, incompatible overrides, hidden severity filter or custom advisory suppression. Three existing action versions are pinned to commits resolved from their official public repositories; this is local provenance/static validation, not hosted execution.

Policy implementation/data: [npm-audit-policy.cjs](scripts/npm-audit-policy.cjs), [reviewed exception](scripts/npm-audit-exception.json), [focused tests](scripts/npm-audit-policy.test.cjs). Run from checkout root after reviewed restore:

```powershell
node --test scripts/npm-audit-policy.test.cjs
pwsh -NoProfile -File scripts/Test-Dependencies.ps1 -Check Npm
node scripts/validate-ci.cjs
```

Private reports are under ignored .local/dependency-checks. Failures require investigation/review, never updating the exception automatically to make it pass. Reconsider on compatible patch, dependencies/configuration/workflows/permissions/input changes or production use. xunit.abstractions 2.0.3 historical exact text remains unresolved; no package binaries or copied source are redistributed.

## M7C.2 staged verification — November 1, 2026

Fresh selected-copy Release build passes with zero warnings/errors; production frontend build passes (553 modules; initial JS 336.78 kB/gzip 96.10; deferred editor 175.62/gzip 56.28; no chunk warning). All four helper builds, three local workflow validations and 31 focused audit-policy tests pass. The actual full npm audit exits 1 with the same five moderate entries; production and signatures exit 0, zero invalid/missing signatures. The separate policy process exits 0 only after all reviewed conditions pass. Prior 36 backend units, 100 frontend tests, lint 0/0 and completed NuGet evidence are reused; these suites were not unnecessarily repeated.

Fresh isolated browser verification was attempted but **blocked before browser assertions**: the API logged HTTPS startup, while Windows socket enumeration exposed no corresponding listener, so independent process/socket ownership could not be established. The guard was not weakened or bypassed; no fresh frontend startup/authentication/project/graph browser pass is claimed. Fresh guards identified only the failed invocation's disposable resources; its isolated marker and zero business rows were verified before exact container/volume/network disposal. The original development schema markers 1/2/3 and established business/M2 fingerprint matched before and after, its resource inventory was unchanged, and its original stopped state was restored. Raw journals, credentials and reports remain private.

Local runtime acceptance remains incomplete. Local Git initialization/staging is deferred until that required runtime gate passes; no commit, remote, upload or authenticated account operation occurred. GitHub-hosted/Linux CI and actual Mermaid rendered preview remain unverified. The source-only xunit.abstractions 2.0.3 historical exact-license limitation and separate first-party licensing/publication decisions remain unchanged.
