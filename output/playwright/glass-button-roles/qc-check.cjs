// Validate saved reports and the final static sources. No service configuration is read.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = relative => JSON.parse(fs.readFileSync(path.join(__dirname, relative), 'utf8'));
const command = args => {
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  return { command: 'node ' + args.join(' '), passed: true };
};
const staticChecks = [command(['node_modules/eslint/bin/eslint.js', '--config', 'scripts/ui-eslint.config.mjs', 'frontend/components/ui/GlassControls.js', 'frontend/app/dev/ui/workspace.js', 'frontend/app/dev/calendar/workspace.js', 'frontend/app/dev/history/workspace.js', 'frontend/app/dev/templates/TemplateEditor.js'])];
for (const file of ['verify-button-roles.cjs','verify-record-glass.cjs','verify-record-history.cjs','verify-calendar-glass.cjs','verify-templates-combo.cjs','verify-ui-zoom.cjs','check-ui-build.mjs']) staticChecks.push(command(['--check', 'scripts/' + file]));
const unit = read('unit-full.json');
assert.equal(unit.numPassedTests, 342);
assert.equal(unit.numFailedTests + unit.numPendingTests + unit.numTodoTests, 0);
const browserAcceptance = {};
for (const browser of ['edge','chrome','public']) {
  const r = read(browser + '/report.json');
  assert.equal(r.completed, true); assert.equal(r.checks.length, 7);
  assert.ok(r.checks.every(x => x.passed)); assert.deepEqual(r.errors, []); assert.deepEqual(r.httpErrors, []);
  assert.equal(r.contrast.length, 96);
  const minimumContrast = Math.min(...r.contrast.map(x => x.ratio)); assert.ok(minimumContrast >= 4.5);
  browserAcceptance[browser] = { passed: 7, total: 7, minimumContrast, contrastSamples: 96, sampledRoutes: r.sampledRoutes, evidence: browser + '/report.json', browserVersion: r.browserVersion };
}
const regression = {};
for (const [name, file, count] of [
  ['record','regression-record/report.json',11],
  ['history','regression-history/chrome/report.json',9],
  ['calendar','regression-calendar/report.json',11],
  ['templates','regression-templates/edge/report.json',7]
]) {
  const r = read(file), cases = r.cases || r.checks;
  assert.equal(r.completed, true); assert.equal(cases.length, count);
  assert.ok(cases.every(x => x.passed === true || x.status === 'passed')); assert.deepEqual(r.errors, []); assert.deepEqual(r.httpErrors || [], []);
  regression[name] = { passed: count, total: count, evidence: file };
}
const zoom = read('zoom-report.json'), build = read('build-report.json');
assert.equal(zoom.completed, true); assert.equal(build.compiled, true);
assert.equal(build.productionOutUntouched, true); assert.equal(build.developmentPreviewRendered, false);
const files = ['frontend/app/quick-liquid-pilot.css','frontend/components/ui/GlassControls.js','frontend/app/dev/ui/workspace.js','frontend/app/dev/calendar/workspace.js','frontend/app/dev/calendar/calendar.css','frontend/app/dev/history/workspace.js','frontend/app/dev/templates/TemplateEditor.js'];
const sourceHashes = Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n')).digest('hex')]));
const summary = {
  date: '2026-11-09', branch: 'codex/glass-button-roles', base: '52dfd61', completedWithinSyntheticScope: true,
  unit: { passed: 342, total: 342, failed: 0, skipped: 0 }, browserAcceptance, regression,
  nativeZoom200: zoom.completed, compatibilityExport: build, staticChecks, sourceHashes,
  preview: 'https://northwest-revised-domains-varies.trycloudflare.com/dev/ui',
  firstPublicAttempt: 'A script chunk returned HTTP 502; the complete rerun passed. No retry suppression was added to the browser tests.',
  coverage: { featurePreviews: 9, newFeatureRoutes: 0, allPagesReady: false },
  productionDataUsed: false, realFirebaseAuthSIT: false, humanUAT: false, realDeviceUAT: false, installedDependencies: false, pushed: false, deployed: false,
  limitations: ['Web implementation using project-owned controls; no claim of native Apple certification', 'Rejection is a style example in the lab; its real business flow is not migrated', 'Physical Safari/iPhone/Android UAT remains pending', 'Contrast evidence bounds the selected CSS tint composition, not every refracted pixel', 'Cloudflare is a temporary development tunnel and had an intermittent 502']
};
fs.writeFileSync(path.join(__dirname, 'qc-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('PASS QC: 342 units, 7 UI groups x 3, 38 regression groups, 96 contrast samples per browser, zoom/build/static checks');
