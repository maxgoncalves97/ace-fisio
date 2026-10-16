# ACE Fisio

**Returning later? Read [START_HERE.md](START_HERE.md)** for the saved free Render
setup, live phone-testing link, account/password locations, local test commands,
and steps to resume development and deployment.

Brand colours and logo assets follow the supplied ACE green-and-white reference.
See [BRANDING.md](BRANDING.md) for the palette and asset regeneration command.

Expo / React Native mobile app with a web/PWA version, backed by FastAPI and
MongoDB. Android, iPhone and browser share the same screens.

## View the UI now

**Fewest steps, including a working database-backed login:** from the repository
root run:

```powershell
npm --prefix frontend run test:ui
```

Leave the terminal open, then visit **http://localhost:4173**. Click a demo account
and **Entrar**. The launcher starts the local API, builds the UI with its local API
URL, and starts/reuses the preview. It uses a separate `ace_fisio_ui_test` database
on the MongoDB server configured in `backend/.env`; existing clinic data is not
changed. It requires the already-installed frontend dependencies and backend venv.
Ctrl+C stops the services the launcher started.

MongoDB connectivity has now been verified outside the agent's network sandbox.
Earlier DNS timeouts were caused by that restriction, not a confirmed local DNS
problem. All 32 live API regression tests passed against the separate test database.

The preview started during development is at **http://localhost:4173**. To restart:

```powershell
cd frontend
npm install
npm run build:web
npm run preview:web
```

Open **http://localhost:4173**. Press F12 and enable the device toolbar to test
iPhone/Android layouts. Login can be viewed without the backend. Signing in and
testing saved data requires the API and MongoDB below.

## Backend and real data

Use Python 3.11 or 3.12 and a reachable MongoDB instance. The existing backend venv
can be used if its dependencies are installed. For a fresh setup:

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create/edit `backend/.env` locally (never commit secrets):

```dotenv
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=ace_fisio_local_demo
JWT_SECRET_KEY=replace-with-a-long-random-local-secret
SEED_DEMO=true
```

MongoDB must be running first. Use an existing reachable MongoDB server, a local
installation, or, if Docker is installed, a disposable local instance:

```powershell
docker run --name ace-fisio-mongo -p 127.0.0.1:27017:27017 -d mongo:7
```

From `backend`, start the API:

```powershell
.\venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000
```

API docs: **http://localhost:8000/docs**. Demo seeding is opt-in and only runs when
users/patients are empty. It no longer deletes collections. Use a dedicated demo
database and set `SEED_DEMO=false` after setup. Existing users/passwords remain.

Create `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

Restart Expo or rebuild the export after changing this URL; it is embedded at build.

| Demo role | Email | Password |
| --- | --- | --- |
| Fisioterapia | fisio@demo.com | Demo123! |
| Pilates | pilates@demo.com | Demo123! |
| Patient | joao@demo.com | Demo123! |

These credentials exist after seeding an empty demo database.

## Test on your phone

Connect phone and computer to the same Wi-Fi. Run `ipconfig` to find the computer's
IPv4 address, for example `192.168.1.20`. Set `frontend/.env.local` to
`EXPO_PUBLIC_BACKEND_URL=http://192.168.1.20:8000`. Keep the API listening on
`0.0.0.0`; allow local-network access if Windows asks.

For the native mobile preview:

```powershell
cd frontend
npm start
```

Use an Expo Go client compatible with SDK 54 and scan the QR code. If your installed
Expo Go no longer supports SDK 54, use a matching development build or the browser
version. Windows cannot run the iOS Simulator; a real iPhone can use the website.

For phone browser testing, rebuild the export with the LAN API URL, run
`npm run preview:web`, then open `http://192.168.1.20:4173` on the phone.

