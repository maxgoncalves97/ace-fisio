# ACE Fisioterapia & Pilates

Updated from the user's supplied logo reference on 16 October 2026.

| Role | Colour |
| --- | --- |
| Lime accent / active navigation | `#92C52B` |
| Leaf green / gradient midpoint | `#61933B` |
| Forest green / headings, logo and sidebar | `#173F3E` |
| Primary controls | `#1C5145` |
| Main surfaces | `#FFFFFF` |
| Pale green supporting surfaces | `#F3F8EA`, `#EAF4D7` |

The vector rendition retains the ACE letters, white movement ribbon on the A,
split E, and a green circular badge with diagonal detail. The full wordmark uses
“FISIOTERAPIA & PILATES”; the compact badge omits small lettering for legibility.
The dark-background variant uses white within the wordmark for contrast.

Source of artwork and brand colours: `frontend/src/theme/brand-artwork.js`.
Shared UI colours: `frontend/src/theme/tokens.ts`. React Native/web logo component:
`frontend/src/components/AceLogo.tsx`.

Generated assets are in `frontend/assets/brand/` and `frontend/public/icons/`.
Regenerate them with `npm --prefix frontend run brand:assets`. The PWA build also
regenerates icons from the same vector source, so it cannot restore the old plus
symbol. `frontend/app.json` points to the new native icon, adaptive icon, favicon
and splash artwork. Native launcher/splash changes take effect in a new native
build; the current web preview shows the new branding after refresh.

Safety/status colours remain distinct where they communicate errors or warnings.
Normal body text and primary controls use deep green against white or pale green;
lime is an accent rather than small body text on white.
