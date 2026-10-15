import { request } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup() {
  const api = await request.newContext();
  try {
    const response = await api.get('http://127.0.0.1:8000/local-demo-health');
    if (!response.ok() || (await response.json()).mode !== 'isolated-ui-test') {
      throw new Error('Refusing browser mutation tests: the API must use the isolated ace_fisio_ui_test database.');
    }
    const manifest = await api.get('http://localhost:4173/manifest.json');
    if (!manifest.ok()) throw new Error('Build the local PWA first with npm run build:local.');
    if (process.env.E2E_BACKEND_CHECKS === '1') {
      const root = path.resolve(__dirname, '../..');
      const python = path.join(root, '../backend/venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
      const repo = path.resolve(root, '..');
      execFileSync(python, [path.join(repo, 'backend/run_local_tests.py'), `--junitxml=${path.join(root, 'test-results/backend-live.xml')}`], { cwd: repo, stdio: 'inherit', windowsHide: true });
      execFileSync(python, ['-m', 'pytest', 'backend/tests/test_scheduling_unit.py', '-q', '-p', 'no:cacheprovider', `--junitxml=${path.join(root, 'test-results/backend-unit.xml')}`], { cwd: repo, stdio: 'inherit', windowsHide: true });
    }
  } finally { await api.dispose(); }
}
