const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const python = path.join(root, 'backend/venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const child = spawn(python, [path.join(root, 'backend/run_demo.py')], { cwd: root, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
