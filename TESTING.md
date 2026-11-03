# Local testing and evidence boundaries

**Verified M7C.3J checkpoint — November 2, 2026:** Commit `4b58697e355236072b2b8aee8459b1772d88d0d1` contains **201 tracked files and three commits** and completed the approved private push. All three hosted GitHub Actions #3 workflows succeeded; [exact run URLs and conclusions](README.md#m7c3j-hosted-verification) are recorded separately from the earlier local tests. Linux CI results do not claim execution of the Windows-only security, graph and Edge suites, whose successful M7C.3G evidence is preserved below. Earlier checkpoints describe their historical state; no new test or hosted run is claimed for later documentation edits.

**Historical M7C.3I pre-commit checkpoint — November 2, 2026:** The owner explicitly renewed the existing narrow, temporary development-only minimatch exception for the exact assessed Windows guard changes. The approved date/three-fingerprint patch is applied, and fresh strict policy verification passes. The full audit still reports five moderate entries and exits 1; the conditional policy exits 0. The advisory remains **OPEN and UNPATCHED**. At M7C.3I, hosted workflows had passed for the initial/README commits and the Windows changes were not yet committed or hosted-verified. M7C.3J subsequently completed their private upload and successful hosted verification. No production, signature, upstream, source/install/workflow or inventory safeguards are relaxed.

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
| Full Edge, historical |104 assertions /297 responses (M6B)|Original full baseline; current shipped-wrapper results are recorded in the M7C.3G section below.|
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

All three workflows passed on both the initial main commit and the approved README-update commit `616921e1b6d4774ce5c96b38ba2fa8efffdcd5e9`. Original relevant job logs/counts and later owner-confirmed statuses are separate evidence. Images and Mermaid rendering are confirmed; source was uploaded only to the private repository. M7C.3J subsequently committed the Windows harness changes with the exact approved policy refresh and all three hosted #3 workflows passed on `4b58697e355236072b2b8aee8459b1772d88d0d1`. The linked README records their URLs. The Windows security/graph/Edge suites retain their separate local evidence; public visibility remains a separate approval.

## Reviewed CI audit exception — M7C.2

The raw full npm audit is executed with development dependencies included; its exit 1/five moderate entries are retained in private JSON and visibly disclosed. Only GHSA-g3hv-75wg-m249 / CVE-2026-118764 and its reviewed version/severity/relationship/path graph can use the owner's temporary exception. The pipeline result is distinct from the raw audit result; the vulnerability is not fixed. New findings, extra/moved paths, production vulnerabilities, malformed/partial data, command failures, changed source/config/workflows/installed callers or production inclusion fail.

The guard uses canonical-LF fingerprints for reviewed source/configuration and exact installed package implementations, checks read-only workflow conditions, performs a no-write production-module analysis, and queries current public advisory/compatible-parent release metadata with bounded requests. A supported compatible fix or changed advisory details expires acceptance. Lockfiles and package versions are unchanged. Historical inactive files remain private/excluded; unknown new code or workflow paths invalidate review. No private credential or environment value is stored in the exception record.

Production-only audit and signatures are independent strict gates; full audit is never replaced by production filtering. No automatic fixes, upgrades, incompatible overrides, hidden severity filter or custom advisory suppression. The three action versions remain pinned to reviewed immutable commits. Hosted evidence is revision-specific. The M7C.3J results apply to the identified commit; later relevant source, fingerprint or security-condition changes must pass the existing review and fail-closed checks.

Policy implementation/data: [npm-audit-policy.cjs](scripts/npm-audit-policy.cjs), [reviewed exception](scripts/npm-audit-exception.json), [focused tests](scripts/npm-audit-policy.test.cjs). Run from checkout root after reviewed restore:

```powershell
node --test scripts/npm-audit-policy.test.cjs
pwsh -NoProfile -File scripts/Test-Dependencies.ps1 -Check Npm
node scripts/validate-ci.cjs
```

Private reports are under ignored .local/dependency-checks. Failures require investigation/review, never updating the exception automatically to make it pass. Reconsider on compatible patch, dependencies/configuration/workflows/permissions/input changes or production use. xunit.abstractions 2.0.3 historical exact text remains unresolved; no package binaries or copied source are redistributed.

