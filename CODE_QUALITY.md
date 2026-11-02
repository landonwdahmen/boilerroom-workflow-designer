# Milestone 6B — code quality and maintainability

October 30, 2026, America/Chicago. This is Landon Dahmen's individual 2026 portfolio maintenance of the four-person 2024–2025 SDSU/TDS academic project. It does not change team attribution or publication rights. The owner authorized focused maintenance and the final isolated regression continuation; workflow execution, development schema changes, dependency upgrades, publication and another milestone remain outside scope.

**Final status:** M6B meets its full approved local acceptance criteria. The initially Docker-blocked suites now pass: PostgreSQL **6/6** plus SQL checks, security **120 assertions/139 responses**, graph **116/100**, actual Edge **104/297**. Cleanup and final development schema/data/resource preservation pass at **13:37:07 CDT**. Previously completed build/unit/lint/workflow checks were reused, not repeated. See the final continuation record below; earlier blockage/tooling observations remain historical.

## Fresh baseline and classification

The baseline was collected before source edits, using a Release **Rebuild**, the established `eslint src` command and Vite production compilation. Evidence is retained under ignored `.local/m6b`. The initial exploratory `eslint .` also scanned generated bundles/configuration; that output is not the application lint baseline. The subsequent exact project command confirms **0 errors / 54 warnings**.

| Inventory | Count / cause | Risk and disposition |
| --- | --- | --- |
| C# CS8618 | **13**: NodeData (4), DynamicEndpoint (4), CreateDynamicEndpointRequest (4), RequestPayload.rows (1) | Disconnected academic types promised initialized fields but permitted incomplete construction. Latent null/default risks if reused; no active request/authentication warning. Require explicit construction/presence instead of inventing defaults. |
| C# CS8603 | **6**: EndpointsService template getters returned null with non-nullable string signatures | Misleading service contract could encourage unchecked dereferencing by future callers. Return annotations now explicitly nullable; actual return behavior unchanged. |
| ESLint no-unused-vars | **54**: 43 React imports, eight other imports, two MemberDashboard declarations, one SqlTableNode prop | Mostly migration residue/obsolete declarations. No current exhaustive-deps, rules-of-hooks, unreachable-code or stale-closure lint finding. Remove declarations after checking usage; no rule suppression. |
| Production chunk | One warning: **518.81 kB**, gzip **152.93 kB** initial JS | Editor and React Flow eagerly imported through AppRoutes. Route-level lazy loading is a bounded improvement; no threshold increase. |
| React Flow development diagnostic | Historical `002` registry-identity warning | Fresh source review finds the existing registry already at module scope. Bounded actual Edge reproduction below distinguishes the installed library's StrictMode diagnostic from a changing application registry. |

Severity here describes maintenance risk, not a security advisory rating. No warning identified an active null dereference, missing authenticated-identity check, unsafe database read or Hook defect. Existing authentication validation, SQL null handling, ownership checks and graph transport were reviewed; no policy or controller rewrite was justified.

## Changes and their limits

**Backend:** the 13 legacy properties now use C# `required`, preserving field names/types and requiring future object initializers to supply them. System.Text.Json also rejects omitted required members; missing rows are not silently treated as an empty batch. These types have no active HTTP consumers; DynamicEndpoint's sole production initializer supplies all four strings. Required presence is not non-null/nonempty runtime validation: explicit JSON null and semantic validation still require deliberate handling before any future activation. No legacy endpoint/helper was registered, routed or executed against a database. The six string? return annotations match existing null results. No null-forgiving operator, global nullable switch, analyzer suppression, SQL/default value or active API contract changed.

Six new xUnit cases cover four incomplete legacy shapes, complete payload value preservation and unknown template null results. Existing 30 unit cases and six PostgreSQL cases remain intact. The tests query no legacy tables or database.

