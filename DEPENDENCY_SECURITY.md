# Milestone 5C — dependency security remediation

**M7C.2 local preparation:** the accepted minimatch advisory remains unpatched and visible (five moderate package entries, one advisory). The dependency runner now evaluates only that exact reviewed graph and source/install/workflow/production/upstream conditions; new or unverifiable inputs fail closed. Production auditing remains zero-only and registry signatures remain required. See [dependency evidence](DEPENDENCY_SECURITY.md) and [testing](TESTING.md). GitHub-hosted CI has not run. This private source-available candidate has no first-party open-source grant or upload approval. Original four-person credits and separate October 2026 modernization remain unchanged.

## Historical follow-up — M7A.1, October 30, 2026

The owner authorized removing unused json-server 1.0.0-beta.3 after M7A identified its installed Fair Source license. Source/test/config/CI and lock-parent review establish that only the root devDependency and historical api-server script referenced it; normal application traffic uses the secured ASP.NET Core/PostgreSQL backend. `npm uninstall --save-dev json-server --ignore-scripts --no-audit --no-fund --offline --logs-max=0 --fetch-retries=0 --fetch-timeout=30000` and `npm pkg delete scripts.api-server --ignore-scripts --logs-max=0` removed it without executing lifecycle hooks. The empty mock example and original historical files remain; original manifest/lock/package license are preserved privately under .local/m7a1.

Lock review: **448→404 entries**, **44 removed**, **zero added or changed retained entries**, no version upgrades. All other direct pins/scripts remain byte-equivalent as parsed declarations. `npm ls --all --json --offline` exits 0. This resolves JSON Server's current dependency restriction; no first-party license or rights permission was created. Remaining license/notice and asset questions remain in [publication status](README.md#publication-licensing-and-acknowledgments).

Fresh verification: frontend build, **87 tests**, lint **0 errors/0 warnings**; backend/test Release builds **0 warnings/errors**, **36 unit cases**; three workflow/lock/lifecycle policies pass. Fresh official npm full and production-only audits each complete with **zero critical/high/moderate/low/info findings**. Backend include-transitive NuGet query completes with zero reported vulnerabilities. The unchanged test-project NuGet query exceeded **90 seconds** and is **incomplete**; its prior successful M6A audit is retained as historical evidence.

Initial sandbox registry access failed; approved outside-sandbox full/prod checks completed. First signature invocation failed before verification because the private wrapper quoted its cache path incorrectly (ENOENT); a corrected, bounded attempt using a process-only cache environment setting ended **ECONNRESET**. No further retry. Current signature/provenance verification is **incomplete, not passing**; earlier M5C success below is dated evidence. The initial failure and corrected result are preserved separately. No audit-fix/force/legacy-peer flag, dependency upgrade, TLS/security bypass or global tool installation occurred.

Private fresh audit JSON, logs, baseline/lock differences and scan evidence are under .local/m7a1; previous .local/dependency-checks and M5C/M6A/M7A reports remain unchanged. No live DB/security/graph/Edge repeat was warranted by unused dev-tool removal with unchanged retained packages/source; M6B runtime/isolation/cleanup evidence is reused explicitly. No development DB connection or Docker mutation occurred. No public export, Git or publication. **The M5C record below is historical and its then-current package counts are not the current 404-entry graph.**

## Historical M5C record

October 28, 2026 individual portfolio improvement to the original four-person 2024–2025 SDSU/Triode Data Systems application. Preserve the [team attribution and local-only restrictions](README.md). **Milestone 5C is complete for the approved local scope.** Scope is the npm dependency findings left by M5B; no application feature, UI, authentication logic, backend dependency or database schema change is included.

## Baseline and exposure

Installed Node **22.14.0**, npm **10.9.2**, Vite **8.3.5**, React plugin **6.1.2**, Vitest **5.0.5** and .NET SDK **10.0.403** are retained. The ignored source rollback snapshot `.local/m5c-baseline-20261028/source` contains **251 files** with SHA256 manifest; private `.env`, TLS/auth keys, generated files and dependencies are excluded.

**Runtime-verified:** the fresh, complete official `npm audit --json --fetch-retries=0 --fetch-timeout=30000` reports five high affected-package entries, no critical aggregate entries. There are **50 distinct advisory IDs / 51 direct advisory records**: 32 Axios, four PostCSS and 14 Router IDs; turbo-stream repeats one Router advisory and react-router-dom inherits Router findings. The 50 unique records comprise **23 high, 26 moderate (GitHub: medium) and one low**. Individual advisories include moderate/low severities despite every affected package's aggregate high rating. The full baseline tree is valid. A separate `--omit=dev` audit reports four high production affected entries; the vulnerable root PostCSS entry is development/build tooling.