## M7C.2 staged verification — November 1, 2026

Fresh selected-copy Release build passes with zero warnings/errors; production frontend build passes (553 modules; initial JS 336.78 kB/gzip 96.10; deferred editor 175.62/gzip 56.28; no chunk warning). All four helper builds, three local workflow validations and 31 focused audit-policy tests pass. The actual full npm audit exits 1 with the same five moderate entries; production and signatures exit 0, zero invalid/missing signatures. The separate policy process exits 0 only after all reviewed conditions pass. Prior 36 backend units, 100 frontend tests, lint 0/0 and completed NuGet evidence are reused; these suites were not unnecessarily repeated.

**Historical M7C.2 attempt:** Fresh isolated browser verification was attempted but **blocked before browser assertions**: the API logged HTTPS startup, while Windows socket enumeration exposed no corresponding listener, so independent process/socket ownership could not be established. The guard was not weakened or bypassed; no fresh frontend startup/authentication/project/graph browser pass is claimed. Fresh guards identified only the failed invocation's disposable resources; its isolated marker and zero business rows were verified before exact container/volume/network disposal. The original development schema markers 1/2/3 and established business/M2 fingerprint matched before and after, its resource inventory was unchanged, and its original stopped state was restored. Raw journals, credentials and reports remain private.

**Subsequent checkpoints:** M7C.2A passed 105 Edge assertions/299 responses with a private adapter and preserved cleanup/data. M7C.3E subsequently completed the approved two-commit private upload and successful hosted runs. That private adapter was not shipped at those checkpoints. M7C.3G below records the new distributed correction and its separate fresh local results. The source-only xunit.abstractions exact-license limitation and separate public-visibility decision remain unchanged.

## M7C.3G Windows verification guard

Windows-only focused verification, with no database and no private certificate export or trust change:

```powershell
pwsh -NoProfile -File scripts/Test-WindowsListenerGuard.ps1
```

The **44 passing cases** cover valid IPv4/IPv6 and anomalous raw state; exact PID/executable/command argument/parent/creation time; foreign/duplicate/wildcard/wrong-port listeners; malformed native buffers; missing native inspection; bounded missing-listener timeout; process exit during observations; missing/ambiguous CIM corroboration; actual listener ownership, connected-only exclusion and disposal; untrusted-certificate and plain-HTTP rejection; and cleanup that preserves another control listener. Synthetic certificates exist only in memory. Test artifacts stay under ignored `.local/windows-listener-tests/<run>`.

`WindowsListenerGuard.ps1` uses the documented Windows listener-only owner-PID table for both address families; it does not reinterpret raw state or classify listeners from CIM alone. Two stable observations and independently corroborated exact process identity precede normal localhost TLS validation; ownership is checked again afterward. Missing native APIs, bad table sizes, ambiguity, process exit, identity mismatch, inaccessible corroboration and certificate/HTTPS failures stop safely. There is no startup-log/HTTP-only readiness fallback. API binding remains IPv4 loopback 8836; Vite remains loopback HTTPS 3000. Database ownership/fingerprint/cleanup code and all application/probe assertions are unchanged.

Only non-Database Windows paths load this helper. The Linux Database branch remains independent of native Windows inspection and TLS files. At M7C.3G, compatibility was source-reviewed and PowerShell-parsed without a new hosted Linux run. M7C.3J later verified the committed tree in Linux CI; that does not mean Windows-native inspection or the Windows HTTP/Edge suites ran on Linux. The same existing installed Edge/Playwright and normal trusted localhost TLS were used; no global tool or dependency install/upgrade occurred.

The actual shipped `scripts/Test-IsolatedDatabase.ps1` was executed directly from the updated local checkout with `-Suite Security`, `-Suite Graph`, and `-Suite Browser -PlaywrightModule '<existing absolute module path>'`, sequentially and without a private replacement runner/guard. Fresh results: **Security 120/139, Graph 116/100, Edge 105/296 assertions/responses**; zero false assertions, and Edge zero page errors/external requests. Both graph restart checkpoints passed. Each suite's completion, fixture restoration, exact-owned resource removal, development fingerprint and existing-resource checks passed. Final read-only schema/logical fingerprint verification and original stopped-state restoration passed; original containers/volumes/networks are unchanged. The owner separately authorized the temporary existing-development-container start solely for read-only baseline/preservation queries; a future invocation must not start that container without its own applicable authorization.