**Frontend:** remove only verified unused bindings. React's automatic JSX runtime needs no default React binding; index.jsx retains its used React.StrictMode binding. Other removed imports are LockClosedIcon, BuildingLibraryIcon, Cog6ToothIcon, HomePage's Link and four MemberDashboardPage icons. MemberDashboard's unused user subscription and unwired paused-project callback are removed. The active ProjectCard already enforces its existing paused-developer click behavior; it was not rewired or given a new status policy. The disconnected SqlTableNode renderer only loses its unused id destructuring; it remains disconnected.

The protected editor route now uses module-scoped React.lazy and a local Suspense status, so pending/anonymous sessions do not start the editor import. A failed module download displays an explicit reload/recovery message rather than an endless loading state or uncaught lazy-import failure. All existing route/project/role checks remain. Four new routing tests cover anonymous redirect, pending identity, authorized lazy resolution and load failure. Existing frontend tests lose only unused React imports; no assertions were removed.

No effects/dependency arrays were altered merely to reduce counts. MemberDashboardPage's whole-user callback dependency and redundant effect dependency are currently lint-clean; any future request cancellation or ID-only dependency refactor needs a separately demonstrated lifecycle benefit.

## Bundle investigation and measurements

An ignored, write:false Vite analysis used installed bundler module metadata; no analyzer dependency or permanent build option was added. Largest rendered-module groups were react-dom **437,851**, application/runtime **224,911**, @reactflow/core **156,623**, react-router **92,721**, Heroicons **40,949**, with additional d3 selection/transition/zoom modules. These are **bundler rendered code lengths**, not per-package minified/gzip download attribution. React Flow dominates the portion that can safely be deferred at the editor route. Axios/dnd-kit are absent from emitted module groups; removing unused imports/packages is not claimed to save their nonexistent bundled bytes.

Final normal production build, 553 modules:

| Artifact | Before | After |
| --- | --- | --- |
| Initial JS | 518.81 kB / gzip 152.93 | **343.48 kB / gzip 97.34** |
| Deferred editor JS | Included above | **175.62 kB / gzip 56.28** |
| Initial CSS | 53.78 kB / gzip 9.50 | **46.90 kB / gzip 8.07** |
| Deferred editor CSS | Included above | **6.88 kB / gzip 1.50** |
| Separate web-vitals JS | 4.34 kB / gzip 1.70 | Unchanged |
| >500 kB warning | 1 | **0**, threshold unchanged |

Initial JS is approximately 33.8% smaller (36.4% by reported gzip). Combined main/editor JS is slightly larger, **519.10 kB / gzip 153.62**, because splitting adds a loader/recovery boundary. This defers transfer; it is not a measured navigation, rendering or total-download speed improvement. Vite handles editor CSS with its dynamic chunk. Real production serving/network performance has not been benchmarked. No manual chunk taxonomy, dependency upgrade or architectural rewrite was needed.

## React Flow diagnostic investigation

The installed @reactflow/core useNodeOrEdgeTypes writes its type-key ref inside useMemo and emits `002` when the same keys are revisited. The existing application nodeTypes is already stable at module scope. An ignored standalone Vite page rendered the real ApiNode/catalog/createNode implementations and stable nodeTypes/edgeTypes using actual Edge **156.0.4314.50**, normal trusted HTTPS and independently verified loopback Vite PID/path. It used synthetic static nodes and made no API/database request.

Console-aware final evidence: **six nodes / ten handles** in both modes; non-StrictMode **0 warnings**; StrictMode **two `002` console warnings** during initial mounting, with no additional warnings on a stable rerender. Both modes have zero onError callbacks, page errors and external requests. The initial callback-only capture missed these console warnings and was superseded by the console-aware check; its zero-warning conclusion is not used.

This demonstrates a library development diagnostic under StrictMode's repeated memo calculation even when object identities are stable. It does not establish a broken handle, changing registry or graph state defect. **Retained intentionally:** StrictMode, library diagnostic and existing editor configuration; no console filtering, warning suppression, onError override or package patch in the application. The probe's callback/console collectors are test-only. Its private harness is not an additional full workflow regression. Persistence, conflicts, administrator/developer behavior and all six category implementations were left unchanged.

