// Verify saved evidence rather than inferring acceptance from screenshots.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = relative => JSON.parse(fs.readFileSync(path.join(__dirname, relative), 'utf8'));
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, (result.stdout || '') + (result.stderr || ''));
  return { command: 'node ' + args.join(' '), passed: true };
};
const staticChecks = [run(['node_modules/eslint/bin/eslint.js', '--config', 'scripts/ui-eslint.config.mjs', 'frontend/app/dev/templates', 'frontend/app/dev/record/workspace.js', 'frontend/app/dev/record/store.js', 'frontend/app/dev/record/templateFixtures.js', 'frontend/app/dev/history/workspace.js', 'frontend/app/dev/resources/workspace.js', 'frontend/lib/templatePreview.js', 'frontend/lib/templatePayload.js', 'frontend/lib/previewLedger.js', 'frontend/lib/equipmentPreview.js', 'frontend/lib/previewNavigation.js'])];
for (const file of ['verify-templates-combo.cjs', 'verify-template-pagination.cjs', 'verify-ui-zoom.cjs', 'verify-record-glass.cjs', 'verify-assessment-summary.cjs', 'check-ui-build.mjs', 'ui-eslint.config.mjs']) staticChecks.push(run(['--check', 'scripts/' + file]));
for (const proof of read('format-proof.json')) {
  assert.equal(proof.ASTEquivalent, true);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, proof.file), 'utf8').replace(/\r\n/g, '\n')).digest('hex'), proof.sha256);
}
const unit = read('unit-full.json');
assert.equal(unit.numPassedTests, 342);
assert.equal(unit.numFailedTests + unit.numPendingTests + unit.numTodoTests, 0);
const acceptance = {};
const pagination = {};
for (const browser of ['edge', 'chrome', 'public']) {
  const report = read(browser + '/final/report.json');
  assert.equal(report.completed, true);
  assert.equal(report.cases.length, 7);
  assert.ok(report.cases.every(item => item.passed));
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.httpErrors, []);
  acceptance[browser] = { passed: 7, total: 7, evidence: browser + '/final/report.json', browserVersion: report.browserVersion };
  const pages = read(browser + '/pagination-report.json');
  assert.equal(pages.passed, true);
  assert.equal(pages.clampedAfterDeactivation, true);
  pagination[browser] = { passed: true, evidence: browser + '/pagination-report.json' };
}
const record = read('regression-record/report.json');
assert.equal(record.completed, true);
assert.equal(record.checks.length, 11);
assert.ok(record.checks.every(item => item.status === 'passed'));
assert.deepEqual(record.errors, []);
const assessment = read('regression-assessment/chrome/report.json');
assert.equal(assessment.completed, true);
assert.equal(assessment.cases.length, 10);
assert.ok(assessment.cases.every(item => item.passed));
assert.deepEqual(assessment.errors, []);
assert.deepEqual(assessment.httpErrors, []);
const build = read('build-report.json'), zoom = read('zoom-report.json');
assert.equal(build.compiled, true);
assert.equal(build.productionOutUntouched, true);
assert.equal(build.developmentPreviewRendered, false);
assert.equal(zoom.completed, true);
const summary = {
  phase: 'Templates and Combo shared with Quick Log',
  branch: 'codex/templates-combo-flow',
  date: '2026-11-09',
  completedWithinSyntheticScope: true,
  unit: { passed: 342, total: 342, skipped: 0, failed: 0, evidence: 'unit-full.json' },
  acceptance, pagination,
  regression: { record: { passed: 11, total: 11, browser: 'Edge' }, assessment: { passed: 10, total: 10, browser: 'Chrome' } },
  nativeZoom200: zoom.completed, compatibilityExport: build, staticChecks,
  localWidths: [375, 390, 430, 768, 900, 901, 1440], publicWidths: [390, 1440], themes: ['light', 'dark'],
  coverage: { nextPageRoutes: 34, developmentRoutes: 10, featurePreviews: 9, featureMenuDestinations: '9/18', allPagesReady: false },
  preview: 'https://northwest-revised-domains-varies.trycloudflare.com/dev/templates',
  initialPublicAttempt: 'Failed on a 502 script chunk; full rerun passed without retry suppression.',
  productionDataUsed: false, realFirebaseAuthSIT: false, realDeviceUAT: false, humanUAT: false, installedDependencies: false, pushed: false, deployed: false,
  limitations: ['Synthetic in-memory ledger resets on refresh', 'Real active/inactive Firestore query and authorization are not integrated', 'Chromium touch emulation does not replace physical Safari/iPhone/Android/scanner UAT', 'Only the latest shared ledger transaction can be undone']
};
fs.writeFileSync(path.join(__dirname, 'qc-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('PASS QC evidence: unit 342, UI 7 x 3, pagination x 3, regressions 11 + 10, zoom, build and static checks');