For **PWA installation**, serve `frontend/dist` over HTTPS and use an HTTPS API.
Return `index.html` for app routes; serve `/sw.js`, `/manifest.json`, `/offline.html`
and `/icons/*` as real files. Localhost is a development exception; HTTP over LAN
is for UI testing. Android Chrome offers **Install app / Add to Home screen**.
On iPhone Safari, use **Share → Add to Home Screen**, enabling opening as a web app
when offered. See [Chrome's requirements](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest)
and [Apple's instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

The PWA caches a neutral offline page only; appointments and medical data require
an internet connection. Actual phone installation needs testing on your HTTPS
test host. No production deployment was performed.

## Try the new features

1. Professional: **Configurações → Meus serviços e horários**. Add a service with
   BRL price and duration; save working days/hours.
2. **Agenda → Novo agendamento**. Choose patient, professional, optional priced
   service, date/time, then **Repetição → 4 sessões semanais** and create.
3. Inspect following weeks/months. Any conflicting date rejects the whole series.
   Each session keeps its own attendance/status.
4. Open a recurring appointment to cancel one session or upcoming sessions.
5. Patient João: **Agendar** offers professionals and available times, respecting
   saved hours, occupied slots, service duration and the 12-hour rule.
6. Patient **Notificações**: authorize WhatsApp with `55 + DDD + number`, save and
   reload. Disable and save to revoke consent.

WhatsApp delivery is **not active**. Consent is versioned and timestamped. Provider
credentials, approved templates, background delivery, deduplication, retries and
callbacks remain to be integrated. No messages are sent.

## Checks and limitations

### Automated workflow tests

Run every current test (backend and browser) with one command from the repository:

```powershell
npm --prefix frontend run test:all
```

This builds the local web app, starts/reuses the isolated test API and preview,
runs the 36 live API checks and 21 isolated Python tests, and executes 16 browser
workflows in both desktop Chrome and mobile Chrome emulation (32 browser cases).
It requires Google Chrome installed, `frontend/node_modules`, `backend/venv`, and
the existing reachable MongoDB configuration. No additional browser download or
manual demo login is needed. No API responses are mocked.

For browser tests alone or the interactive result report:

```powershell
npm --prefix frontend run test:e2e
npm --prefix frontend run test:e2e:report
```

[WORKFLOW_COVERAGE.md](WORKFLOW_COVERAGE.md) maps the original requested workflows
to implementation status, test IDs, desktop/mobile results and remaining gaps.
The checklist regenerates after browser runs, even on failure. Missing features
are recorded as missing, rather than represented by skipped passing tests.

Tests use separately named synthetic professionals and patients in
`ace_fisio_ui_test`. Cleanup checks the exact fixture name and ID and never uses
the configured clinic database. The API must return the isolated test marker
before mutation tests are allowed. Failure screenshots/traces and HTML/JSON/JUnit
reports are ignored by Git; do not publish traces containing local test tokens.

Mobile Chrome emulation is a layout/workflow check, not an actual Android or
iPhone installation test. English/Spanish, gateway payments, reminder delivery,
patient self-registration and other unfinished features remain explicit gaps.

```powershell
# repository root: no database/server needed
.\backend\venv\Scripts\python.exe -m pytest backend/tests/test_scheduling_unit.py -q
# frontend
npx tsc --noEmit
npm run lint
npm run build:web
```

The legacy `backend/tests/backend_test.py` suite requires a running seeded API.
Point `EXPO_PUBLIC_BACKEND_URL` to your local API before running it. Use only a
dedicated test database for these mutation tests.

Verified: 17 isolated scheduling/consent tests, 36 live API tests against the
separate demo database, TypeScript, web build, PWA metadata and service-worker
registration. Browser tests confirmed professional login, creation of four weekly
sessions, persistence after refresh, and patient login/dashboard loading. Earlier
DNS timeouts were a tool sandbox restriction; MongoDB connectivity works outside
that restriction. Lint has existing unused-import warnings and no errors.

With the UI launcher running, repeat all live API checks from the repository root:

```powershell
.\backend\venv\Scripts\python.exe backend/run_local_tests.py
```

This runner verifies the isolated demo API marker before allowing mutation tests.

Read [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the broader brief and
remaining work, and [DATABASE.md](DATABASE.md) for clinic/professional structure.
The larger brief is not complete: full translations, role separation, clinic-wide
authorization, real recovery, payments and provider delivery need further work
before use with real patients.
