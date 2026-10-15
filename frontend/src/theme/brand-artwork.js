// Shared vector artwork for React Native, web and generated launcher icons.
// A clean rendition of the supplied ACE mark, including its white movement ribbon.
const palette = {
  lime: '#92C52B',
  leaf: '#61933B',
  forest: '#173F3E',
  primary: '#1C5145',
  white: '#FFFFFF',
};

function letters(onDark = false) {
  const dark = onDark ? palette.white : palette.forest;
  return `<path fill="${palette.lime}" d="M22 270 112 22H158L252 270H197L135 94 78 270Z"/>
    <path fill="${palette.white}" d="M43 207C90 160 157 167 192 268 139 216 94 190 43 207Z"/>
    <path fill="${dark}" d="M480 63C451 29 415 15 372 15 297 15 247 69 247 146 247 224 297 277 372 277 416 277 452 260 480 226L441 187C422 210 401 222 374 222 332 222 305 192 305 146 305 100 332 70 374 70 402 70 423 82 442 104Z"/>
    <path fill="${palette.lime}" d="M505 22H690V73H558V120H636V168H570L505 204Z"/>
    <path fill="${dark}" d="M505 227 558 198V222H690V270H505Z"/>`;
}

function wordmarkSvg(onDark = false, withTagline = true) {
  const height = withTagline ? 340 : 290;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}">
    ${letters(onDark)}
    ${withTagline ? `<text x="356" y="324" text-anchor="middle" font-family="Arial, sans-serif" font-weight="400" font-size="30" letter-spacing="1" fill="${onDark ? palette.white : palette.forest}">FISIOTERAPIA &amp; PILATES</text>` : ''}
  </svg>`;
}

function iconSvg() {
  const stripes = Array.from({ length: 10 }, (_, i) => {
    const x = -660 + i * 170;
    return `<path d="M${x} 1024  ${x + 1024} 0" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="8"/><path d="M${x + 12} 1024 ${x + 1036} 0" stroke="#173F3E" stroke-opacity="0.10" stroke-width="14"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs><linearGradient id="ace-green" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.lime}"/><stop offset="0.5" stop-color="${palette.leaf}"/><stop offset="1" stop-color="${palette.forest}"/></linearGradient><clipPath id="ace-circle"><circle cx="512" cy="512" r="500"/></clipPath></defs>
    <g clip-path="url(#ace-circle)"><circle cx="512" cy="512" r="500" fill="url(#ace-green)"/>${stripes}</g>
    <g transform="translate(120 342) scale(1.08)">${letters(false)}</g>
  </svg>`;
}

module.exports = { palette, wordmarkSvg, iconSvg };
