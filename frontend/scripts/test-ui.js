const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const children = [];
function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  return child;
}
function stop(code = 0) { for (const child of children) child.kill(); process.exit(code); }
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
async function probe(url) {
  try { return await fetch(url, { signal: AbortSignal.timeout(1500) }); } catch { return null; }
}
async function main() {
  let health = await probe('http://127.0.0.1:8000/local-demo-health');
  if (health && (!health.ok || (await health.json()).mode !== 'isolated-ui-test')) {
    throw new Error('Port 8000 is occupied by another API. Stop it before starting the isolated UI test.');
  }
  if (!health) {
    const python = path.join(root, 'backend', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    if (!fs.existsSync(python)) throw new Error('Set up backend/venv first; see README.md.');
    const api = start(python, [path.join(root, 'backend/run_demo.py')], root);
    for (let attempt = 0; attempt < 45; attempt++) {
      if (api.exitCode !== null) throw new Error('The API could not start. Check MongoDB connectivity above.');
      health = await probe('http://127.0.0.1:8000/local-demo-health');
      if (health?.ok) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!health?.ok) throw new Error('The API did not become ready. Check MongoDB connectivity.');
  }
  const build = spawnSync(process.execPath, [path.join(__dirname, 'build-local.js')], { cwd: path.join(root, 'frontend'), stdio: 'inherit', windowsHide: true });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error('UI build failed. See the output above.');
  const preview = await probe('http://localhost:4173/manifest.json');
  if (preview && !preview.ok) throw new Error('Port 4173 is occupied by another server.');
  if (!preview) start(process.execPath, [path.join(__dirname, 'preview-web.js')], path.join(root, 'frontend'));
  console.log('\nReady: http://localhost:4173\nClick Admin Fisioterapia or Paciente, then Entrar.\nUses separate ace_fisio_ui_test database. Leave this terminal open; Ctrl+C stops services started here.');
  // Keep the launcher open even when reusing already-running services.
  setInterval(() => {}, 60000);
}
main().catch(error => { console.error(error.message); stop(1); });
