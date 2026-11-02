// October 2026: installed Playwright + Edge, strict normal TLS, private in-memory fixtures.
// No traces, videos, request bodies, credentials, cookies or invitation codes in reports/logs.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.TDS_PLAYWRIGHT_MODULE || 'playwright');
const reportDirectory = path.resolve('.local/browser-probe', randomUUID().replaceAll('-', ''));
fs.mkdirSync(reportDirectory, { recursive: true });
const report = { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
  completed: false, assertions: {}, http: [], pageErrors: 0, externalRequestsBlocked: 0 };
let stage = 'listener identity', browser, fixture, fixtureLines, cleanupDone = false;
const save = () => fs.writeFileSync(path.join(reportDirectory, 'report.json'), JSON.stringify(report, null, 2));
const check = (label, value) => { report.assertions[label] = !!value; save(); if (!value) throw new Error('Assertion failed'); };
const visible = async (locator) => { await locator.waitFor({ state: 'visible' }); return true; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lines = [], pending = [];
function nextLine() {
  if (lines.length) return Promise.resolve(lines.shift());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture timeout')), 20000);
    pending.push(value => { clearTimeout(timer); resolve(value); });
  });
}
async function fixtureCommand(command) { fixture.stdin.write(command + '\n'); return nextLine(); }
async function run() {
  // The PowerShell wrapper independently checks command line, socket and Docker ownership first.
  if (process.argv.length !== 4 || !process.argv.slice(2).every(value => /^\d+$/.test(value))) throw new Error('Run guarded wrapper');
  for (const pid of process.argv.slice(2)) process.kill(Number(pid), 0);
  stage = 'launch trusted browser';
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  report.browser = browser.version();
  const allowed = new Set(['https://localhost:3000', 'https://localhost:8836']);
  async function context() {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.route('**/*', route => {
      if (!allowed.has(new URL(route.request().url()).origin)) { report.externalRequestsBlocked++; return route.abort(); }
      return route.continue();
    });
    ctx.on('page', page => {
    page.setDefaultTimeout(15000);
    page.on('pageerror', () => { report.pageErrors++; });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === 'https://localhost:8836') report.http.push({ method: response.request().method(),
        route: url.pathname.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, ':id'), status: response.status() });
    });
    });
    return ctx.newPage();
  }
  const admin = await context();
  await admin.goto('https://localhost:3000/login');
  check('Trusted HTTPS renders login', await visible(admin.getByText('Sign in to your account')));
  stage = 'private fixture provisioning';
  fixture = spawn('dotnet', [path.resolve('tools/BrowserWorkflowFixture/bin/Release/net10.0/BrowserWorkflowFixture.dll'), '--browser-fixture-stdio'], {
    cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
  });
  // Capture privately. NEVER inherit/forward stdout or stderr; even error objects can contain bodies.
  fixture.stderr.on('data', () => {});
  fixtureLines = createInterface({ input: fixture.stdout });
  fixtureLines.on('line', line => {
    const value = JSON.parse(line);
    if (pending.length) pending.shift()(value); else lines.push(value);
  });
  const data = await nextLine();
  report.fixtureRun = data.run; report.organizations = [data.a, data.b]; save();
  async function login(page, email, password, expectedRole) {
    await page.goto('https://localhost:3000/login');
    // Already authenticated pages redirect; end that real session before exercising login again.
    await Promise.race([page.getByText('Sign in to your account').waitFor(), page.getByTitle('Logout').first().waitFor()]);
    if (!await page.getByText('Sign in to your account').isVisible()) {
      await page.getByTitle('Logout').first().click();
      await page.getByText('Sign in to your account').waitFor();
    }
    await page.getByLabel('Email Address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const received = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const response = await received;
    check('Credential login succeeds ' + expectedRole, response.status() === 200);
    const expiry = (await response.json()).expiresAt;
    await page.waitForURL('**/' + (expectedRole === 'administrator' ? 'admin-dashboard' : 'member-dashboard'));
    if (expectedRole === 'administrator') await page.getByRole('button', { name: 'Issue invitation' }).waitFor();
    else await page.getByText('My Projects').first().waitFor();
    return expiry;
  }
  async function ensureAdmin() {
    await admin.goto('https://localhost:3000/admin-dashboard');
    await Promise.race([admin.getByRole('button', { name: 'Issue invitation' }).waitFor(), admin.getByText('Sign in to your account').waitFor()]);
    if (await admin.getByText('Sign in to your account').isVisible()) await login(admin, data.emailA, data.password, 'administrator');
  }
  async function invitation(email) {
    await ensureAdmin();
    await admin.getByLabel('Invitation email').fill(email);
    const response = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/invitations' && r.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Issue invitation' }).click();
    check('Admin invitation issuance 200', (await response).status() === 200);
    const code = await admin.getByLabel('One-time invitation code', { exact: true }).inputValue();
    check('One-time invitation format', /^[a-f0-9]{64}$/.test(code));
    await admin.getByRole('button', { name: 'Dismiss code' }).click();
    return code;
  }
  async function signup(page, email, code) {
    await page.goto('https://localhost:3000/signup');
    await page.getByLabel('Full name', { exact: true }).fill('Synthetic M3B Developer');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(data.password);
    await page.getByLabel('Confirm password', { exact: true }).fill(data.password);
    await page.getByLabel('Invitation code', { exact: true }).fill(code);
    check('Signup has no contractual acceptance control', await page.getByRole('checkbox').count() === 0);
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/register' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create developer account' }).click();
    return (await response).status();
  }
  async function browserRequest(page, method, route, body, csrf = true) {
    return page.evaluate(async ({ method, route, body, csrf }) => {
      const base = 'https://localhost:8836/api';
      const headers = { 'Content-Type': 'application/json' };
      if (csrf && method !== 'GET') {
        const bootstrap = await fetch(base + '/auth/csrf', { credentials: 'include' });
        headers['X-CSRF-TOKEN'] = (await bootstrap.json()).requestToken;
      }
      const response = await fetch(base + route, { method, credentials: 'include', headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      // Never return credential-bearing bodies; only this explicitly safe list is inspected.
      const data = response.ok && method === 'GET' && route === '/auth/projects' ? await response.json() : null;
      return { status: response.status, data };
    }, { method, route, body, csrf });
  }
  stage = 'administrator login and restoration';
  await login(admin, data.emailA, data.password, 'administrator');
  await admin.reload();
  check('Admin refresh restores cookie session', await visible(admin.getByRole('heading', { name: 'Organization users' })));
  check('Admin organization users visible', await visible(admin.getByText(data.emailA, { exact: true })));
  const cookies = await admin.context().cookies('https://localhost:8836');
  const session = cookies.find(cookie => cookie.name === '__Host-tds.session');
  check('Browser cookie is HttpOnly Secure Strict', session?.httpOnly && session.secure && session.sameSite === 'Strict');
  check('Browser JavaScript cannot read session cookie', !(await admin.evaluate(() => document.cookie)).includes('__Host-tds.session'));
  check('No browser auth storage', await admin.evaluate(() => ['token','refreshToken','authToken','userData'].every(key => localStorage.getItem(key) === null && sessionStorage.getItem(key) === null)));
  stage = 'invitation signup and explicit login';
  const code = await invitation(data.devEmail);
  const developer = await context();
  check('Invited developer registration 200', await signup(developer, data.devEmail, code) === 200);
  await developer.waitForURL('**/login');
  check('Registration requires explicit login', await visible(developer.getByText('Account created. Sign in with your new credentials.')));
  check('Registration did not authenticate', (await browserRequest(developer, 'GET', '/auth/me')).status === 401);
  const invalid = await context();
  stage = 'used expired and duplicate invitation errors';
  check('Used invitation rejected 400', await signup(invalid, data.devEmail, code) === 400);
  check('Used invitation error visible', await visible(invalid.getByRole('alert')));
  const expiredEmail = 'browser-expired-' + data.run + '@example.test';
  const expiredCode = await invitation(expiredEmail);
  check('Owned expiry fixture adjusted', (await fixtureCommand('expire')).expired);
  check('Expired invitation rejected 400', await signup(invalid, expiredEmail, expiredCode) === 400);
  check('Expired invitation guidance visible', (await invalid.getByRole('alert').innerText()).includes('24 hours'));
  const duplicate = await invitation(data.devEmail);
  check('Duplicate registration returns 409', await signup(invalid, data.devEmail, duplicate) === 409);
  check('Conflict guidance visible', (await invalid.getByRole('alert').innerText()).includes('conflicts'));
  stage = 'project creation and assignment';
  await ensureAdmin();
  await admin.getByRole('button', { name: 'Refresh', exact: true }).click();
  await admin.getByText(data.devEmail, { exact: true }).waitFor();
  for (const [name, assigned] of [['Synthetic M3B Assigned', true], ['Synthetic M3B Unassigned', false]]) {
    await admin.getByRole('button', { name: 'Create New Project', exact: true }).click();
    await admin.locator('#projectName').fill(name);
    await admin.locator('#projectDescription').fill('Synthetic local browser verification.');
    if (assigned) await admin.locator('#projectAssignee').selectOption({ label: 'Synthetic M3B Developer' });
    const response = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/projects' && r.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Create Project', exact: true }).click();
    check('Project created 200 ' + (assigned ? 'assigned' : 'unassigned'), (await response).status() === 200);
    await admin.getByRole('heading', { name, exact: true }).waitFor();
  }
  const projects = (await browserRequest(admin, 'GET', '/auth/projects')).data;
  const projectId = projects.find(project => project.name === 'Synthetic M3B Assigned').id;
  stage = 'developer assigned visibility and route guards';
  await login(developer, data.devEmail, data.password, 'developer');
  check('Assigned project displayed', await visible(developer.getByRole('heading', { name: 'Synthetic M3B Assigned', exact: true })));
  check('Unassigned project hidden', await developer.getByRole('heading', { name: 'Synthetic M3B Unassigned', exact: true }).count() === 0);
  await developer.reload();
  check('Developer protected refresh restores', await visible(developer.getByRole('heading', { name: 'Synthetic M3B Assigned', exact: true })));
  await developer.goto('https://localhost:3000/admin-dashboard');
  await developer.waitForURL('**/member-dashboard');
  check('Developer cannot navigate to admin tools', await developer.getByRole('button', { name: 'Issue invitation' }).count() === 0);
  await developer.screenshot({ path: path.join(reportDirectory, 'developer-assigned-projects.png'), fullPage: true });
  await developer.getByRole('link', { name: 'Playground', exact: true }).click();
  check('Authorized read-only visual editor opens', await visible(developer.getByText('Read-only: developers may inspect assigned projects.', { exact: true })));
  await developer.locator('.react-flow').waitFor();
  check('Visual canvas opens without executing a graph', await developer.locator('.react-flow').count() === 1 && !await developer.getByText('Execution Details:', { exact: true }).isVisible());
  stage = 'M4A visual editor interactions';
  await ensureAdmin();
  await require('./editor-browser-checks.cjs')({ admin, developer, projectId, check, reportDirectory });
  stage = 'M4B graph persistence';
  await login(admin, data.emailA, data.password, 'administrator');
  await require('./graph-browser-checks.cjs')({ admin, developer, projectId, check, reportDirectory,
    refreshDeveloper: () => login(developer, data.devEmail, data.password, 'developer') });
  stage = 'M4B unassigned developer';
  const unassignedEmail = 'browser-unassigned-' + data.run + '@example.test';
  const unassignedCode = await invitation(unassignedEmail);
  const unassignedDeveloper = await context();
  check('Unassigned developer signup succeeds', await signup(unassignedDeveloper, unassignedEmail, unassignedCode) === 200);
  await login(unassignedDeveloper, unassignedEmail, data.password, 'developer');
  await unassignedDeveloper.goto('https://localhost:3000/playground/' + projectId);
  check('Unassigned developer cannot open persisted project', await visible(unassignedDeveloper.getByRole('alert')) &&
    await unassignedDeveloper.locator('.react-flow').count() === 0);
  check('Unassigned developer graph GET concealed 404', (await browserRequest(unassignedDeveloper, 'GET', '/auth/projects/' + projectId + '/graph')).status === 404);
  await developer.goto('https://localhost:3000/playground/718510d8-6f18-48dc-ade1-9f9505c4ac34');
  check('Foreign playground selection rejected', await visible(developer.getByRole('alert')));
  stage = 'own profile update and validation';
  await developer.goto('https://localhost:3000/profile');
  await developer.getByRole('button', { name: 'Edit Profile', exact: true }).click();
  await developer.getByLabel('Full Name', { exact: true }).fill(' ');
  await developer.getByRole('button', { name: 'Save Changes' }).click();
  check('Blank profile validation visible', await visible(developer.getByRole('alert')));
  await developer.getByLabel('Full Name', { exact: true }).fill('Synthetic M3B Developer Updated');
  await developer.getByRole('button', { name: 'Save Changes' }).click();
  check('Profile update visible', await visible(developer.getByText('Profile updated successfully!')));
  await developer.reload();
  check('Profile persists on refresh', await visible(developer.getByText('Synthetic M3B Developer Updated').first()));
  stage = 'browser CSRF role and cross-organization negatives';
  check('Browser missing CSRF rejected 400', (await browserRequest(developer, 'PATCH', '/auth/profile/' + (await developer.evaluate(async () => (await (await fetch('https://localhost:8836/api/auth/me', { credentials: 'include' })).json()).userId)), { name: 'Synthetic M3B forbidden' }, false)).status === 400);
  check('Developer user list denied 403', (await browserRequest(developer, 'GET', '/auth/users')).status === 403);
  check('Developer project creation denied 403', (await browserRequest(developer, 'POST', '/auth/projects', { name: 'Synthetic M3B forbidden' })).status === 403);
  check('Other profile concealed 404', (await browserRequest(developer, 'GET', '/auth/profile/' + data.adminId)).status === 404);
  const other = await context(); await login(other, data.emailB, data.password, 'administrator');
  check('Other organization does not list project', (await browserRequest(other, 'GET', '/auth/projects')).data.length === 0);
  check('Cross-org project delete concealed 404', (await browserRequest(other, 'DELETE', '/auth/projects/' + projectId)).status === 404);
  check('Cross-org project selector denied 403', (await browserRequest(other, 'GET', '/auth/projects?organizationId=' + data.a)).status === 403);
  stage = 'project deletion';
  await ensureAdmin();
  admin.on('dialog', dialog => dialog.accept());
  const unassignedCard = admin.locator('.group').filter({ has: admin.getByRole('heading', { name: 'Synthetic M3B Unassigned', exact: true }) });
  const deletion = admin.waitForResponse(r => new URL(r.url()).pathname.startsWith('/api/auth/projects/') && r.request().method() === 'DELETE');
  await unassignedCard.getByTitle('Delete Project').click();
  check('Admin deletion 200', (await deletion).status() === 200);
  await admin.getByRole('heading', { name: 'Synthetic M3B Unassigned', exact: true }).waitFor({ state: 'detached' });
  stage = 'password change and all-session revocation';
  const secondDev = await context(); await login(secondDev, data.devEmail, data.password, 'developer');
  await developer.goto('https://localhost:3000/profile');
  if (await developer.getByText('Sign in to your account').isVisible()) { await login(developer, data.devEmail, data.password, 'developer'); await developer.goto('https://localhost:3000/profile'); }
  await developer.getByRole('button', { name: 'Security', exact: true }).click();
  await developer.getByLabel('Current Password', { exact: true }).fill(data.newPassword);
  await developer.getByLabel('New Password', { exact: true }).fill(data.newPassword);
  await developer.getByLabel('Confirm New Password', { exact: true }).fill(data.newPassword);
  const wrongPassword = developer.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/change-password' && r.request().method() === 'POST');
  await developer.getByRole('button', { name: 'Update Password', exact: true }).click();
  check('Wrong current password returns 401', (await wrongPassword).status() === 401);
  check('Wrong current password preserves valid UI session', await visible(developer.getByText('Current password is incorrect, or the session ended. Sign in again if necessary.')) && developer.url().endsWith('/profile'));
  await developer.getByLabel('Current Password', { exact: true }).fill(data.password);
  await developer.getByRole('button', { name: 'Update Password', exact: true }).click();
  await developer.waitForURL('**/login');
  check('Password change requires new login', await visible(developer.getByText(/Password changed. All sessions ended/)));
  check('Other browser session revoked 401', (await browserRequest(secondDev, 'GET', '/auth/me')).status === 401);
  await login(developer, data.devEmail, data.newPassword, 'developer');
  stage = 'logout and post-logout rejection';
  await developer.getByTitle('Logout').first().click();
  await developer.waitForURL('**/login');
  check('Post-logout browser request rejected 401', (await browserRequest(developer, 'GET', '/auth/me')).status === 401);
  await developer.goto('https://localhost:3000/profile');
  await developer.waitForURL('**/login');
  check('Post-logout protected refresh redirects', await visible(developer.getByText('Sign in to your account')));
  stage = 'database verification';
  const verified = await fixtureCommand('verify');
  for (const [label, result] of Object.entries(verified)) check('Committed PostgreSQL ' + label, result);
  stage = 'real browser session expiration';
  const expiry = await login(developer, data.devEmail, data.newPassword, 'developer');
  check('Browser expiry test uses one-minute lifetime', Date.parse(expiry) - Date.now() > 0 && Date.parse(expiry) - Date.now() < 75000);
  console.log('Browser workflows reached real one-minute session expiration test.');
  await sleep(Math.max(0, Date.parse(expiry) - Date.now()) + 2000);
  await developer.getByTitle('Refresh Data').click();
  await developer.waitForURL('**/login');
  check('Real expiration clears UI on protected 401', await visible(developer.getByText(/Your session ended/).first()));
  check('No uncaught browser application errors', report.pageErrors === 0);
  report.completed = true;
}
(async () => {
  try { await run(); }
  catch (error) { report.failedStage = stage; report.failureKind = error.name; process.exitCode = 1; }
  finally {
    if (browser) await browser.close().catch(() => {});
    if (fixture) {
      try { const result = await fixtureCommand('cleanup'); Object.assign(report, result); cleanupDone = result.cleaned && result.originalStateRestored; }
      catch { report.cleanupFailed = true; process.exitCode = 1; }
      fixture.stdin.end();
    }
    if (fixture && !cleanupDone) process.exitCode = 1;
    save();
    console.log(JSON.stringify({ completed: report.completed, assertions: Object.keys(report.assertions).length,
      falseAssertions: Object.values(report.assertions).filter(value => !value).length, failedStage: report.failedStage,
      cleaned: report.cleaned, originalStateRestored: report.originalStateRestored, report: path.relative(process.cwd(), path.join(reportDirectory, 'report.json')) }));
  }
})();
