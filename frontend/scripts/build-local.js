// Pin the local preview to the local API without changing the user's .env files.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--clear'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, EXPO_PUBLIC_BACKEND_URL: 'http://127.0.0.1:8000' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
require('./prepare-pwa');
