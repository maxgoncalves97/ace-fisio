const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflows = JSON.parse(fs.readFileSync(path.join(root, 'tests/workflows.json'), 'utf8'));
const resultPath = path.join(root, 'test-results/results.json');
const report = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : null;
const observed = new Map();
function walk(suite) {
  for (const spec of suite.specs || []) {
    const id = spec.title.split(' ')[0];
    for (const test of spec.tests || []) {
      const result = test.results?.at(-1);
      observed.set(`${id}:${test.projectName}`, result?.status || 'not run');
    }
  }
  for (const child of suite.suites || []) walk(child);
}
for (const suite of report?.suites || []) walk(suite);
function status(ids, project) {
  if (!ids.length) return 'No browser test';
  const results = ids.map(id => observed.get(`${id}:${project}`) || 'not run');
  if (results.every(s => s === 'passed')) return 'Pass (implemented portion)';
  if (results.some(s => ['failed', 'timedOut', 'interrupted'].includes(s))) return 'FAIL';
  if (results.some(s => s === 'skipped')) return 'Skipped — not verified';
  return 'Not run / incomplete run';
}
const stats = report?.stats;
const backend = ['backend-live.xml', 'backend-unit.xml'].flatMap(name => {
  const file = path.join(root, 'test-results', name);
  if (!fs.existsSync(file)) return [];
  const suite = fs.readFileSync(file, 'utf8').match(/<testsuite\b[^>]*>/)?.[0];
  if (!suite) return [];
  const number = key => Number(suite.match(new RegExp(`\\b${key}="(\\d+)"`))?.[1] || 0);
  return [{ name, tests: number('tests'), failures: number('failures'), errors: number('errors'), skipped: number('skipped') }];
});
const lines = [
  '# Workflow coverage', '',
  'Generated from `frontend/tests/workflows.json` and the latest Playwright JSON report.', '',
  stats ? `Latest browser run: **${stats.expected} passed, ${stats.unexpected} failed, ${stats.flaky} flaky, ${stats.skipped} skipped, ${report.errors?.length || 0} setup/run errors**. Started: ${stats.startTime}.` : 'Browser suite has not run yet.', '',
  ...backend.map(suite => `${suite.name}: **${suite.tests - suite.failures - suite.errors - suite.skipped} passed, ${suite.failures + suite.errors} failed/errors, ${suite.skipped} skipped**.`), ...(backend.length ? [''] : []),
  '**Passing tests cover only the implemented portion in each row. They do not make partial or missing requirements complete.**', '',
  '| ID | Requested workflow | Implementation | Desktop Chrome | Mobile Chrome emulation | Test IDs / API or unit evidence | Remaining gap |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];
for (const w of workflows) {
  lines.push(`| ${w.id} | ${w.workflow} | ${w.implementation} | ${status(w.tests, 'desktop-chrome')} | ${status(w.tests, 'mobile-chrome')} | ${[...w.tests, w.api].join('; ')} | ${w.gap} |`);
}
lines.push('', '## How to run', '', '```powershell', '# repository root — build and run both browser projects', 'npm --prefix frontend run test:e2e', '# Open the interactive HTML report', 'npm --prefix frontend run test:e2e:report', '# Refresh this checklist from existing results', 'npm --prefix frontend run test:coverage', '```', '',
  'Tests require Chrome, frontend dependencies and backend/venv. The runner starts/reuses the local isolated demo API and preview. It refuses mutation tests without the isolated database marker. Every mutating test provisions its own synthetic professional/patients and removes exactly those named fixtures afterward. Existing demo/clinic data is preserved. No browser responses are mocked.', '',
  'Failure screenshots, traces, JSON and JUnit results are under ignored `frontend/test-results/`; the HTML report is under ignored `frontend/playwright-report/`. They may contain synthetic test data and local session tokens; do not publish them as production artifacts.', '',
  'Unit/API evidence is a source mapping, not a fresh result from this browser run. Run `backend/run_local_tests.py` and `backend/tests/test_scheduling_unit.py` for current backend results. No missing feature is disguised as a skipped passing test.', '');
fs.writeFileSync(path.join(root, '../WORKFLOW_COVERAGE.md'), lines.join('\n'));
console.log('Updated WORKFLOW_COVERAGE.md from browser results.');
