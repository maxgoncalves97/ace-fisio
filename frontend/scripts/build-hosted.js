// Same build flags used by Docker; never bake local env files into the public PWA.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--clear'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_BACKEND_URL: '', EXPO_PUBLIC_HIDE_DEMO_ACCOUNTS: 'true' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
require('./prepare-pwa');
