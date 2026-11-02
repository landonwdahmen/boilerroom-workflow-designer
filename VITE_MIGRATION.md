# Milestone 5B — React tooling migration

**Subsequent M5C remediation, October 28:** current dependency pins are Axios 1.21.0, Router/DOM 7.18.5 and PostCSS 8.5.32; old turbo-stream is removed by the parent. Final full/production npm audits report zero findings, signature/provenance checks pass, all 83 tests and graph/security/actual Edge regressions pass (116/100, 120/139, 104/302), with all baselines restored. Read [the complete dependency-security record](DEPENDENCY_SECURITY.md). Tooling/HTTPS/build/test configurations below are preserved. Earlier version/advisory/result tables describe the M5B checkpoint and its then-proposed queue.

October 28, 2026 portfolio improvement to the recovered four-person 2024–2025 SDSU/Triode Data Systems application. Original attribution and publication restrictions remain in [README](README.md). This changes frontend tooling; backend C# logic, authentication policy, PostgreSQL schema and application UI are unchanged.

## Toolchain and implementation

Installed Node **22.14.0** / npm **10.9.2** are retained. The exact development dependencies are Vite **8.3.5**, `@vitejs/plugin-react` **6.1.2**, Vitest **5.0.5**, jsdom **27.4.0**, ESLint **10.13.0**, `@eslint/js` **10.0.1**, `eslint-plugin-react-hooks` **7.1.1** and `globals` **16.5.0**. All resolved package engine constraints accept the installed Node. The combined declared Node requirement is `^22.13.0 || ^24.0.0 || >=26.0.0`; npm 10+ is required. No global software was installed.

