const { spawnSync } = require('node:child_process');
const path = require('node:path');
const cwd = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
const build = run([path.join(__dirname, 'build-local.js')]);
if (build !== 0) process.exit(build);
const result = run([require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)]);
const coverage = run([path.join(__dirname, 'report-coverage.js')]);
process.exit(result || coverage);
