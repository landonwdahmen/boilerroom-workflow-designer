const { test } = require('node:test');
const assert = require('node:assert/strict');
const policy = require('./npm-audit-exception.json');
const { assess, validateAudit, findCompatibleFix, verifyLocal, textHash } = require('./npm-audit-policy.cjs');
const clone = value => structuredClone(value);
function clean() {
  const r = clone(policy.reviewedAudit);
  r.vulnerabilities = {};
  r.metadata.vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  return r;
}
function command(report, status = report.metadata.vulnerabilities.total ? 1 : 0) { return { status, stdout: JSON.stringify(report), signal: null, error: false }; }
function context() { return { sourceVerified: true, installedVerified: true, workflowVerified: true, upstreamVerified: true, compatibleFixAvailable: false, advisoryUnchanged: true, productionProof: { affectedModules: [], externalModules: [], emittedModuleCount: 218 } }; }
function run(report = clone(policy.reviewedAudit), production = clean(), c = context(), status = 1) { return assess(command(report, status), command(production), policy, c); }
test('exact reviewed disclosure is accepted, unpatched, and not called clean', () => {
  const result = run();
  assert.equal(result.state, 'accepted-development-risk');
  assert.equal(result.vulnerabilities, 5);
  assert.equal(result.unpatched, true);
  assert.equal(result.exceptionUsed, true);
});
test('fully clean audit passes without using the exception', () => assert.equal(assess(command(clean()), command(clean()), policy).exceptionUsed, false));
test('unrelated vulnerability is rejected even with internally consistent new counts', () => {
  const r = clone(policy.reviewedAudit); r.vulnerabilities.unrelated = { ...clone(r.vulnerabilities.minimatch), name: 'unrelated', nodes: ['node_modules/unrelated'] }; r.metadata.vulnerabilities.moderate++; r.metadata.vulnerabilities.total++;
  assert.throws(() => run(r), /Unapproved/);
});
test('approved advisory through an unexpected nested path fails', () => {
  const r = clone(policy.reviewedAudit); r.vulnerabilities.minimatch.nodes.push('node_modules/other/node_modules/minimatch');
  assert.throws(() => run(r), /Unapproved/);
});
test('moving approved path or omitting one affected copy fails', () => {
  const r = clone(policy.reviewedAudit); r.vulnerabilities.minimatch.nodes.pop(); assert.throws(() => run(r), /Unapproved/);
});
test('any production finding fails, including the reviewed advisory', () => assert.throws(() => run(undefined, clone(policy.reviewedAudit)), /Production/));
test('malformed JSON fails closed', () => assert.throws(() => validateAudit({ status: 1, stdout: '{', signal: null }), /not JSON/));
test('missing dependency inventory fails closed', () => { const r = clone(policy.reviewedAudit); delete r.metadata.dependencies; assert.throws(() => run(r), /Missing/); });
test('missing severity counters fails closed', () => { const r = clone(policy.reviewedAudit); delete r.metadata.vulnerabilities.high; assert.throws(() => run(r), /severity/); });
test('inconsistent severity or entry counts fail', () => { const r = clone(policy.reviewedAudit); r.metadata.vulnerabilities.total = 0; assert.throws(() => run(r), /counts/); });
test('registry error in JSON is never accepted', () => { const r = clone(policy.reviewedAudit); r.error = { code: 'ECONNRESET' }; assert.throws(() => run(r), /incomplete/); });
test('command failure other than advisory exit is rejected', () => assert.throws(() => run(undefined, undefined, undefined, 2), /exit status/));
test('exit zero with disclosed vulnerabilities is inconsistent and rejected', () => assert.throws(() => run(undefined, undefined, undefined, 0), /exit status/));
test('timeout or process signal fails even with plausible JSON', () => { const c = command(policy.reviewedAudit); c.signal = 'SIGTERM'; assert.throws(() => assess(c, command(clean()), policy, context()), /did not complete/); });
test('changed underlying advisory ID is rejected', () => { const r = clone(policy.reviewedAudit); r.vulnerabilities.minimatch.via[0].url = 'https://example.invalid/new-advisory'; assert.throws(() => run(r), /Unapproved/); });
test('changed affected version range requires renewed review', () => { const r = clone(policy.reviewedAudit); r.vulnerabilities.minimatch.via[0].range = '*'; assert.throws(() => run(r), /Unapproved/); });
test('source or installed implementation or workflow changes revoke the exception', () => {
  for (const key of ['sourceVerified', 'installedVerified', 'workflowVerified']) { const c = context(); c[key] = false; assert.throws(() => run(undefined, undefined, c), /conditions/); }
});
test('unverified safeguards are not truthy-by-default', () => assert.throws(() => assess(command(policy.reviewedAudit), command(clean()), policy, {}), /conditions/));
test('production module inclusion or unverified external module fails', () => {
  for (const key of ['affectedModules', 'externalModules']) { const c = context(); c.productionProof[key].push('node_modules/minimatch/index.js'); assert.throws(() => run(undefined, undefined, c), /Production bundle/); }
});
test('empty bundle proof cannot establish absence', () => { const c = context(); c.productionProof.emittedModuleCount = 0; assert.throws(() => run(undefined, undefined, c), /Production bundle/); });
test('upstream fetch failure, compatible fix, or changed advisory revokes review', () => {
  for (const [key, value] of [['upstreamVerified', false], ['compatibleFixAvailable', true], ['advisoryUnchanged', false]]) { const c = context(); c[key] = value; assert.throws(() => run(undefined, undefined, c), /Upstream/); }
});
test('duplicate nodes and unknown relationship links fail closed', () => {
  const a = clone(policy.reviewedAudit); a.vulnerabilities.minimatch.nodes.push(a.vulnerabilities.minimatch.nodes[0]); assert.throws(() => run(a), /duplicate/);
  const b = clone(policy.reviewedAudit); b.vulnerabilities.eslint.via.push('not-in-report'); assert.throws(() => run(b), /advisory/);
});
function parents(fix = false) { return [{ name: 'eslint', versions: { '10.13.0': { version: '10.13.0', dependencies: { minimatch: '^10.2.5' } }, '10.14.0': { version: '10.14.0', dependencies: { minimatch: fix ? '^11.0.1' : '^10.2.6' }, engines: { node: '^22.13.0' } } } }, { name: '@eslint/config-array', versions: { '0.23.5': { version: '0.23.5', dependencies: { minimatch: '^10.2.4' } } } }]; }
test('current compatible parent inventory has no supported fix', () => assert.equal(findCompatibleFix(parents(), policy), false));
test('new compatible parent-supported fix expires the exception', () => assert.equal(findCompatibleFix(parents(true), policy), true));
test('incomplete upstream parent metadata fails closed', () => assert.throws(() => findCompatibleFix([{}, {}], policy), /metadata/));
test('missing reviewed source fails local verification, not an implicit exception', () => assert.throws(() => verifyLocal(policy, __dirname), /ENOENT|changed/));
test('full audit cannot silently omit development dependencies', () => { const r = clone(policy.reviewedAudit); r.metadata.dependencies.dev = 0; assert.throws(() => run(r), /omitted/); });
test('production command error is not converted into the development exception', () => assert.throws(() => assess(command(policy.reviewedAudit), command(clean(), 2), policy, context()), /exit status/));
function sourceFixture() {
  const fs = require('node:fs'), path = require('node:path');
  const output = path.join(__dirname, '../.local'); fs.mkdirSync(output, { recursive: true });
  const directory = fs.mkdtempSync(path.join(output, 'policy-source-fixture-'));
  for (const folder of ['Backend', 'TDS-Frontend-main', 'scripts', 'tools', 'tests', '.github/workflows', 'database']) fs.mkdirSync(path.join(directory, folder), { recursive: true });
  fs.writeFileSync(path.join(directory, 'Backend/base.cs'), 'class Example {}\n');
  return { fs, path, directory, p: { ...policy, reviewedFiles: { 'Backend/base.cs': textHash('class Example {}\n') }, historicalExcludedPaths: [] } };
}
test('real source changes revoke review before dependency inspection', () => {
  const { fs, path, directory, p } = sourceFixture(); fs.writeFileSync(path.join(directory, 'Backend/base.cs'), 'class Changed {}\n');
  assert.throws(() => verifyLocal(p, directory), /Reviewed source\/configuration changed/);
});
test('a new controller cannot evade an existing-file fingerprint list', () => {
  const { fs, path, directory, p } = sourceFixture(); fs.writeFileSync(path.join(directory, 'Backend/new-controller.cs'), 'class NewController {}\n');
  assert.throws(() => verifyLocal(p, directory), /inventory changed/);
});
test('a newly added workflow revokes the exception', () => {
  const { fs, path, directory, p } = sourceFixture(); fs.writeFileSync(path.join(directory, '.github/workflows/new.yml'), 'permissions: write-all\n');
  assert.throws(() => verifyLocal(p, directory), /inventory changed/);
});
