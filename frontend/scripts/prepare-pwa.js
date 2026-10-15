/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const generateBrandAssets = require('./generate-brand-assets');
const { palette } = require('../src/theme/brand-artwork');
const root = path.join(__dirname, '..');

module.exports = (async () => {
  await generateBrandAssets();
  const target = path.join(root, 'dist');
  fs.cpSync(path.join(root, 'public/icons'), path.join(target, 'icons'), { recursive: true });
  // Single-output Expo builds use generated HTML instead of +html.tsx.
  const index = path.join(target, 'index.html');
  let html = fs.readFileSync(index, 'utf8').replace(/<html[^>]*>/, '<html lang="pt-BR">');
  if (!html.includes('rel="manifest"')) html = html.replace('</head>', '<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icons/icon-192.png"><meta name="theme-color" content="' + palette.forest + '"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="ACE Fisio"></head>');
  fs.writeFileSync(index, html);
  console.log('ACE PWA branding and installation assets ready.');
})().catch(error => { console.error(error); process.exitCode = 1; });
