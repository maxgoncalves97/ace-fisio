# Verification log

## ACE branding — 16 October 2026

The interface now follows the supplied reference with lime/leaf/forest greens and
white surfaces. Shared vector artwork supplies the login, desktop navigation,
mobile header, native app/adaptive icons, splash, favicon and PWA icons.
Desktop login/dashboard and 390px phone dashboard were visually inspected; no
horizontal overflow or browser console errors. TypeScript, focused ESLint and
production/local web export passed. All **26 browser workflow cases passed**
(13 desktop, 13 mobile), with no failures or skips; see WORKFLOW_COVERAGE.md.
Native launcher/splash assets require a native rebuild;
real device installation has not been revalidated.

## Complete automated run — 15 October 2026

`npm --prefix frontend run test:all` succeeded:

| Suite | Passed | Failed | Skipped |
| --- | --- | --- | --- |
| Live API / MongoDB | 36 | 0 | 0 |
| Isolated Python | 17 | 0 | 0 |
| Desktop Chrome browser workflows | 13 | 0 | 0 |
| Mobile Chrome emulation workflows | 13 | 0 | 0 |
| Total | 79 | 0 | 0 |

Playwright reported no flaky tests or setup errors, with retries disabled. The
browser portion took about three minutes. TypeScript and focused ESLint for the
new tests and touched payment code passed. Whitespace checks passed.

Browser tests exposed a real payment input bug: `125,50` had been truncated to
`125`. The fix accepts BRL decimal/grouped values without truncation and displays
validation for invalid amounts. PAY-01 now verifies rejection of invalid input,
preserved cents, pending state, manual payment recording and patient visibility.
Weekly recurrence assertions compare calendar dates and preserved local times,
avoiding a false failure caused by interpreting naive dates in UK daylight saving.

Post-run read-only audit: **0 synthetic users, 0 synthetic patients, 0 synthetic
professional services remaining** in the isolated database. Test traces/screenshots
and JSON/JUnit/HTML reports are Git-ignored. WORKFLOW_COVERAGE.md is regenerated
from the actual browser results and explicitly lists partial/missing features and
missing browser coverage. Actual Safari/device installation is still unverified.

Self-review of this testing increment: accuracy 4/5 (Chrome emulation, not real
phones); completeness 4/5 (all requested workflows inventoried, with missing
features and the unautomated patient search UI explicit); clarity 4/5 (test IDs
link evidence to a long original brief); actionability 4/5 (one command, with
Chrome/MongoDB prerequisites); conciseness 4/5 (detailed inventory is kept out of
the final handoff). Average 4.0/5. Next priorities are unfinished tenant/role
boundaries, real Safari/device checks, and the missing product workflows. The
user can verify this assessment from generated results; passing tests do not
imply completion of the whole platform brief.

## Latest database-backed verification

MongoDB DNS/authentication/ping succeeded outside the tool network sandbox. Earlier
DNS failures were caused by sandbox restrictions, not a confirmed computer/network
fault. The configured clinic database was checked by counts only and not modified.

- New local demo API uses separate `ace_fisio_ui_test` database on the same cluster.
- `backend/run_local_tests.py`: **36 passed** (32 legacy API checks plus four real
  MongoDB tests for recurrence/persistence, concurrent overlaps, patient permissions,
  and consent persistence/revocation). Runner requires isolated-demo health marker.
- Occupied-slot regression assertion updated from old HTTP 400 to current HTTP 409;
  cleanup now runs even if the assertion fails.
- Browser: professional demo login, four weekly sessions created through the modal,
  refresh confirmed persisted recurring appointment; patient demo login/dashboard works.
- Local UI build now clears Metro's cached environment substitutions, fixing the
  stale backend URL that caused browser login to show Failed to fetch.
- TypeScript and git diff whitespace checks passed after launcher changes.
- One-command start: `npm --prefix frontend run test:ui`; no .env files changed.

The following section records the earlier state; its database blocker is resolved.

## Earlier checks

- `backend/venv/Scripts/python.exe -m pytest backend/tests/test_scheduling_unit.py -q`:
  17 passed. In-memory interleaved database adapter; no live MongoDB required.
- `node node_modules/typescript/bin/tsc --noEmit`: passed after correcting shared
  Card style typing to React Native StyleProp.
- ESLint across app/src: zero errors; baseline unused-import warnings remain.
- `npm run build:web`: passed; generated export in ignored frontend/dist.
- Chrome at localhost:4173: login rendered on desktop and 390×844 mobile viewport;
  no horizontal overflow or console errors. Manifest pt-BR/standalone/icons verified;
  both PNGs decoded at 192×192 and 512×512. Active service worker confirmed.
- Offline navigation after worker update: neutral Portuguese offline page rendered.
- No real phone installation or authenticated UI journey was completed. Configured
  MongoDB SRV DNS failed; no local MongoDB or Docker executable was available.
- Legacy HTTP regression suite: 32 tests collected, live execution pending local API.

## Self-review (agent-self-evaluation skill)

Current increment is reviewable, with live database/device verification outstanding.

| Axis | Score | Evidence / improvement |
| --- | --- | --- |
| Accuracy | 4 | Automated tests/build pass; real Mongo concurrency remains unverified. |
| Completeness | 3 | Four requested additions are implemented or explicitly staged, but multi-clinic management and the larger platform brief remain incomplete. |
| Clarity | 4 | README separates UI preview, real data, mobile preview and installation; real-device validation still needed. |
| Actionability | 4 | Local preview is running and setup commands are documented; database DNS/setup must be resolved for login. |
| Conciseness | 4 | Final handoff links to detailed docs; setup guide necessarily covers several environments. |

Average: 3.8/5. Highest-impact next work: restore MongoDB connectivity and run full
authenticated journeys; complete tenant/role scoping before multiple clinics; add
replica-set transactions and crash reconciliation. Completeness requires a broader
implementation phase because the attached brief includes untranslated screens,
onboarding, payments and other unimplemented modules. These are explicitly listed
in IMPLEMENTATION_PLAN.md, not marked complete.

Would the user agree? Likely on the observable test results, but a real phone and
working login are still needed to confirm their full experience.