Vite's [Node requirements and HTML entry](https://vite.dev/guide/), the React plugin's [automatic JSX runtime](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react), [Vitest's migration guidance](https://vitest.dev/guide/migration/) and [ESLint 10 JSX support](https://eslint.org/docs/latest/use/migrate-to-10.0.0) informed the choice. Vitest shares the Vite React transform and directly handles Router's ESM exports. This removes the CRA/Jest resolver mappings and old jsdom encoder shim, while preserving every existing test case. Mocks use `vi`, asynchronous `importActual` and explicit default exports; CommonJS test imports become static imports. Tests remain isolated and reset mocks between cases.

The root frontend `index.html` imports `src/index.jsx`. Forty-four JSX-bearing `.js` files become `.jsx`, keeping their directories, extensionless imports and application contents. Only the three renamed test files change test-runner syntax. All other renamed files are byte-identical. The original HTML is retained at `TDS-Frontend-main/legacy/cra-index.html`, outside `public`, so it cannot overwrite Vite's generated index. The previous frontend README is retained at `legacy/cra-README.md` as historical reference. Public icons, logos, manifest and robots file remain intact. There are no active CRA SVG-component imports to replace.

React/React DOM **19.0.0**, Router **7.4.0**, React Flow **11.11.4**, Tailwind **3.4.17**, Axios **1.8.4**, testing-library packages and every other retained direct package keep their previously locked versions. These are pinned explicitly to prevent accidental application upgrades while resolving the new tool graph. Testing-library packages move from runtime to development declarations. Existing CommonJS Tailwind/PostCSS configuration remains; Tailwind scans both `.js` and `.jsx`. `build:css` and the dormant synthetic JSON Server script are retained and are not required for the integrated application.

## Commands and HTTPS

From `TDS-Frontend-main`:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:watch
npm.cmd ls --all
npm.cmd audit
```

`npm start` aliases the same Vite server. For integrated use, prefer `pwsh -NoProfile -File ./scripts/Start-LocalFrontend.ps1` from the repository root after the documented database/API setup. This helper passes the fixed public API URL in the process environment and launches the exact workspace Vite script so listener guards can verify it. Vite always requires the existing trusted `.local/https/localhost.pem` and `.key` for development hosting, binding **https://localhost:3000** with strict port selection. Missing files cause failure; there is no HTTP fallback. No new CA, trust change or certificate-verification override is introduced. Vitest has a separate configuration and reads no TLS files or database settings.

`VITE_API_URL` replaces `REACT_APP_API_URL`, retaining `https://localhost:8836/api` and the client's exact-origin/path validation. Vite reads frontend env files, not the parent PostgreSQL `.env`. Only public configuration may use `VITE_*`; TLS keys and database credentials never use that prefix. Server filesystem access is confined to the frontend root; a status-only real TLS request for the parent `.env` returned **403**. Root and `/admin-dashboard` returned **200** SPA HTML. Static HTML delivery alone does not authorize a user; the application/API guards still enforce access.

Cross-origin requests remain explicit: SPA `https://localhost:3000` → API `https://localhost:8836/api`. No proxy or backend CORS change is needed. Credentialed fetch, CSRF bootstrap/write headers, HttpOnly/Secure/Strict cookies, DB-validated identity/roles/tenant/assignment checks and revocation remain unchanged. No browser-readable token is added. Vite's SPA fallback supports direct navigation and refresh. Production output remains the fixed frontend **build/** directory, now with **assets/** rather than CRA's **static/** paths. The configuration does not accept `BUILD_PATH`; only this generated output is emptied. Vite's default modern-browser target replaces CRA's JS compilation target; only the documented current Edge environment is runtime-verified. The retained Browserslist declaration still informs CSS tooling; older browsers are unverified.

## Verification and limits

The pre-change source snapshot contains **245 files**. Before dependency changes, CRA production build and all **83 tests / six suites** passed; build emitted the eight existing ESLint diagnostics and stale Browserslist data. Backend Release build passed. The first Jest attempt was blocked by sandbox transform-cache rename permissions; an approved retry passed. A sandbox npm resolution stalled and was stopped by exact task-process identity. The next normal resolution encountered stale CRA Babel/optional-peer constraints. Resolving the same exact manifest in an empty ignored task-local staging directory succeeded without force/legacy-peer flags. An initial `npm ci` from the repository root failed for lack of a root lockfile; the corrected frontend command was used. A sandbox frontend install then failed with npm's exit-handler error; approved execution outside the sandbox succeeded. A provisional ESLint 9 install warning exposed its unsupported status; the final lockfile uses supported ESLint 10 and no React lint plugin with an incompatible peer range.

| Activity | Runtime-verified result |
| --- | --- |
| Frontend restore | Final `npm ci --ignore-scripts --no-audit --no-fund` succeeded; 424 Windows packages installed, 449 resolved lock entries including other-platform optionals. |
| Production build | `npm run build` passed with Vite 8.3.5; 553 modules, generated HTML/CSS/JS. Main JS 512.62 kB / 151.02 kB gzip, CSS 53.78 kB / 9.50 kB gzip. One normal >500 kB chunk warning is retained, not suppressed. |
| Complete unit/component tests | `npm test`: **83 passed, six files**, zero failures (24.94 s). Assertions and cases retained; real canvas geometry remains browser-tested separately. |
| Lint | `npm run lint`: exit 0, **0 errors / 54 warnings**. Automatic JSX makes original React imports unused; broader source scanning also reports existing unused declarations/arguments. The specifically documented dormant malformed admin component is preserved and explicitly excluded. Warnings are not disabled or repaired through unrelated source edits. |
| Backend compatibility | `dotnet build Backend/ZitaDataSystem.csproj --configuration Release --no-restore --verbosity minimal` passed, incremental 0 warnings/errors. M5A's 19 full-build nullable warnings remain unresolved. |
| Graph HTTP/SQL | **116 assertions / 100 responses**, including revision races, 400/401/403/404/409/413 denials, API-only and guarded project-DB restart durability, committed SQL readback and cleanup. |
| Security HTTP/SQL | **120 assertions / 139 responses**, including real expiry, login/invitation/password/logout, CSRF, role/tenant denials and 429 rate limiting. The normal rate window elapsed before browser login tests. |
| Actual Edge 156.0.4314.50 | **104 assertions / 299 API responses**, zero false assertions, page errors or external requests. Verified Vite development-server direct protected navigation/refresh, login/session restore, invitation signup, profile/password/logout/revocation, assignment/role/tenant/CSRF denials, real canvas editing and PostgreSQL Save/Reload/refresh/conflict handling. Cleanup and original-state restoration true. |

Sanitized local evidence: `.local/graph-probe/c6d684d0d3d842f683569d2e225ead5c/report.json` and `.local/security-probe/73babfd4a21f4c75a258fa47d1233598/report.json` both have completion, cleanup and original-state restoration true. Browser evidence: `.local/browser-probe/894a518cb255479b95204e199f4017ab/report.json` (private fixture run `079beade7de04f82b98b37b5d9f6e165`, 11 direct owned-row deletions plus graph cascade). React Flow emitted development nodeTypes/edgeTypes identity warnings; selected canvas interactions still passed. The test runner records page errors separately from console warnings. A readiness guard stopped one API test invocation before fixtures; the probe ran only after fresh listener verification. The graph durability test stops the API around the PostgreSQL restart; continuous live-API outage recovery is unverified. Test credentials remain in private process memory; reports contain labels/statuses/booleans only.

## Dependency assessment and M5C queue

**Historical M5B audit:** the following five entries were subsequently remediated in the explicitly authorized M5C. See DEPENDENCY_SECURITY.md for current results; retain these original findings for comparison.

Full installed `npm ls --all --json` exits **0**, with no invalid/missing/extraneous tree errors. Official `npm audit --json` completed before and after, each exiting **1 for advisories**. Before: **72 affected-package entries** (19 low, 13 moderate, 36 high, 4 critical), 1,454 resolved entries. After: **five high affected-package entries**, no low/moderate/critical aggregate entries, 449 resolved entries. Counts describe affected package entries, not five unique underlying advisories. The final lock has no package deprecation flags and no reported advisories for the selected Vite/Vitest toolchain; neither fact proves vulnerability-free software.

Removed CRA paths include react-scripts 5.0.1, webpack 5.98.0, webpack-dev-server 4.15.2, Workbox 6.6.0, Jest/jsdom 27/16, eslint-config-react-app, SVGO, nth-check and rollup-plugin-terser. Older Babel, jsdom, minimatch, form-data and other advisory entries also disappear through the new dependency resolution; some package names remain at updated compatible tooling/transitive versions. Removing CRA is not the sole explanation for every advisory reduction. Retained direct application package versions do not change.

| Remaining affected entry | Scope and proposed follow-up (not executed) |
| --- | --- |
| Axios 1.8.4 | 32 direct advisory records, including Node adapter DoS/SSRF and prototype-pollution gadgets; [maintainer DoS advisory](https://github.com/axios/axios/security/advisories/GHSA-4hjh-wcwx-xvwj). Source review finds no Axios imports in current source; it is retained pending scoped dependency cleanup. npm proposes 1.21.0. Absence from the active fetch path does not clear the installed package. |
| PostCSS 8.5.3 | Four direct advisory records covering CSS output/XSS, hostile source-map file reads and related parsing; [maintainer source-map advisory](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q). Build-time exposure differs from browser runtime; do not process untrusted styles. npm proposes 8.5.32. |
| react-router / react-router-dom 7.4.0 | Fourteen direct advisory records on react-router, propagated to the DOM package, covering server/SSR issues, redirects and XSS; [maintainer redirect advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-2w69-qvjg-hvjx). This application uses declarative browser routing, not a Router server/SSR deployment, but browser-specific concerns still need review. npm proposes react-router-dom 7.18.5. |
| turbo-stream 2.4.0 | One direct advisory record inherited through Router's server-oriented streaming dependency; [single-fetch advisory](https://github.com/advisories/GHSA-rxv8-25v2-qmq8). No application SSR/single-fetch server is configured. Address through the separately reviewed Router upgrade. |

The counts include overlapping advisories and indirect propagation. M5C should review exact fixed releases, exposure and compatibility, then make bounded upgrades with the same regressions. These registry-proposed versions are recorded observations, not automatically applied recommendations to upgrade without review. No `npm audit fix`, force resolution, application dependency upgrade or security-policy change was used.

Lifecycle inspection of the complete final lock found only `fsevents@2.3.3`'s optional macOS `node-gyp rebuild` install hook; it is omitted on Windows. All hooks remain disabled for restoration. Native Windows Rolldown bindings arrive as ordinary integrity-checked optional npm packages and worked without hooks. Every resolved download is from HTTPS registry.npmjs.org. Other platforms and lifecycle requirements for future dependency graphs are unverified.

## Files and rollback

**Statically verified final review:** 251 first-party files and nine generated production files scanned with no matches for either actual local DB password; 79 local Markdown targets resolve. Private env/TLS/auth-key/report/build paths are ignored, public source remains visible, manifest declarations match the lock, all 245 baseline copies retain their recorded SHA256, and Git history remains absent. The exact inventory records **six new files, 16 modified existing paths, 45 renames (42 byte-identical and three adapted test files), zero discarded originals**. Backend/database paths are unchanged. This bounded scan is not a comprehensive secret or release audit.

New configuration: frontend `vite.config.mjs`, `vitest.config.mjs`, `eslint.config.mjs`, root frontend `index.html`; new migration record: this file. Package/lock, public env example, shared API env lookup, test setup/five test files and the two launch/browser guard scripts are updated. Forty-four JSX paths and the old HTML are renamed with content retained; three renamed tests also receive the documented mock/import changes. Frontend README is updated and its former contents archived. Root README, FRONTEND_INTEGRATION, AGENTS, PLAN and the stale Jest statement in SECURITY are updated. The exact path/hash inventory is `.local/m5b-final-change-inventory.json`; the complete rename table appears below. DOTNET10_UPGRADE gains a pointer to the current frontend commands. Final guarded SQL state is users/projects/organizations/test/invitations/graphs = **0/1/1/0/0/0**, schema markers **1/2/3**, original M2 fixture intact, PostgreSQL healthy, unrelated container states unchanged, and no task API/frontend listeners remain. No backend source, database DDL, team credits or unrelated files are changed.

Rollback is proposed, not executed:

1. Stop only verified task API/frontend listeners. Preserve any later user edits; compare the final `.local/m5b-final-change-inventory.json` hashes first and stop if a target changed afterward.
2. Use ignored `.local/m5b-baseline-20261028/source` and its SHA256 `manifest.json` to restore only M5B-modified files. Move the documented JSX/HTML renames back to their original names; restore original package/lock, setup/tests and launch guards together. Remove only unchanged M5B-created files after verifying exact absolute paths remain inside this workspace. Do not overlay the whole snapshot over unrelated later work.
3. Restore frontend dependencies with the original reviewed `npm ci --ignore-scripts --no-audit --no-fund`, then the original CRA build and Jest commands. Re-run guarded runtime checks before claiming rollback verified. The source snapshot preserves original bytes and contains no private `.env`, certificate, credentials or generated packages.
4. Keep .NET 10 and PostgreSQL schema/data/volume as they are; this rollback requires no SDK uninstall, database restore/reset, Git initialization/history change or global tool installation. CRA rollback restores the old advisory/deprecation debt.

No workflow execution, hosted CI, production hosting, public release, older-browser compatibility or full independent security review is established by this milestone. M5C is not authorized automatically.

## Exact source file inventory

251 first-party files after migration: 6 new, 16 modified at existing paths, 45 renames (42 byte-identical, three test adaptations), no discarded original files. Generated build/dependencies/private helpers/evidence are excluded.

New files:

- `TDS-Frontend-main/eslint.config.mjs`
- `TDS-Frontend-main/index.html`
- `TDS-Frontend-main/legacy/cra-README.md`
- `TDS-Frontend-main/vite.config.mjs`
- `TDS-Frontend-main/vitest.config.mjs`
- `VITE_MIGRATION.md`

Modified existing paths:

- `AGENTS.md`
- `DOTNET10_UPGRADE.md`
- `FRONTEND_INTEGRATION.md`
- `PLAN.md`
- `README.md`
- `scripts/Start-LocalFrontend.ps1`
- `scripts/Test-LocalBrowser.ps1`
- `SECURITY.md`
- `TDS-Frontend-main/.env.example`
- `TDS-Frontend-main/package-lock.json`
- `TDS-Frontend-main/package.json`
- `TDS-Frontend-main/README.md`
- `TDS-Frontend-main/src/services/api.js`
- `TDS-Frontend-main/src/services/api.test.js`
- `TDS-Frontend-main/src/services/graphs.test.js`
- `TDS-Frontend-main/src/setupTests.js`

Content-preserving renames (test adaptations marked):

| Original path | Current path | Contents |
| --- | --- | --- |
| `TDS-Frontend-main/src/App.js` | `TDS-Frontend-main/src/App.jsx` | Byte-identical |
| `TDS-Frontend-main/src/App.test.js` | `TDS-Frontend-main/src/App.test.jsx` | Existing cases retained; Vitest mocks/imports |
| `TDS-Frontend-main/src/components/auth/ForgotPasswordForm.js` | `TDS-Frontend-main/src/components/auth/ForgotPasswordForm.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/auth/LoginForm.js` | `TDS-Frontend-main/src/components/auth/LoginForm.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/auth/SignupForm.js` | `TDS-Frontend-main/src/components/auth/SignupForm.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/common/BackButton.js` | `TDS-Frontend-main/src/components/common/BackButton.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/admin/CompanyCodeDisplay.js` | `TDS-Frontend-main/src/components/dashboard/admin/CompanyCodeDisplay.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/admin/CreateProjectForm.js` | `TDS-Frontend-main/src/components/dashboard/admin/CreateProjectForm.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/admin/MemberList.js` | `TDS-Frontend-main/src/components/dashboard/admin/MemberList.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/member/AssignedProjectItem.js` | `TDS-Frontend-main/src/components/dashboard/member/AssignedProjectItem.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/member/Member ProjectCard.js` | `TDS-Frontend-main/src/components/dashboard/member/Member ProjectCard.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/member/MemberDashboard.js` | `TDS-Frontend-main/src/components/dashboard/member/MemberDashboard.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/shared/ChangePasswordForm.js` | `TDS-Frontend-main/src/components/dashboard/shared/ChangePasswordForm.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/dashboard/shared/DashboardHeader.js` | `TDS-Frontend-main/src/components/dashboard/shared/DashboardHeader.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/home/CallToActionSection.js` | `TDS-Frontend-main/src/components/home/CallToActionSection.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/home/FeaturesSection.js` | `TDS-Frontend-main/src/components/home/FeaturesSection.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/home/HeroSection.js` | `TDS-Frontend-main/src/components/home/HeroSection.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/home/TestimonialsSection.js` | `TDS-Frontend-main/src/components/home/TestimonialsSection.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/navigation/Footer.js` | `TDS-Frontend-main/src/components/navigation/Footer.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/navigation/Navbar.js` | `TDS-Frontend-main/src/components/navigation/Navbar.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/navigation/Sidebar.js` | `TDS-Frontend-main/src/components/navigation/Sidebar.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/ApiNode.js` | `TDS-Frontend-main/src/components/playground/ApiNode.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/DraggableItem.js` | `TDS-Frontend-main/src/components/playground/DraggableItem.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/DraggableNodeSource.js` | `TDS-Frontend-main/src/components/playground/DraggableNodeSource.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/PropertyEditor.js` | `TDS-Frontend-main/src/components/playground/PropertyEditor.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/PropertyEditor.test.js` | `TDS-Frontend-main/src/components/playground/PropertyEditor.test.jsx` | Existing cases retained; Vitest mocks/imports |
| `TDS-Frontend-main/src/components/playground/SortableItem.js` | `TDS-Frontend-main/src/components/playground/SortableItem.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/playground/SqlTableNode.js` | `TDS-Frontend-main/src/components/playground/SqlTableNode.jsx` | Byte-identical |
| `TDS-Frontend-main/src/components/ProjectCard.js` | `TDS-Frontend-main/src/components/ProjectCard.jsx` | Byte-identical |
| `TDS-Frontend-main/src/contexts/AuthContext.js` | `TDS-Frontend-main/src/contexts/AuthContext.jsx` | Byte-identical |
| `TDS-Frontend-main/src/index.js` | `TDS-Frontend-main/src/index.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/AdminDashboardPage.js` | `TDS-Frontend-main/src/pages/AdminDashboardPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/ComingSoonPage.js` | `TDS-Frontend-main/src/pages/ComingSoonPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/DocumentationPage.js` | `TDS-Frontend-main/src/pages/DocumentationPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/ForgotPasswordPage.js` | `TDS-Frontend-main/src/pages/ForgotPasswordPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/HomePage.js` | `TDS-Frontend-main/src/pages/HomePage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/LoginPage.js` | `TDS-Frontend-main/src/pages/LoginPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/MemberDashboardPage.js` | `TDS-Frontend-main/src/pages/MemberDashboardPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/ProfilePage.js` | `TDS-Frontend-main/src/pages/ProfilePage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.js` | `TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.test.js` | `TDS-Frontend-main/src/pages/ProjectPlaygroundPageV2.test.jsx` | Existing cases retained; Vitest mocks/imports |
| `TDS-Frontend-main/src/pages/SignupPage.js` | `TDS-Frontend-main/src/pages/SignupPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/pages/TermsAndConditionsPage.js` | `TDS-Frontend-main/src/pages/TermsAndConditionsPage.jsx` | Byte-identical |
| `TDS-Frontend-main/src/routes/AppRoutes.js` | `TDS-Frontend-main/src/routes/AppRoutes.jsx` | Byte-identical |
| `TDS-Frontend-main/public/index.html` | `TDS-Frontend-main/legacy/cra-index.html` | Byte-identical |