## Disconnected/duplicate material retained

- The malformed disconnected components/dashboard/admin/AdminDashboard.js, old dashboard variants, common controls, SqlTableNode and dnd-kit renderers remain archived in place. No import was added to activate them. The existing documented lint exclusion for the malformed component is unchanged; no new exclusion was added.
- EndpointsService dynamic templates, SDDG helpers/plugin, XML SessionManager and disabled SQLite backup routines remain historical, unregistered/unrouted. They disagree with the current schema and are not runnable features. Only nullability contracts were corrected where warned; schema/execution/backup implementation was not attempted.
- Generic SQL/API-key HTTP endpoints remain disabled. Bruno collections, original academic documentation and frontend legacy/ are retained. Axios/dnd-kit/runtime packages and all lockfiles remain unchanged despite unused paths.
- Larger deletion/consolidation, active controller/data-access extraction, request-cancellation refactors and legacy archive relocation are proposals requiring separate scope. No original material was deleted or public API removed.

## Verification and preservation

| Check | M6B result |
| --- | --- |
| Backend Release Rebuild | **Pass: 0 errors / 0 warnings**, versus 19 warnings before. |
| Backend unit | **36/36 pass**, versus 30; six new cases above. Test project builds without warnings. |
| Four active .NET helper builds | **Pass: 0 errors / 0 warnings**. |
| Frontend production build | **Pass**, zero chunk warnings; measurements above. |
| Frontend tests | **87/87 pass**, eight files, versus 83/six files. Includes existing graph/state/access/persistence tests. |
| Frontend lint | **0 errors / 0 warnings**, versus 0/54. Same rules and scope. |
| Bounded actual Edge component diagnostic | **Pass within stated limits**; two retained StrictMode `002` warnings, no page errors/external requests. |
| Workflow static validation | **Pass**, three unchanged local workflows and approved lock/lifecycle policy. No remote CI run. |
| PostgreSQL six-case/SQL suite | **6/6 pass** in the owner-approved final continuation; transactional constraints/rollback/least-privilege SQL checks also pass. |
| Full security HTTP | **120 assertions / 139 responses pass**, cleanup/restoration true, zero false assertions. |
| Graph durability/concurrency | **116 assertions / 100 responses pass**, both API-only and own-test-DB/API restart checkpoints, cleanup/restoration true. |
| Full actual Edge workflows | **104 assertions / 297 responses pass**, Edge 156.0.4314.50; zero false assertions/page errors/external requests; cleanup/restoration true. |

**Initial implementation-only phase:** Docker Engine was unavailable, so no database connection, SQL write/migration, test resource creation or Docker action occurred in that phase; health/schema/full fingerprints could not then be freshly asserted. Those limitations were reported rather than substituting M6A results. The final authorized continuation below closes that verification gap. Configuration/schema/dependency hashes remain unchanged; no backup/private key/OneDrive/master document was edited.

The sandbox's first .NET use performed its normal sandbox-user SDK setup and created its own development certificate; no app certificate was exported/replaced/trusted and no TLS bypass occurred. A sandboxed Edge attempt rejected certificate trust; the approved host-context check succeeded with normal trust. A host Stop-Process attempt failed; the owned execution session was then stopped normally. Those tooling limitations were not application failures or grounds to weaken guards.

Dependency declarations and locks did not change; online dependency audits/signatures were not unnecessarily repeated. M6A's npm-signature verification remains incomplete after registry failures. Existing dependency-audit results do not become fresh M6B provenance claims.

## Acceptance and next steps

**M6B meets its full approved local acceptance criteria.** All 19 compiler warnings and 54 lint warnings are resolved without suppression; the chunk warning is removed through measured deferred loading. The two reproducible library StrictMode diagnostics are documented and retained. The formerly blocked database/security/durability/full-browser suites now pass with guarded cleanup and development preservation. No regression or application/test-runner correction was needed during the continuation.

