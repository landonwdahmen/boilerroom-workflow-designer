// Static YAML + project policy validation; this does not execute GitHub Actions.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { isDeepStrictEqual } = require('node:util');
const root = path.resolve(__dirname, '..');
const frontendRequire = createRequire(path.join(root, 'TDS-Frontend-main/package.json'));
const yaml = frontendRequire('yaml'); // Existing locked transitive; no extra installation.
const assert = (value, message) => { if (!value) throw new Error(message); };
const allowed = new Set(["actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1","actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1","actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68"]);
const directory = path.join(root, '.github/workflows');
for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.yml'))) {
  const text = fs.readFileSync(path.join(directory, file), 'utf8');
  const document = yaml.parseDocument(text, { uniqueKeys: true });
  assert(document.errors.length === 0, `${file}: YAML parse/duplicate-key error`);
  const workflow = document.toJS();
  assert(workflow.name && workflow.on && workflow.jobs, `${file}: required workflow fields missing`);
  assert(Object.keys(workflow.on).every(event => ['push', 'pull_request', 'workflow_dispatch'].includes(event)), `${file}: unsafe/unreviewed trigger`);
  assert(JSON.stringify(workflow.permissions) === '{"contents":"read"}', `${file}: permissions must be contents:read only`);
  assert(!/(OneDrive|C:[/\\]|\.env\b|\.local\b|pull_request_target|secrets\.)/i.test(text), `${file}: private/machine-specific workflow dependency`);
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert(job['runs-on'] === 'ubuntu-24.04' && job['timeout-minutes'] > 0 && job['timeout-minutes'] <= 20, `${file}/${jobName}: runner/timeout`);
    assert(Array.isArray(job.steps) && job.steps.length > 0, `${file}/${jobName}: no steps`);
    for (const step of job.steps) {
      assert(Boolean(step.uses) !== Boolean(step.run), `${file}: step must have exactly one of run/uses`);
      if (step.uses) {
        assert(allowed.has(step.uses), `${file}: unreviewed action ${step.uses}`);
        if (step.uses.startsWith('actions/checkout@')) assert(step.with?.['persist-credentials'] === false, `${file}: persisted credentials`);
        if (step.uses.startsWith('actions/setup-node@')) assert(step.with?.['node-version'] === '22.14.0' && step.with?.['package-manager-cache'] === false, `${file}: Node/cache configuration`);
        if (step.uses.startsWith('actions/setup-dotnet@')) assert(step.with?.['global-json-file'] === 'global.json', `${file}: SDK source`);
      } else {
        for (const match of step.run.matchAll(/scripts\/[A-Za-z0-9.-]+\.(?:ps1|cjs)/g)) assert(fs.existsSync(path.join(root, match[0])), `${file}: missing ${match[0]}`);
      }
    }
  }
  console.log(`Static workflow policy passed: ${file}`);
}
const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split(/\r?\n/);
for (const rule of ['.env', '.env.*', '!.env.example', '.local/', '**/node_modules/', '**/bin/', '**/obj/', '**/build/', '**/TestResults/', '*.backup', '*.dump', '*.pem', '*.key', '*.pfx', '*.p12']) assert(ignore.includes(rule), `Missing privacy ignore rule: ${rule}`);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'TDS-Frontend-main/package.json')));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'TDS-Frontend-main/package-lock.json')));
for (const section of ['dependencies', 'devDependencies']) assert(isDeepStrictEqual(manifest[section], lock.packages[''][section]), `Manifest/lock ${section} mismatch`);
for (const [name, item] of Object.entries(lock.packages)) {
  if (!name) continue;
  assert(item.resolved?.startsWith('https://registry.npmjs.org/') && item.integrity, `Unreviewed lock source/integrity at ${name}`);
  if (item.hasInstallScript) assert(name === 'node_modules/fsevents' && item.optional && item.os?.includes('darwin'), `Unreviewed lifecycle hook ${name}`);
}
console.log('Ignore rule presence and approved npm lock/lifecycle policy passed. Full Git matching/history and publication clearance are separate.');
