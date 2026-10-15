const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!path.extname(pathname)) file = path.join(root, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found. Run npm run build:web first.'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
}).listen(4173, '0.0.0.0', () => console.log('Preview: http://localhost:4173'));
