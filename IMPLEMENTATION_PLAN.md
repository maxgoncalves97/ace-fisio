# ACE Fisio implementation plan

## Audit (15 October 2026)
Existing stack: Expo SDK 54 / React Native / Expo Router, TypeScript; FastAPI,
Motor/MongoDB, bcrypt and JWT. Preserve this stack and existing Portuguese UI.
Existing flows: login, patients, intake, private evolutions, assessments/charts,
exercise assignments, manual payments, notifications, day/week/month agenda.

## Current increment
- Weekly recurring sessions with bounded session count, conflict checks for every
  occurrence, series identifiers, individual and future-series cancellation.
- Installable web export with manifest, icons, service worker and offline screen.
  Never cache authenticated API responses or medical records.
- Explicit WhatsApp opt-in/revocation; future provider setup clearly labelled.
- Clinic ownership and professional service/price/calendar data foundations.
- Local browser and phone test instructions and meaningful scheduling tests.

## Issues to fix
Startup seed currently deletes collections; make demo seeding explicit and refuse
nonempty databases. Patient booking can omit a professional, bypassing conflicts.
Booking checks currently race and depend on host timezone. Bound durations.

## Broader brief: remaining phases (not complete)
1. Separate administrator/professional permissions and assigned-patient access;
   complete tenant isolation across every legacy collection and endpoint.
2. Structured pt-BR/en/es translations and persisted locale throughout the UI.
3. Self-registration, real password recovery, patient intake drafts and uploads.
4. Full working-hours, holidays, blocked dates and configurable booking policies.
5. Clinical note edit history, attendance auditing and exercise completion.
6. Receipts, payment-provider sandbox/webhooks and notification worker delivery.
7. Reports, privacy/retention controls, deployment and backup procedures.

## Acceptance and validation
Series contain weekly dates at the same clinic-local time; a conflict anywhere
rejects the request without keeping earlier sessions. Patients cannot create a
series. Calendar reservations prevent simultaneous overlapping writes.
Consent defaults off, can be revoked, and never implies delivery. PWA assets are
served in exported builds; offline navigation shows a neutral page. Verify Python
tests, TypeScript, lint, exported HTML/manifest and browser UI where available.

This increment does not make the entire attached platform brief production-ready.

## Result of current increment
Implemented weekly series and future cancellation in the agenda, professional
service prices/durations and weekday hours in settings, patient professional and
available-slot selection, WhatsApp consent/revocation, and installable web export.
New bookings reserve unique professional/minute keys. Startup demo seeding no
longer deletes collections and is opt-in. Existing Card style typing was fixed.

Validation: 17 isolated Python tests passed; TypeScript passed; lint had no errors
and existing unused-import warnings; production web export passed. Chrome verified
manifest/icon dimensions, active service worker, phone-width login without overflow,
and neutral offline fallback after network loss. These are browser-emulation checks,
not real Android/iPhone installation tests.

Database-backed end-to-end tests remain blocked by MongoDB SRV DNS resolution in
this environment, with no local MongoDB/Docker available. The legacy HTTP suite
was collected (32 tests) but not executed against a live server. Its default target
is now localhost, and the patient booking test selects a professional.

See README.md for exact local/phone setup and DATABASE.md for crash consistency,
availability and tenant-isolation limitations. Real WhatsApp delivery is not active.

## Database blocker resolved and UI test launcher
Later checks outside the network sandbox verified MongoDB connectivity. Original
database counts were read without changing data; an isolated `ace_fisio_ui_test`
database now supports local testing. All 36 live API regression checks pass,
including actual concurrent MongoDB bookings and recurring persistence. Browser
professional login, recurring-session creation, refresh persistence and patient
login/dashboard have been verified. One command starts API/build/preview:
`npm --prefix frontend run test:ui`. Backend URLs are overridden for that build
without editing environment files, and Metro cache is cleared to prevent stale URLs.

## Repeatable browser coverage increment
- Added Playwright Test, desktop Chrome and mobile Chrome projects, isolated
  professional/patient fixtures with targeted cleanup, and failure traces/screenshots.
- Added tests for auth/role guards, professional-created patient accounts, intake,
  private clinical records, assessment persistence, exercises/public recommendations,
  notifications, patient booking/cancellation, stale-slot rejection, attendance,
  recurring series, professional prices/hours, manual payments, consent and PWA.
- Added a generated workflow checklist: WORKFLOW_COVERAGE.md, sourced from
  frontend/tests/workflows.json and the latest actual browser results.
- Added one-command `npm --prefix frontend run test:all` for API, unit and browser
  checks together. Missing features remain in the checklist, not skipped tests.
- Browser tests exposed loss of cents when entering BRL amounts with commas.
  Payment entry now parses decimal/grouped BRL values and rejects invalid input.

Final current run: **79 passed, 0 failed** (36 live API, 17 unit, 13 desktop and
13 mobile browser cases). No browser skips/retries/flakiness. Post-run fixture
audit found zero remaining synthetic users, patients or services. TypeScript,
focused ESLint and whitespace checks passed. The checklist distinguishes missing
browser coverage from unfinished product features; neither is marked complete.

## ACE branding — 16 October 2026
Applied the supplied reference's lime, leaf and forest greens with white surfaces.
Replaced placeholder plus logos with a shared vector ACE rendition on login,
desktop navigation and mobile headers. Generated matching native launcher,
adaptive, splash, favicon and PWA assets from the same source. PWA offline cache
version advanced to refresh the matching offline page. See BRANDING.md.