| Package / original version | Declaration and actual exposure | Selected remediation |
| --- | --- | --- |
| axios **1.8.4** | Direct production declaration. **Source-confirmed:** no Axios imports or calls in current source. The active client is `src/services/api.js` using fetch, credentials and CSRF. The installed library still carries Node-adapter, browser/prototype-pollution and request-construction advisories; absence from the active path is not used to suppress them. | Exact **1.21.0** in the same major. No Axios request/interceptor/default configuration exists to migrate. |
| postcss **8.5.3** | Direct development declaration, actually used by Tailwind/PostCSS in Vite development/build styling. Hostile CSS/source-map inputs can affect the build machine; the current inputs are local project styles, with no user CSS processing or graph execution. CSS output/XSS concerns differ from executing PostCSS in a browser. | Exact **8.5.32**, patch update. Vite's already-patched nested copy deduplicates to the root. |
| react-router **7.4.0** | Transitive production dependency of react-router-dom; browser routing is active. The app uses declarative BrowserRouter/Routes, not Router server/SSR/framework/data actions, manifests, Meta, ScrollRestoration or single-fetch. Server/SSR-specific findings are not exposed through a configured application handler. | **7.18.5**, brought in by the exact parent update; no override. |
| react-router-dom **7.4.0** | Direct production dependency, importing the affected Router. Navigation/Link hooks are used. Source review found fixed application routes and backend-returned project identifiers, with no deliberately untrusted external redirect URL input. Shared browser navigation risks still warrant patching. | Exact **7.18.5**, same major; existing API/routes remain. |
| turbo-stream **2.4.0** | Transitive production declaration through old Router; no application single-fetch/SSR server. Its GHSA-rxv8-25v2-qmq8 is also reported on Router. | **Removed by the supported parent update**; no direct replacement or override. The advisory also lists turbo-stream **3.0.0** as patched, but adding it unnecessarily is not the remediation. Router's internal/vendored decoder is governed by the patched Router version; package removal alone is not treated as proof that decoder code disappeared. |

Detailed advisory IDs, severities, vulnerable ranges, first fixed releases for the installed branch and selected remedies appear in the appendix. Raw completed baseline audit/tree and all 50 GitHub advisory records are retained under ignored `.local/m5c-{audit,tree}-before.json` and `.local/m5c-advisory-details.json`. Reachability classifications above and in the Router appendix are source/advisory analysis, not exploitation tests or a full independent application audit.

## Release provenance and safe restoration