Application/front-end source, dependencies, schema, endpoint configuration and authentication/authorization are unchanged. Matching previously verified generated binaries/dependencies were copied only into ignored paths after all 199 original source inputs and copied bytes were checked. Full unrelated build/unit/frontend suites were reused rather than rerun. The earlier blocked M7C.2 run and private-adapter pass remain historical evidence above; neither is relabeled as this fresh shipped-runner pass.

### Conditional minimatch source review — renewed M7C.3I

The owner's explicit November 2, 2026 authorization renews only the previously assessed exact M7C.3G source configuration. The applied scripts/npm-audit-exception.json patch changes reviewDate from 2026-11-01 to 2026-11-02, replaces the runner fingerprint and adds the two new Windows script fingerprints: **154 to 156 reviewed paths, 153 unchanged, no removals**. All other policy conditions and code are unchanged. The original ownerApproval identifier remains historical; this dated decision supplies the explicit renewal, not an inference from that old identifier.

Fresh local checks: **31/31 existing policy tests**, **7/7 applied-state checks**, three static workflow validations and exact source/install/workflow verification pass. The actual shipped Test-Dependencies.ps1 -Check Npm passes its strict conditional decision (**exit 0**) while preserving the raw full audit (**exit 1, five moderate development affected-package entries, one advisory**). Production-only audit exits 0/zero; signatures exit 0/zero invalid/missing. No finding is suppressed or relabeled as clean.

Fresh NuGet vulnerability queries cover the full backend **4-package** and test **45-package** graphs, each exit 0/zero findings. Because this release checkout has no generated NuGet assets, checks used hash-identical global/project/lock inputs in private scratch, with the established locked restore and official-source configuration; fresh queries were made without compilation or release-tree restore. Dependencies and locks remain unchanged. Normal restore is still a prerequisite for running the documented NuGet command directly in a fresh checkout.

The strict policy freshly verifies unchanged advisory data, no compatible parent-supported fix, and no-write production proof (**218 emitted modules, zero affected/external modules**). Both installed minimatch10.2.6 copies remain dev-only; reviewed ESLint/config-array callers use effective optimization level1. The reported vulnerable preprocessing requires level2 or higher; no new untrusted pattern path was identified in this exact tree. **Minimatch remains OPEN and UNPATCHED**, not eliminated, patched or fully remediated.

The applied-state checks preserve rejection of the old source inventory, omission or changed hashes of either new script, the old runner hash and future unexpected paths. Existing cases additionally reject unrelated advisories, changed affected paths/ranges, production findings, missing/invalid safeguards, malformed or incomplete audits and expired upstream conditions. Any relevant dependency/source/config/workflow/input change or compatible supported fix requires renewed review; never update the policy automatically to force green.

Historical M7C.3I inventory: **201 distributable source files**, then 199 tracked plus two untracked additions pending staging authority. M7C.3J subsequently committed **201 tracked files**, preserved the prior two commits and completed the approved private push. A new dated manifest records exact final bytes without overwriting historical candidates. Credentials/certificates, dependencies, bin/obj/build, synthetic data and private journals remain excluded. Reuse the M7C.3G 44 guard cases, Security120/139, Graph116/100 and Edge105/296 results with their successful cleanup/development preservation; no runtime or Docker operation was repeated for policy/documentation changes.

At M7C.3I, private commit preparation still required authorization. M7C.3J subsequently completed the authorized seven-file commit, private push and all three hosted #3 workflow checks on the exact revision recorded above. Public visibility still requires separate authorization; later documentation edits do not inherit a new hosted-CI result. Source-available licensing, original four contributors, separate October2026 modernization and xunit.abstractions2.0.3 historical exact-license limitation remain unchanged.