Do not repeat successful suites without changes, failures or an unresolved concern, and do not reset/use development as a fixture target. Broader dead-code deletion, dependency changes, hosted CI/Linux validation, production serving/performance, broader accessibility and another milestone require separate authorization. Current npm signature verification remains incomplete after historical M6A registry failures; dependencies were unchanged and no retry was needed for M6B.

## Final regression continuation — October 30, 2026

The owner reported Docker Desktop started and authorized the remaining verification. Bounded read-only checks confirmed **desktop-linux / Linux Engine 29.9.2**, then identified the exact development container as stopped. The first health gate stopped before SQL/testing. Fresh ID/ownership/image/mount/volume checks and a read-only copy of its **PG_VERSION=16** marker passed; the earlier explicit permission to start that existing container was reused. Only that container was started, became healthy and was neither recreated nor reset. Read-only preflight schema/data/control fingerprints matched the established transition baseline before testing.

The unchanged runner was used sequentially, with no unsafe development fallback:

| Suite | Private run ID | Fresh result |
| --- | --- | --- |
| Database | 64ec40b1653f4e55b6222ad2171497f4 | Six xUnit integration cases, **6/6**, plus transactional SQL checks. |
| Security | 62e7315b62744026adde52ff3aa1f7a8 | **120 assertions / 139 responses**, zero false assertions. |
| Graph | 5f77b0d18def43d698127d2e8872ce06 | **116 / 100**, including API-only and own-test-DB/API persistence restarts. |
| Browser | 672632df55134082938d762d1d76b084 | **104 / 297**, Edge **156.0.4314.50**, zero page errors/external requests/false assertions. |

Security covers valid HTTPS cookie requests, CSRF, invitations/registration, expiry/revocation and tenant/project permissions. Active legitimate request/response handling passes with the legacy contract annotations in place; source review confirms the annotated DTOs/template returns are not active wire contracts. Actual Edge covers session restoration and protected refresh, direct editor navigation/reopen, graph refresh/save/reload/conflicts and administrator versus assigned-developer restrictions. Explicit delayed/failed module loading retains the four passing M6B routing unit cases; no additional Edge network-fault injection is claimed. Response totals vary with refresh/request timing; the 104 recorded assertions remain intact.

Each run's .local/m6a/<run>/result.json records **Passed, DevelopmentFingerprintUnchanged, ExistingResourcesUnchanged, TestResourcesRemoved = true**. All live reports record completion, fixture cleanup and original-state restoration; empty isolated business tables are checked before deletion. Only each run's newly owned test container/volume/network was removed, using fresh guards. Reports and sanitized screenshots remain private. No unrelated resource or development business/schema write, volume adoption, down/prune or recovery operation occurred.

**Final read-only verification at 13:37:07 CDT:** same healthy development container ID **9a5addec312e77ffcb750a41fc54b98941b8db931c75d01d25e7b4cc56e04cf7**, volume **boilerroom-tds-portfolio-pgdata** (same October 22 creation identity) mounted at **/var/lib/postgresql/data**, image/init bind and **127.0.0.1:55432**. Schema markers **1/2/3**, counts **0/1/1/0/0/0**, original M2 fixture, normalized schema SHA-256, ordered six-table MD5/SHA-256, cluster system identifier/database OID/version all match both the pre-test snapshot and established transition baseline. All **15 original volumes, four containers and seven networks** match the post-start pre-test inventory; the development container was not restarted during the suites. All four test environments are absent; no workspace test/API/Vite process or listener on **8836/3000/55433** remains. Development PostgreSQL is left running/healthy.