[Microsoft's April 1 analysis](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/) identifies the **March 31, 2026** malicious Axios releases **1.14.1 / 0.30.4** and the injected plain-crypto-js dependency. Neither release nor that dependency occurs in this task's baseline or updated lockfile. This is a project-specific dependency check, not a machine-wide incident investigation. Those releases were never selected or installed by this milestone.

The selected release is [Axios 1.21.0](https://github.com/axios/axios/releases/tag/v1.21.0), with an upstream signed release commit and normal GitHub Actions publishing provenance. [PostCSS 8.5.32](https://github.com/postcss/postcss/releases/tag/8.5.32) and [Router 7.18.5](https://github.com/remix-run/react-router/releases/tag/react-router%407.18.5), plus its [versioned changelog](https://github.com/remix-run/react-router/blob/react-router%407.18.5/CHANGELOG.md#v7185), were checked against maintainer release information. The Axios minor update changes treatment of custom class instances used as header defaults; none exist in this application's source. Router's framework/action-origin changes require review for applications running those server modes; this project does not enable them. No future flags or authentication/proxy compatibility bypass was introduced.

**Statically verified:** official registry metadata for Axios, PostCSS and both Router packages matches the final lockfile version, HTTPS tarball and SHA512 integrity. Public SLSA statements were parsed as data, never executed. Their subject digests match registry integrity and their workflow/repository commits match the maintainer releases:

| Package | Release source commit | Publishing workflow |
| --- | --- | --- |
| Axios 1.21.0 | aa54a5e1e0e50cd1a2561b854ae5490ff589d065 | axios/axios, .github/workflows/publish.yml, tag v1.21.0 |
| PostCSS 8.5.32 | 2455ac8212fe66bc3248aa01186a52c27c87da5a | postcss/postcss, .github/workflows/release.yml, tag 8.5.32 |
| Router / DOM 7.18.5 | 1ad93b4cb4b045366b7d73639de34787812ad5b5 | remix-run/react-router, .github/workflows/release.yml, v7 branch |

**Runtime-verified:** `npm audit signatures --json --fetch-retries=0 --fetch-timeout=30000` exits **0**, with **invalid: [] / missing: []**, checking installed registry signatures and available provenance through the existing npm verifier. This does not mean every historical/transitive package publishes provenance or that signed code cannot contain defects. [npm describes this verification](https://docs.npmjs.com/cli/v10/commands/npm-audit/#audit-signatures). Candidate metadata, signed envelopes, parsed statements, validation booleans and the CLI result remain in ignored `.local/m5c-*` evidence.

A supplemental PowerShell read of the Axios commit's raw package.json hit its 30-second HTTP timeout. Its initial wrapper incorrectly compared a missing response and labeled it a mismatch; that status was corrected to unavailable/no comparison. The same [exact upstream source commit](https://raw.githubusercontent.com/axios/axios/aa54a5e1e0e50cd1a2561b854ae5490ff589d065/package.json) was successfully read through the normal web tool. Its four dependency declarations were then compared with registry metadata and the installed manifest and all match. The final guarded local comparison rejects missing input and records verified status at `.local/m5c-axios-source-crosscheck.json`. No actual package-manifest mismatch was found; the final npm audits and signature/provenance checks completed independently.

Only three manifest pins change. Lockfile review finds five changed existing package versions (Axios, PostCSS, Router/DOM, required proxy-from-env **1.1.0 → 2.1.0**); two required Axios-private paths added (https-proxy-agent **5.0.1**, agent-base **6.0.2**); three paths removed (@types/cookie, turbo-stream and duplicate Vite PostCSS). These are parent-selected transitives, not broad overrides. No unrelated retained direct dependency changes. All resolved engine constraints accept Node 22.14.0; every resolved tarball uses registry.npmjs.org HTTPS with integrity metadata. Resolved entries fall **449 → 448**; Windows restoration installs **423 packages**.

Complete lock lifecycle review still finds only optional macOS fsevents 2.3.3's node-gyp install hook, omitted on Windows. Axios metadata has a maintainer prepare:husky script, not an install/postinstall hook on this registry-tarball path. All lifecycle scripts remain disabled regardless. `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000`, then the corresponding `npm ci --ignore-scripts ...`, succeeded without force/legacy-peer flags, audit fixes, integrity bypasses or global software changes. No antivirus or certificate policy changes were made.

## Completed verification

| Command/check | Observed result |
| --- | --- |
| `npm.cmd test` | **83/83 tests in six files pass**, 31.70 seconds. No test changes or removals. |
| `npm.cmd run build` | Vite production build passes, 553 modules; main JS **518.81 kB / 152.93 kB gzip**, CSS **53.78 kB / 9.50 kB gzip**. Generated CSS is byte-identical to M5B. |
| `npm.cmd run lint -- --format json --output-file ../.local/m5c-lint.json` | Exit 0; **0 errors / 54 warnings**, all no-unused-vars, unchanged from M5B. No analyzer suppression or broad lint cleanup. |
| `dotnet build Backend/ZitaDataSystem.csproj --configuration Release --no-restore --verbosity minimal` | Pass, incremental 0 warnings/errors. Existing full-build 19 nullable warnings remain. Backend code/packages and .NET version are unchanged. |
| GraphIntegrationProbe, net10.0, independently verified localhost API PID | **116 assertions / 100 responses**, including secured writes/readback, revision races and API-only plus project-DB/API restart durability. Completion/cleanup/original-state restoration true. |
| SecurityRegressionProbe, net10.0, supported one-minute sessions | **120 assertions / 139 HTTP responses**, all completion/cleanup/original-state restoration flags true. Real absolute expiration, invitation/signup/login, self profile/password, logout/revocation, CSRF, role/tenant denials and 429 credential limits pass. Normal rate window elapsed before Edge logins. |
| Actual Edge 156.0.4314.50 / existing Playwright 1.62.1 | **104 assertions / 302 API responses**, zero false assertions, page errors or external requests. Trusted HTTPS cookie/session restoration, invitations, profiles/password/logout, project creation/assignment, role/organization restrictions, Router direct navigation/protected refresh, actual React Flow editing and PostgreSQL graph Save/Reload/refresh/conflicts/read-only access pass. All fixture baseline flags true. |
| Final complete and production-only npm audits | Both completed after regressions, exit **0**, **0 critical/high/moderate/low/info**. Full installed `npm ls --all --json` also exits **0** with no invalid/missing/extraneous problems. No advisory filtering/overrides/fixes. No unfixable or deferred npm advisory remains in this resolved graph at audit time. |

The security contract remains strict local HTTPS, credentialed fetch, CSRF bootstrap/write headers, HttpOnly/Secure/Strict cookies, DB-validated roles/tenants/assignment and revocable sessions. Actual fetch-client unit tests and the existing guarded HTTP/browser suites verify selected operations; **Axios transport is not separately runtime-tested because the application has no Axios call path**. No credential or CSRF configuration is changed. Graph design remains inert; no workflow execution or external service request is added.

Known diagnostics: the existing >500 kB build-chunk warning remains. This concurrent build also emitted a Rolldown PLUGIN_TIMINGS diagnostic for Vite CSS transform callbacks (12.6 s / 72% of the 17.6 s build), not a compilation failure or performance benchmark. Do not suppress it or start profiling/refactoring as an extra milestone. Actual Edge still emits existing React Flow nodeTypes/edgeTypes identity console warnings; zero page errors is not a zero-console-warning claim. The intentionally disconnected malformed admin component remains preserved and explicitly excluded from lint.

Sanitized evidence (all completed/cleaned/original-state-restored):

- `.local/graph-probe/3121b6b495bb4fb0bb6aa9e61f841876/report.json`
- `.local/security-probe/e8d28206210b48a5b5ce61585a147d3f/report.json`
- `.local/browser-probe/e268a9e50f2c476291593f2360b29a14/report.json` (private fixture run 058bde0ffba94a3baa29912094dd66c3; 11 direct owned-row deletions plus graph cascade).
- `.local/m5c-audit-after.json`, `.local/m5c-audit-production-after.json`, `.local/m5c-tree-after.json`, `.local/m5c-final-audit-status.json`, `.local/m5c-signatures.json`, `.local/m5c-lock-review.json`, `.local/m5c-provenance-validation.json` and `.local/m5c-lint.json`.

After tests, only independently verified task Vite/API PIDs were stopped. Final bounded guards confirm the same project container/volume, PostgreSQL healthy, unrelated containers unchanged, markers **1/2/3**, business users/projects/organizations/test/invitations/graphs **0/1/1/0/0/0**, original M2 organization/project intact and no API 8836/frontend 3000 listeners. Live fixture credentials, cookies, CSRF/invitation secrets and credential-bearing HTTP payloads remain private; no production/external service or database was used.

## Remaining debt, files and rollback

No application source, test case, build configuration, launch guard, backend source/dependency, database schema or Compose resource is changed. Implementation files are only frontend package.json/package-lock.json. The exact path/hash inventory is `.local/m5c-final-change-inventory.json`: **one new file, nine modified existing files, zero deleted/renamed files**, 252 first-party files in total. Logs/metadata/private runner evidence/helpers stay under ignored .local.

New file:

- `DEPENDENCY_SECURITY.md`: complete advisory/provenance/remediation/evidence/limits/rollback record.

Modified files:

- `TDS-Frontend-main/package.json`: three exact direct security pins; no other direct versions/scripts change.
- `TDS-Frontend-main/package-lock.json`: only reviewed required dependency updates/removals/deduplication, with normal registry integrity.
- `AGENTS.md`: current versions, audit/provenance conventions, regression evidence and warning guidance.
- `PLAN.md`: actual M5C results/current status while preserving earlier evidence.
- `VITE_MIGRATION.md`: subsequent remediation notice; original M5B version/advisory queue retained as historical.
- `SECURITY.md`: current dependency/provenance evidence and scope limits.
- `README.md`: current milestone status and pointer to the complete record; team credits preserved.
- `TDS-Frontend-main/README.md`: current versions/audit/browser results and warning limits.
- `FRONTEND_INTEGRATION.md`: patched-dependency compatibility results and existing security contract.

**Statically verified final review:** all **251 rollback copies** match their original SHA256 manifest. **252 first-party files plus nine generated production files** were checked for either actual local DB password, with zero matches; **87 local Markdown targets** resolve. Private env/TLS/auth keys/reports/builds stay ignored, source examples remain visible, manifest declarations match the lock and Git history remains absent. Source inventory confirms implementation changes only in package/lock. This bounded check is not comprehensive secret scanning or publication clearance.

The unchanged **54 lint warnings** comprise **43 unnecessary React imports, eight other unused icon/Link imports, two unused user/handleProjectClick declarations in the active member dashboard, and one unused id argument in dormant SqlTableNode**. Source review confirms SortableItem/SqlTableNode remain disconnected. No warning was introduced by these dependency edits, so no unrelated source cleanup was needed.

A separate maintainability milestone should first keep the malformed dormant admin dashboard disconnected and assess whether to repair or retire it; then review the active member dashboard's unused user value and paused-project callback, which could conceal obsolete or unfinished business intent. Do not wire the callback or invent a paused-project policy without reviewing the actual requirements; existing active-project browser success does not verify every paused-project scenario. The dormant node argument is lower-risk unless that component is reconnected. Remove cosmetic React/icon imports through a narrow reviewed cleanup afterward. The existing 19 backend nullable warnings deserve a source-path/risk review of dormant helpers. Code splitting, React Flow identity warnings and build timing diagnostics are measured follow-ups. Do not automatically perform them during dependency remediation.

Rollback is documented, not executed: stop only verified task frontend/API listeners; compare current hashes against the eventual `.local/m5c-final-change-inventory.json` and preserve any later edits. Restore only M5C-modified paths from `.local/m5c-baseline-20261028/source`; unchanged task-created documentation may be removed only after verifying exact workspace containment. Restore package.json and lock together, run the reviewed `npm ci --ignore-scripts --no-audit --no-fund`, build/test and guarded regressions before claiming rollback verified. Do not overlay unrelated user work, touch Git/history, uninstall global software or reset/restore PostgreSQL. Rollback restores the five known affected entries and is only a diagnostic recovery option, not security remediation.

**Acceptance:** all requested build/unit/lint/backend/security/graph/actual Edge checks passed, the final full and production npm audits report zero findings, provenance/integrity checks passed and all database baselines were restored. No milestone blocker remains. Browser evidence covers the Vite development server on Windows/current Edge; built production serving and other browsers/platforms/hosted CI remain unverified. Graph durability stops the API around the PostgreSQL restart and does not prove continuous live-service outage recovery. Axios adapter behavior is not separately exercised because no application call path exists. Rollback was documented, not executed. No next milestone is authorized automatically.

No audit result establishes vulnerability-free source, absence of compromise elsewhere, production readiness, public-release rights, global Node/npm or host-runtime security, full accessibility, cross-platform/browser coverage, hosted CI or continuous service availability during database outages. Backend NuGet was not re-audited in this npm milestone; its unchanged M5A graph has the separately recorded audit.

## Exact baseline advisories and patched releases

The original npm ranges/severities are preserved below. First fixed versions come from the matching installed-version branch of the separately fetched GitHub advisory record; selected current releases are outside those ranges. These are not all high-severity individual advisories. Each section inherits its source-confirmed production/development and reachability assessment above. DOM inherits the Router list; the repeated turbo-stream row is not a 51st distinct advisory. No individual exploit was executed.

### axios 1.8.4

| Advisory / CVE | Individual severity | Finding | npm vulnerable range | First fixed installed branch | Selected remedy |
| --- | --- | --- | --- | --- | --- |
| [GHSA-4hjh-wcwx-xvwj](https://github.com/axios/axios/security/advisories/GHSA-4hjh-wcwx-xvwj) / CVE-2025-58754 | high | Axios is vulnerable to DoS attack through lack of data size check | `>=1.0.0 <1.12.0` | 1.12.0 | 1.21.0 |
| [GHSA-3p68-rc4w-qgx5](https://github.com/axios/axios/security/advisories/GHSA-3p68-rc4w-qgx5) / CVE-2025-62718 | moderate | Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF | `>=1.0.0 <1.15.0` | 1.15.0 | 1.21.0 |
| [GHSA-w9j2-pvgh-6h63](https://github.com/axios/axios/security/advisories/GHSA-w9j2-pvgh-6h63) / CVE-2026-42041 | moderate | Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-pmwg-cvhr-8vh7](https://github.com/axios/axios/security/advisories/GHSA-pmwg-cvhr-8vh7) / CVE-2026-42043 | high | Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-3w6x-2g7m-8v23](https://github.com/axios/axios/security/advisories/GHSA-3w6x-2g7m-8v23) / CVE-2026-42044 | moderate | Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver` | `>=1.0.0 <1.15.2` | 1.15.2 | 1.21.0 |
| [GHSA-xhjh-pmcv-23jw](https://github.com/axios/axios/security/advisories/GHSA-xhjh-pmcv-23jw) / CVE-2026-42040 | low | Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-445q-vr5w-6q77](https://github.com/axios/axios/security/advisories/GHSA-445q-vr5w-6q77) / CVE-2026-42037 | moderate | Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-m7pr-hjqh-92cm](https://github.com/axios/axios/security/advisories/GHSA-m7pr-hjqh-92cm) / CVE-2026-42038 | moderate | Axios: no_proxy bypass via IP alias allows SSRF | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-5c9x-8gcm-mpgx](https://github.com/axios/axios/security/advisories/GHSA-5c9x-8gcm-mpgx) / CVE-2026-42034 | moderate | Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-vf2m-468p-8v99](https://github.com/axios/axios/security/advisories/GHSA-vf2m-468p-8v99) / CVE-2026-42036 | moderate | Axios: HTTP adapter streamed responses bypass maxContentLength | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-pf86-5x62-jrwf](https://github.com/axios/axios/security/advisories/GHSA-pf86-5x62-jrwf) / CVE-2026-42033 | high | Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-6chq-wfr3-2hj9](https://github.com/axios/axios/security/advisories/GHSA-6chq-wfr3-2hj9) / CVE-2026-42035 | high | Axios: Header Injection via Prototype Pollution | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-xx6v-rp6x-q39c](https://github.com/axios/axios/security/advisories/GHSA-xx6v-rp6x-q39c) / CVE-2026-42042 | moderate | Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-43fc-jf86-j433](https://github.com/axios/axios/security/advisories/GHSA-43fc-jf86-j433) / CVE-2026-25639 | high | Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig | `>=1.0.0 <=1.13.4` | 1.13.5 | 1.21.0 |
| [GHSA-q8qp-cvcw-x6jj](https://github.com/axios/axios/security/advisories/GHSA-q8qp-cvcw-x6jj) / CVE-2026-42264 | high | Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking | `>=1.0.0 <1.15.2` | 1.15.2 | 1.21.0 |
| [GHSA-fvcv-3m26-pcqx](https://github.com/axios/axios/security/advisories/GHSA-fvcv-3m26-pcqx) / CVE-2026-40175 | moderate | Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain | `>=1.0.0 <1.15.0` | 1.15.0 | 1.21.0 |
| [GHSA-62hf-57xw-28j9](https://github.com/axios/axios/security/advisories/GHSA-62hf-57xw-28j9) / CVE-2026-42039 | moderate | Axios: unbounded recursion in toFormData causes DoS via deeply nested request data | `>=1.0.0 <1.15.1` | 1.15.1 | 1.21.0 |
| [GHSA-hfxv-24rg-xrqf](https://github.com/axios/axios/security/advisories/GHSA-hfxv-24rg-xrqf) / CVE-2026-44496 | high | Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection | `>=1.0.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-777c-7fjr-54vf](https://github.com/axios/axios/security/advisories/GHSA-777c-7fjr-54vf) / CVE-2026-44488 | high | Allocation of Resources Without Limits or Throttling in Axios | `>=1.7.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-p92q-9vqr-4j8v](https://github.com/axios/axios/security/advisories/GHSA-p92q-9vqr-4j8v) / CVE-2026-44487 | high | Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter | `>=1.0.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-j5f8-grm9-p9fc](https://github.com/axios/axios/security/advisories/GHSA-j5f8-grm9-p9fc) / CVE-2026-44486 | high | Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection | `>=1.0.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-3g43-6gmg-66jw](https://github.com/axios/axios/security/advisories/GHSA-3g43-6gmg-66jw) / CVE-2026-44495 | high | axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge | `>=1.0.0 <1.15.2` | 1.15.2 | 1.21.0 |
| [GHSA-35jp-ww65-95wh](https://github.com/axios/axios/security/advisories/GHSA-35jp-ww65-95wh) / CVE-2026-44494 | high | axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy` | `>=1.0.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-898c-q2cr-xwhg](https://github.com/axios/axios/security/advisories/GHSA-898c-q2cr-xwhg) / CVE-2026-44490 | moderate | axios has DoS &amp; Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions | `>=1.0.0 <1.16.0` | 1.16.0 | 1.21.0 |
| [GHSA-mmx7-hfxf-jppx](https://github.com/axios/axios/security/advisories/GHSA-mmx7-hfxf-jppx) / CVE-2026-67316 | moderate | Axios: Prototype pollution gadgets can alter axios request construction | `>=1.0.0 <1.18.0` | 1.18.0 | 1.21.0 |
| [GHSA-pmv8-rq9r-6j72](https://github.com/axios/axios/security/advisories/GHSA-pmv8-rq9r-6j72) / CVE-2026-67312 | moderate | Axios: Deep formToJSON Key Recursion Can Cause Denial of Service | `>=1.0.0 <1.18.0` | 1.18.0 | 1.21.0 |
| [GHSA-7q8q-rj6j-mhjq](https://github.com/axios/axios/security/advisories/GHSA-7q8q-rj6j-mhjq) / CVE-2026-67319 | moderate | Axios: Nested axios option objects can consume polluted prototype values | `>=1.0.0 <1.18.0` | 1.18.0 | 1.21.0 |
| [GHSA-jqh4-m9w3-8hp9](https://github.com/axios/axios/security/advisories/GHSA-jqh4-m9w3-8hp9) / CVE-2026-67317 | moderate | Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength` | `>=1.7.0 <1.18.0` | 1.18.0 | 1.21.0 |
| [GHSA-42h9-826w-cgv3](https://github.com/axios/axios/security/advisories/GHSA-42h9-826w-cgv3) / CVE-2026-67313 | moderate | Axios: Excessive recursion in formDataToJSON can cause denial of service | `>=1.0.0 <1.18.0` | 1.18.0 | 1.21.0 |
| [GHSA-vh66-26gq-q6x8](https://github.com/axios/axios/security/advisories/GHSA-vh66-26gq-q6x8) / CVE-2026-101908 | moderate | Axios: Prototype pollution gadget in fetch adapter can alter outbound requests | `>=1.7.0 <1.20.0` | 1.20.0 | 1.21.0 |
| [GHSA-9fr6-4gfg-395g](https://github.com/axios/axios/security/advisories/GHSA-9fr6-4gfg-395g) / CVE-2026-101902 | moderate | Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method | `>=1.0.0 <1.20.0` | 1.20.0 | 1.21.0 |
| [GHSA-j8rh-479h-cp32](https://github.com/axios/axios/security/advisories/GHSA-j8rh-479h-cp32) / CVE-2026-101904 | moderate | Axios: Header Injection via Inherited headers After Minimal Interceptor | `>=1.0.0 <1.20.0` | 1.20.0 | 1.21.0 |

### postcss 8.5.3

| Advisory / CVE | Individual severity | Finding | npm vulnerable range | First fixed installed branch | Selected remedy |
| --- | --- | --- | --- | --- | --- |
| [GHSA-qx2v-qp2m-jg93](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93) / CVE-2026-41305 | moderate | PostCSS has XSS via Unescaped &lt;/style&gt; in its CSS Stringify Output | `<8.5.10` | 8.5.10 | 8.5.32 |
| [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q) / CVE-2026-45623 | high | PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments | `<=8.5.11` | 8.5.12 | 8.5.32 |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) / CVE-2026-69153 | moderate | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset | `<=8.5.22` | 8.5.23 | 8.5.32 |
| [GHSA-r28c-9q8g-f849](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849) / CVE-2026-73646 | high | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure | `<=8.5.17` | 8.5.18 | 8.5.32 |

### react-router 7.4.0

| Advisory / CVE | Individual severity | Finding | npm vulnerable range | First fixed installed branch | Selected remedy |
| --- | --- | --- | --- | --- | --- |
| [GHSA-f46r-rw29-r322](https://github.com/remix-run/react-router/security/advisories/GHSA-f46r-rw29-r322) / CVE-2025-43864 | high | React Router allows a DoS via cache poisoning by forcing SPA mode | `>=7.2.0 <=7.5.1` | 7.5.2 | Parent/Router 7.18.5 |
| [GHSA-2w69-qvjg-hvjx](https://github.com/remix-run/react-router/security/advisories/GHSA-2w69-qvjg-hvjx) / CVE-2026-22029 | high | React Router vulnerable to XSS via Open Redirects | `>=7.0.0 <=7.11.0` | 7.12.0 | Parent/Router 7.18.5 |
| [GHSA-9jcx-v3wj-wh4m](https://github.com/remix-run/react-router/security/advisories/GHSA-9jcx-v3wj-wh4m) / CVE-2025-68470 | moderate | React Router has unexpected external redirect via untrusted paths | `>=7.0.0 <7.9.6` | 7.9.6 | Parent/Router 7.18.5 |
| [GHSA-cpj6-fhp6-mr6j](https://github.com/remix-run/react-router/security/advisories/GHSA-cpj6-fhp6-mr6j) / CVE-2025-43865 | high | React Router allows pre-render data spoofing on React-Router framework mode | `>=7.0.0-pre.0 <=7.5.1` | 7.5.2 | Parent/Router 7.18.5 |
| [GHSA-49rj-9fvp-4h2h](https://github.com/remix-run/react-router/security/advisories/GHSA-49rj-9fvp-4h2h) / CVE-2026-42211 | high | React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE | `>=7.0.0 <=7.14.1` | 7.14.2 | Parent/Router 7.18.5 |
| [GHSA-8x6r-g9mw-2r78](https://github.com/remix-run/react-router/security/advisories/GHSA-8x6r-g9mw-2r78) / CVE-2026-42342 | high | React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint | `>=7.0.0 <7.15.0` | 7.15.0 | Parent/Router 7.18.5 |
| [GHSA-rxv8-25v2-qmq8](https://github.com/remix-run/react-router/security/advisories/GHSA-rxv8-25v2-qmq8) / CVE-2026-34077 | high | React Router vulnerable to Denial of Service via reflected user input in single-fetch | `>=7.0.0 <7.14.0` | 7.14.0 | Parent/Router 7.18.5 |
| [GHSA-h5cw-625j-3rxh](https://github.com/remix-run/react-router/security/advisories/GHSA-h5cw-625j-3rxh) / CVE-2026-22030 | moderate | React Router has CSRF issue in Action/Server Action Request Processing | `>=7.0.0 <=7.11.0` | 7.12.0 | Parent/Router 7.18.5 |
| [GHSA-wrjc-x8rr-h8h6](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6) / CVE-2026-53669 | moderate | React Router: Open redirect via backslash in &lt;Link&gt; and useNavigate (CVE-2025-68470 bypass) | `>=6.0.0 <7.18.0` | 7.18.0 | Parent/Router 7.18.5 |
| [GHSA-337j-9hxr-rhxg](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg) / CVE-2026-53666 | moderate | React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration | `>=6.4.0 <7.18.0` | 7.18.0 | Parent/Router 7.18.5 |
| [GHSA-chx6-hx7r-mcp5](https://github.com/remix-run/react-router/security/advisories/GHSA-chx6-hx7r-mcp5) / CVE-2026-55685 | high | React Router: Unauthenticated Denial of Service via Inefficient Route Matching | `>=7.0.0 <7.18.0` | 7.18.0 | Parent/Router 7.18.5 |
| [GHSA-2j2x-hqr9-3h42](https://github.com/remix-run/react-router/security/advisories/GHSA-2j2x-hqr9-3h42) / CVE-2026-40181 | moderate | React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation | `>=7.0.0 <7.14.1` | 7.14.1 | Parent/Router 7.18.5 |
| [GHSA-8v8x-cx79-35w7](https://github.com/remix-run/react-router/security/advisories/GHSA-8v8x-cx79-35w7) / CVE-2026-21884 | high | React Router SSR XSS in ScrollRestoration | `>=7.0.0 <7.12.0` | 7.12.0 | Parent/Router 7.18.5 |
| [GHSA-3cgp-3xvw-98x8](https://github.com/remix-run/react-router/security/advisories/GHSA-3cgp-3xvw-98x8) / CVE-2025-59057 | high | React Router has XSS Vulnerability | `>=7.0.0 <=7.8.2` | 7.9.0 | Parent/Router 7.18.5 |

Source/advisory applicability details:

- **GHSA-f46r-rw29-r322:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-2w69-qvjg-hvjx:** Advisory explicitly excludes declarative BrowserRouter; no loader/action redirect mode configured.
- **GHSA-9jcx-v3wj-wh4m:** Browser navigation API used; requires an untrusted destination. None identified in the reviewed app.
- **GHSA-cpj6-fhp6-mr6j:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-49rj-9fvp-4h2h:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-8x6r-g9mw-2r78:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-rxv8-25v2-qmq8:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-h5cw-625j-3rxh:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-wrjc-x8rr-h8h6:** Browser navigation API used; follow-up for unsafe untrusted paths. Patched rather than dismissed.
- **GHSA-337j-9hxr-rhxg:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-chx6-hx7r-mcp5:** Advisory explicitly limits this to Framework Mode manifests; not configured here.
- **GHSA-2j2x-hqr9-3h42:** Requires unsafe redirect() destinations; advisory explicitly excludes declarative BrowserRouter. No loader/action redirect handler is configured. Package upgraded regardless.
- **GHSA-8v8x-cx79-35w7:** Server/framework/SSR, hydration or single-fetch path; no corresponding application handler/API is configured. Package upgraded regardless.
- **GHSA-3cgp-3xvw-98x8:** Framework Meta/script:ld+json SSR path, explicitly excludes declarative mode.

### turbo-stream 2.4.0

| Advisory / CVE | Individual severity | Finding | npm vulnerable range | First fixed installed branch | Selected remedy |
| --- | --- | --- | --- | --- | --- |
| [GHSA-rxv8-25v2-qmq8](https://github.com/remix-run/react-router/security/advisories/GHSA-rxv8-25v2-qmq8) / CVE-2026-34077 | high | Same single-fetch finding already listed for Router | `<3.0.0` | 3.0.0 | Removed by Router 7.18.5 |

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
