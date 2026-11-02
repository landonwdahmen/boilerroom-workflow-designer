# Boiler-Room frontend — Vite

React 19 / Router 7 / React Flow 11, Vite 8.3.5 / Vitest 5.0.5 / ESLint 10.13.0. Use the exact package.json/package-lock.json pins; Node 22.14.0 / npm 10.9.2 are the verified toolchain. See the [root README](../README.md) for all four SDSU contributors and the separate October 2026 modernization.

From this directory:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Lifecycle hooks remain disabled. Unit tests and production builds need no database/TLS secrets. The production build outputs generated build/; it does not prove live browser behavior. Current suite has 100 tests; test geometry mocks do not replace actual Edge regression.

For development HTTPS complete [root setup](../README.md#local-development-prerequisites) and run `pwsh -NoProfile -File scripts/Start-LocalFrontend.ps1` from the root. Vite binds localhost:3000 strictly; the API uses localhost:8836. Generate/trust your own ignored localhost PEM/key through the documented normal OS workflow. Never copy private certs into source or bypass validation.

VITE_API_URL is public and limited to https://localhost:8836/api; see [.env.example](.env.example). Do not put passwords/DB settings into VITE_ variables. Credentialed cookie/CSRF requests and server authorization remain required. All six graph categories store design metadata only; no workflow/SQL/code/HTTP execution. Read [testing](../TESTING.md), [editor scope](../EDITOR_SECURITY.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

Original CRA templates, empty mock JSON and disconnected prototype components are retained privately, outside this selected source edition. No package upgrade or first-party license is introduced by this export.