All **49 changed M6B source/test files** and **24 protected source/config/lock/workflow files** matched verified hashes before testing. Existing 36 backend unit/87 frontend cases, zero-warning builds/lint, chunk measurements and static workflow results were reused without repetition. No application/test/tool source correction, dependency installation/upgrade, schema migration or regression failure occurred. The initial stopped-container health gate is preserved as a resolved preflight condition, not hidden as an application failure.

Continuation-only first-party edits are documentation: **PLAN.md, CODE_QUALITY.md, TESTING.md, AGENTS.md, FRONTEND_INTEGRATION.md and EDITOR_SECURITY.md**. Private read-only guards/snapshots, initialization-marker copy, suite map, file-state comparison and aggregate evidence are ignored under **.local/m6b-regression-20261030**; actual suite reports remain under their .local/m6a run IDs. No Git/publication/master-document/OneDrive change or next milestone.

Exact modified/added paths follow in the final inventory appendix. Private logs, source-hash manifest, import-only review, bundle attribution and diagnostic evidence remain under ignored .local/m6b; private frontend diagnostic assets are under ignored TDS-Frontend-main/.local/m6b. No Git initialization/publication/deployment occurred.

## Exact file inventory

51 modified + four added = **55 first-party paths**, zero removed/renamed.

| Path | Change | Reason |
| --- | --- | --- |
| AGENTS.md | modified | Current M6B guidance/results; historical records preserved. |
| Backend/Controllers/RequestPayload.cs | modified | Explicit required legacy construction/presence contract. |
| Backend/Models/AuthModels.cs | modified | Explicit required legacy construction/presence contract. |
| Backend/Services/EndpointsService.cs | modified | Six truthful nullable return contracts. |
| EDITOR_SECURITY.md | modified | Current M6B guidance/results; historical records preserved. |
| FRONTEND_INTEGRATION.md | modified | Current M6B guidance/results; historical records preserved. |
| PLAN.md | modified | Current M6B guidance/results; historical records preserved. |
| TDS-Frontend-main/src/App.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/App.test.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/ProjectCard.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/auth/ForgotPasswordForm.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/auth/LoginForm.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/auth/SignupForm.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/common/BackButton.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/admin/CompanyCodeDisplay.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/admin/CreateProjectForm.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/admin/MemberList.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/member/AssignedProjectItem.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/member/Member ProjectCard.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/member/MemberDashboard.jsx | modified | Unused imports/subscription and duplicate unwired handler. |
| TDS-Frontend-main/src/components/dashboard/shared/ChangePasswordForm.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/dashboard/shared/DashboardHeader.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/home/CallToActionSection.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/home/FeaturesSection.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/home/HeroSection.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/home/TestimonialsSection.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/navigation/Footer.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/navigation/Navbar.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/navigation/Sidebar.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/ApiNode.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/DraggableItem.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/DraggableNodeSource.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/PropertyEditor.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/PropertyEditor.test.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/SortableItem.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/components/playground/SqlTableNode.jsx | modified | Unused React import and dormant id destructuring. |
| TDS-Frontend-main/src/contexts/AuthContext.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/AdminDashboardPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/ComingSoonPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/DocumentationPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/ForgotPasswordPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/HomePage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/LoginPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/MemberDashboardPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/ProfilePage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.test.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/SignupPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/pages/TermsAndConditionsPage.jsx | modified | Unused imports only; existing behavior/assertions unchanged. |
| TDS-Frontend-main/src/routes/AppRoutes.jsx | modified | Protected editor lazy loading/status/failure recovery; unused import. |
| TESTING.md | modified | Current M6B guidance/results; historical records preserved. |
| CODE_QUALITY.md | added | Warning inventory, investigation, measurements, verification and limits. |
| TDS-Frontend-main/src/routes/AppRoutes.load-failure.test.jsx | added | Explicit failed-module recovery regression. |
| TDS-Frontend-main/src/routes/AppRoutes.test.jsx | added | Three protected lazy-route/loading cases. |
| tests/BoilerRoom.Tests/LegacyContractTests.cs | added | Six legacy contract regression cases. |
