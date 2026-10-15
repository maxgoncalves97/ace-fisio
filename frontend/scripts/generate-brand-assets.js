/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const sharp = require('sharp');
const { palette, iconSvg, wordmarkSvg } = require('../src/theme/brand-artwork');

async function generateBrandAssets() {
  const assets = path.join(root, 'assets/brand');
  const icons = path.join(root, 'public/icons');
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(icons, { recursive: true });
  const icon = Buffer.from(iconSvg());
  fs.writeFileSync(path.join(assets, 'ace-icon.svg'), icon);
  fs.writeFileSync(path.join(assets, 'ace-wordmark.svg'), wordmarkSvg());
  await Promise.all([
    sharp(icon).resize(1024, 1024).flatten({ background: palette.white }).png().toFile(path.join(assets, 'icon.png')),
    sharp(icon).resize(680, 680).extend({ top: 172, bottom: 172, left: 172, right: 172, background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(assets, 'adaptive-icon.png')),
    sharp(Buffer.from(wordmarkSvg(false, false))).resize(720, 290).png().toFile(path.join(assets, 'splash.png')),
    sharp(icon).resize(64, 64).png().toFile(path.join(assets, 'favicon.png')),
    ...[192, 512].map(size => sharp(icon).resize(size, size).flatten({ background: palette.white }).png().toFile(path.join(icons, `icon-${size}.png`))),
  ]);
  console.log('ACE brand assets generated.');
}

module.exports = generateBrandAssets;
if (require.main === module) generateBrandAssets().catch(error => { console.error(error); process.exitCode = 1; });
