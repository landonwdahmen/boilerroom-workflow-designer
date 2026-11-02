// One owner-approved development advisory, never a severity filter or audit bypass.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { isDeepStrictEqual } = require('node:util');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const requireFrontend = createRequire(path.join(root, 'TDS-Frontend-main/package.json'));
const semver = requireFrontend('semver'); // Already locked; no added package.
const fail = message => { throw new Error(message); };
const check = (value, message) => { if (!value) fail(message); };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const textHash = value => sha(value.replace(/\r\n/g, '\n'));
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function graph(report) {
  return Object.fromEntries(Object.entries(report.vulnerabilities).sort().map(([name, v]) => [name, {
    severity: v.severity, isDirect: v.isDirect, range: v.range,
    nodes: [...v.nodes].sort(), effects: [...v.effects].sort(),
    via: v.via.map(item => typeof item === 'string' ? item : {
      source: item.source, name: item.name, dependency: item.dependency, title: item.title,
      url: item.url, severity: item.severity, range: item.range,
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  }]));
}
function validateAudit(command, production = false) {
  check(command && !command.error && !command.signal && Number.isInteger(command.status), 'Audit command did not complete');
  let report;
  try { report = typeof command.stdout === 'string' ? JSON.parse(command.stdout) : command.stdout; }
  catch { fail('Audit output is not JSON'); }
  check(report && report.auditReportVersion === 2 && !report.error && !report.errors, 'Unsupported/incomplete audit response');
  const counts = report.metadata?.vulnerabilities;
  check(counts && report.metadata.dependencies && report.vulnerabilities && !Array.isArray(report.vulnerabilities), 'Missing audit inventory');
  for (const key of ['info', 'low', 'moderate', 'high', 'critical', 'total']) check(Number.isInteger(counts[key]) && counts[key] >= 0, 'Invalid severity counts');
  for (const key of ['prod', 'dev', 'optional', 'peer', 'peerOptional', 'total']) check(Number.isInteger(report.metadata.dependencies[key]) && report.metadata.dependencies[key] >= 0, 'Incomplete dependency counts');
  if (!production) check(report.metadata.dependencies.dev > 0, 'Full audit omitted the reviewed development graph');
  const totals = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const [name, v] of Object.entries(report.vulnerabilities)) {
    check(v && v.name === name && Object.hasOwn(totals, v.severity) && typeof v.isDirect === 'boolean' && typeof v.range === 'string', 'Malformed vulnerability entry');
    check(Array.isArray(v.nodes) && v.nodes.length && v.nodes.every(n => typeof n === 'string') && new Set(v.nodes).size === v.nodes.length, 'Missing/duplicate audit nodes');
    check(Array.isArray(v.via) && v.via.length && Array.isArray(v.effects), 'Incomplete advisory relationships');
    for (const via of v.via) check(typeof via === 'string' ? Object.hasOwn(report.vulnerabilities, via) : via && Number.isInteger(via.source) && ['name', 'dependency', 'title', 'url', 'severity', 'range'].every(k => typeof via[k] === 'string'), 'Incomplete advisory');
    totals[v.severity]++;
  }
  check(Object.keys(report.vulnerabilities).length === counts.total && Object.entries(totals).every(([k, n]) => counts[k] === n), 'Audit counts do not match disclosed entries');
  check(command.status === (counts.total ? 1 : 0), 'Unexpected audit exit status');
  if (production) check(counts.total === 0, 'Production dependencies have vulnerabilities; no exception applies');
  return report;
}
function assess(fullCommand, productionCommand, policy, context) {
  const full = validateAudit(fullCommand);
  validateAudit(productionCommand, true);
  if (full.metadata.vulnerabilities.total === 0) return { state: 'clean', vulnerabilities: 0, exceptionUsed: false };
  check(policy?.schema === 1 && policy.ownerApproval === 'M7C.1B conditional acceptance; M7C.2 exact CI implementation', 'No reviewed exception policy');
  check(isDeepStrictEqual(graph(full), graph(policy.reviewedAudit)), 'Unapproved advisory, severity, version range, graph or dependency path');
  check(isDeepStrictEqual(full.metadata.vulnerabilities, policy.reviewedAudit.metadata.vulnerabilities), 'Unapproved vulnerability counts');
  check(context?.sourceVerified === true && context.installedVerified === true && context.workflowVerified === true, 'Exception source/install/workflow conditions changed or unverified');
  check(context.productionProof?.affectedModules?.length === 0 && context.productionProof?.externalModules?.length === 0 && context.productionProof?.emittedModuleCount > 0, 'Production bundle condition unverified/violated');
  check(context.upstreamVerified === true && context.compatibleFixAvailable === false && context.advisoryUnchanged === true, 'Upstream/advisory review expired or incomplete');
  return { state: 'accepted-development-risk', exceptionUsed: true, advisory: policy.advisory, cve: policy.cve, vulnerabilities: full.metadata.vulnerabilities.total, severity: 'moderate', unpatched: true };
}
function verifyLocal(policy, directory = root) {
  const relevant = sourcePaths(directory, policy.historicalExcludedPaths || []);
  check(isDeepStrictEqual(relevant, Object.keys(policy.reviewedFiles).sort()), 'Reviewed source/configuration file inventory changed');
  for (const [file, expected] of Object.entries(policy.reviewedFiles)) {
    check(!path.isAbsolute(file) && !file.split('/').includes('..'), 'Invalid reviewed path');
    check(textHash(fs.readFileSync(path.join(directory, file), 'utf8')) === expected, `Reviewed source/configuration changed: ${file}`);
  }
  const frontend = path.join(directory, 'TDS-Frontend-main');
  const lock = readJSON(path.join(frontend, 'package-lock.json'));
  const actualPaths = Object.keys(lock.packages).filter(p => p.endsWith('/minimatch')).sort();
  check(isDeepStrictEqual(actualPaths, policy.minimatchPaths), 'Unexpected minimatch lock path');
  for (const [node, expected] of Object.entries(policy.installedPackages)) {
    const entry = lock.packages[node];
    const installed = readJSON(path.join(frontend, node, 'package.json'));
    check(entry?.dev === true && entry.version === expected && installed.version === expected, `Non-development/unexpected installed package: ${node}`);
  }
  for (const [file, expected] of Object.entries(policy.installedFiles)) check(textHash(fs.readFileSync(path.join(frontend, file), 'utf8')) === expected, `Reviewed dependency implementation changed: ${file}`);
  const yaml = createRequire(path.join(frontend, 'package.json'))('yaml');
  const actualWorkflows = fs.readdirSync(path.join(directory, '.github/workflows')).filter(f => /\.ya?ml$/.test(f)).map(f => `.github/workflows/${f}`).sort();
  check(isDeepStrictEqual(actualWorkflows, [...policy.workflows].sort()), 'Unexpected workflow added or removed');
  for (const file of policy.workflows) {
    const document = yaml.parseDocument(fs.readFileSync(path.join(directory, file), 'utf8'), { uniqueKeys: true });
    check(document.errors.length === 0, 'Workflow YAML invalid');
    const w = document.toJS();
    check(isDeepStrictEqual(w.permissions, { contents: 'read' }) && isDeepStrictEqual(Object.keys(w.on).sort(), ['pull_request', 'push', 'workflow_dispatch'].sort()), 'Workflow permission/trigger exception expired');
    for (const job of Object.values(w.jobs)) {
      check(!job.permissions && !job.environment && job['runs-on'] === 'ubuntu-24.04' && job['timeout-minutes'] === 15, 'Unreviewed workflow privilege/runner');
      for (const step of job.steps) {
        check(!step.run?.includes('${{') && !JSON.stringify(step).includes('secrets.'), 'Untrusted workflow input/secret');
        if (step.uses?.startsWith('actions/checkout@')) check(step.with?.['persist-credentials'] === false, 'Persisted checkout credential');
      }
    }
  }
  return { sourceVerified: true, installedVerified: true, workflowVerified: true };
}
function sourcePaths(directory, excluded = []) {
  const files = [], skip = new Set(excluded);
  const generated = new Set(['node_modules', 'bin', 'obj', 'build', 'dist', '.local', '.git', 'TestResults']);
  function walk(base) {
    for (const entry of fs.readdirSync(path.join(directory, base), { withFileTypes: true })) {
      const file = base ? `${base}/${entry.name}` : entry.name;
      if (generated.has(entry.name) || skip.has(file)) continue;
      // Historical Bruno metadata is never an application/test input; new C# under
      // those folders is still inventoried because the Web SDK could compile it.
      if ((file.startsWith('Backend/bruno-repo/') || file.startsWith('Backend/tests/')) && file.endsWith('.json')) continue;
      check(!entry.isSymbolicLink(), 'Unreviewed source symlink');
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:cs|csproj|js|jsx|cjs|mjs|json|ps1|ya?ml|sql|css|html|svg)$/.test(file) && file !== 'scripts/npm-audit-exception.json') files.push(file);
    }
  }
  for (const base of ['Backend', 'TDS-Frontend-main', 'scripts', 'tools', 'tests', '.github/workflows', 'database']) walk(base);
  for (const file of ['.gitattributes', '.gitignore', 'global.json', 'compose.yaml', 'compose.tests.yaml']) if (fs.existsSync(path.join(directory, file)) && !files.includes(file)) files.push(file);
  return files.sort();
}
function advisoryEvidence(data) {
  return { id: data.id, aliases: [...(data.aliases || [])].sort(), details: data.details, affected: data.affected };
}
function findCompatibleFix(packuments, policy) {
  check(Array.isArray(packuments) && packuments.length === policy.parents.length, 'Incomplete upstream parent inventory');
  return packuments.some((data, index) => {
    const p = policy.parents[index];
    check(data.name === p.name && data.versions && Object.keys(data.versions).length > 0, 'Invalid upstream parent metadata');
    return Object.entries(data.versions).some(([version, item]) => {
      if (!semver.valid(version) || semver.prerelease(version) || !semver.satisfies(version, p.compatibleRange)) return false;
      check(item.version === version && item.dependencies && typeof item.dependencies.minimatch === 'string', 'Incomplete compatible-parent release metadata');
      if (item.engines?.node && !semver.satisfies(policy.node, item.engines.node)) return false;
      return semver.intersects(item.dependencies.minimatch, policy.fixedRange);
    });
  });
}
async function fetchJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' }, redirect: 'error' });
  check(response.ok, 'Upstream metadata unavailable');
  const text = await response.text();
  check(Buffer.byteLength(text) <= 16 * 1024 * 1024, 'Upstream metadata exceeds bounded size');
  return JSON.parse(text);
}
async function productionProof(directory) {
  const frontend = path.join(directory, 'TDS-Frontend-main');
  const localRequire = createRequire(path.join(frontend, 'package.json'));
  const { build } = await import(pathToFileURL(localRequire.resolve('vite')).href);
  let proof;
  const before = process.cwd();
  process.chdir(frontend);
  try {
    await build({ configFile: path.join(frontend, 'vite.config.mjs'), build: { write: false, emptyOutDir: false }, plugins: [{ name: 'reviewed-audit-module-check', generateBundle(_options, bundle) {
      const ids = [...new Set(Object.values(bundle).filter(c => c.type === 'chunk').flatMap(c => Object.keys(c.modules)))].map(id => id.replaceAll('\\', '/'));
      proof = { emittedModuleCount: ids.length, affectedModules: ids.filter(id => /node_modules\/(?:minimatch|eslint|@eslint\/(?:config-array|js)|@eslint-community\/eslint-utils)\//.test(id)), externalModules: Array.from(this.getModuleIds()).filter(id => this.getModuleInfo(id)?.isExternal) };
    } }] });
  } finally { process.chdir(before); }
  check(proof, 'Production proof missing');
  return proof;
}
function npmAudit(mode, evidence) {
  const command = mode === 'signatures' ? 'npm audit signatures' : `npm audit${mode === 'production' ? ' --omit=dev' : ' --include=dev'}`;
  const args = [...command.split(' ').slice(1), '--json', '--fetch-retries=0', '--fetch-timeout=30000'];
  const options = { cwd: path.join(root, 'TDS-Frontend-main'), encoding: 'utf8', timeout: 90000, maxBuffer: 16 * 1024 * 1024, windowsHide: true };
  const result = process.platform === 'win32' ? spawnSync(process.env.ComSpec, ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], options) : spawnSync('npm', args, options);
  fs.writeFileSync(path.join(evidence, `npm-${mode}.json`), result.stdout || '');
  fs.writeFileSync(path.join(evidence, `npm-${mode}.stderr.log`), result.stderr || '');
  return { status: result.status, stdout: result.stdout, error: Boolean(result.error), signal: result.signal };
}
async function main() {
  const evidence = path.join(root, '.local/dependency-checks');
  fs.mkdirSync(evidence, { recursive: true });
  const policy = readJSON(path.join(__dirname, 'npm-audit-exception.json'));
  // Always run full AND production audits; the exception never replaces the production gate.
  const full = npmAudit('full', evidence), production = npmAudit('production', evidence), signatures = npmAudit('signatures', evidence);
  fs.writeFileSync(path.join(evidence, 'command-status.json'), JSON.stringify({ full: full.status, production: production.status, signatures: signatures.status }));
  let context;
  const fullReport = validateAudit(full);
  validateAudit(production, true);
  if (fullReport.metadata.vulnerabilities.total > 0) {
    context = verifyLocal(policy);
    check(process.versions.node === policy.node, 'Exception Node version changed; review required');
    const [eslint, configArray, advisory] = await Promise.all([fetchJSON('https://registry.npmjs.org/eslint'), fetchJSON('https://registry.npmjs.org/@eslint%2fconfig-array'), fetchJSON(`https://api.osv.dev/v1/vulns/${policy.advisory}`)]);
    context.upstreamVerified = true;
    context.compatibleFixAvailable = findCompatibleFix([eslint, configArray], policy);
    context.advisoryUnchanged = sha(JSON.stringify(advisoryEvidence(advisory))) === policy.advisoryEvidenceSHA256;
    context.productionProof = await productionProof(root);
  }
  const result = assess(full, production, policy, context);
  check(signatures.status === 0 && !signatures.error && !signatures.signal, 'Signature verification command incomplete');
  let signatureReport;
  try { signatureReport = JSON.parse(signatures.stdout); } catch { fail('Signature verification output is not JSON'); }
  check(!signatureReport.error && Array.isArray(signatureReport.invalid) && Array.isArray(signatureReport.missing) && signatureReport.invalid.length === 0 && signatureReport.missing.length === 0, 'Invalid/missing/incomplete signatures');
  fs.writeFileSync(path.join(evidence, 'policy-result.json'), JSON.stringify({ ...result, productionVulnerabilities: 0, invalidSignatures: 0, missingSignatures: 0, context }, null, 2));
  if (result.exceptionUsed) {
    console.log(`DISCLOSED ACCEPTED RISK: ${result.advisory} / ${result.cve}: ${result.vulnerabilities} moderate development package entries remain UNPATCHED. Raw npm full-audit exit was ${full.status}; policy exit is distinct. Production audit zero. Re-review on upstream/config/input changes.`);
    for (const [name, entry] of Object.entries(fullReport.vulnerabilities)) console.log(`  ${name} (${entry.severity}): ${entry.nodes.join(', ')}`);
  }
  else console.log('Full and production audits clean; exception not used.');
  console.log('Dependency audit policy passed; raw audit reports retained privately. This is not remediation or hosted-CI evidence.');
}
module.exports = { graph, validateAudit, assess, verifyLocal, advisoryEvidence, findCompatibleFix, textHash, productionProof, sourcePaths };
if (require.main === module) main().catch(error => { console.error(`Dependency policy FAILED CLOSED: ${error.message}`); process.exitCode = 1; });
