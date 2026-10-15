# Resume ACE Fisio and test it

Saved on 16 October 2026. This is the handoff for the existing setup; you do not
need to recreate hosting or the databases after logging off.

## Test on a phone (no installation required)

1. Open **https://ace-fisio-partner-demo.onrender.com** in Safari, Chrome or
   another phone browser. This is the same link to send to partners in Brazil.
2. If the first visit is slow, allow about a minute for free Render hosting to
   wake up. The service sleeps after 15 minutes without traffic; the URL and
   database records remain. Your computer can be switched off.
3. Choose a role and enter its email:

   | Role | Email |
   | --- | --- |
   | Physiotherapy professional | `fisio@demo.com` |
   | Pilates professional | `pilates@demo.com` |
   | Patient | `joao@demo.com` |

4. On this computer, open `backend/.env.partner` in your editor. Copy only the
   value of `PARTNER_TEST_PASSWORD`, without the surrounding quotes, into the
   password field. All three initial accounts use that generated password.
   Share the password privately with your partners. The local password
   `Demo123!` does **not** work on the hosted site.
5. Optionally install the PWA: on iPhone use Safari's Share menu → Add to Home
   Screen; on Android use the browser's Install app / Add to Home screen option.
   No Expo Go, app-store account or native app download is needed.

Use synthetic information during this trial. Changes to this partner database
persist and are shared between testers; another tester may see or edit them.

## Suggested manual walkthrough

1. As a professional, open the dashboard, patients and calendar. Open a demo
   patient's record and review intake, assessments, progress notes and exercises.
2. Create a clearly named test patient, such as `TEST - your name`, to keep new
   test records recognisable. Try a single appointment, rescheduling, attendance
   and a recurring weekly series. Check that all expected sessions appear.
3. Review professional settings, services/prices and availability. These changes
   affect other testers, so coordinate changes to the shared demo professionals.
4. In a separate browser/private window, sign in as `joao@demo.com`. Try booking
   an available future appointment, then review history, exercises, payments and
   notifications. Booking requires at least 12 hours' notice using São Paulo
   clinic time; choose a later date if necessary.
5. Refresh a page and verify the session remains signed in. Log out and try
   another role. Check the layout on both your phone and computer.

WhatsApp currently supports consent/preferences only; no real WhatsApp messages
are sent. Payments are manually recorded; no payment gateway charges are made.
For implementation gaps and which workflows are automated, read
[WORKFLOW_COVERAGE.md](WORKFLOW_COVERAGE.md).

## Exact hosting and database setup

| Item | Saved configuration |
| --- | --- |
| Local repository | `D:\GitHub_Projects\ace-fisio` |
| GitHub | https://github.com/maxgoncalves97/ace-fisio |
| Working/deployment branch | `deploy/free-render-partner-demo` |
| Render service | `ace-fisio-partner-demo` / `srv-db8m230473hc73alum10` |
| Hosting | One **free** Docker web service, Virginia; PWA and FastAPI on the same HTTPS origin |
| Hosting configuration | `Dockerfile`, `.dockerignore`, `render.yaml`, `backend/hosted.py` |
| Automatic deployment | Off; pushing code does not automatically update the public app |
| Last verified live deployment | `dep-db8m51jl550s73eh3p3g`, source commit `41a4c3a` |
| Partner database | `ace_fisio_partner_demo` on the existing MongoDB Atlas cluster |
| Automated/local UI test database | `ace_fisio_ui_test` on that cluster |
| Original configured database | Preserved; not used for partner testing |
| Hosted environment | `DB_NAME=ace_fisio_partner_demo`, `SEED_DEMO=false`, private `MONGO_URL` and partner `JWT_SECRET_KEY` |
| Atlas allowed Render ranges | `74.220.49.0/24` and `74.220.57.0/24`; existing entries retained |

No paid Render resources, paid disk, separate paid database or native app-store
deployment were enabled. The Render service uses shared outbound network ranges.
Database-name separation uses the existing Atlas credential, not separate Atlas
users or clusters. This is a demo environment with documented product gaps.

## Where private configuration is saved

These files remain local and are ignored by Git. Their secret values are
deliberately absent from this guide and GitHub.

- `backend/.env`: existing MongoDB connection and original backend settings.
- `backend/.env.partner`: partner database name, generated partner password and
  separate signing key. Render already has its required backend secrets.
- `backend/.env.render`: Render API key used by the deployment helper.

Logging off does not delete these files. A fresh clone on another computer will
not contain them; retain them in a secure private backup/password manager if
moving computers. Revoking the Render API key does not stop the running site,
but assisted deployment commands then need a replacement key. Do not publish
these files or paste their contents into chat.

## Local UI testing on this computer

### Logging off or shutting down

You can close the editor/browser and log off or shut down your computer. Render
and Atlas run remotely; the public testing site does not depend on local
terminals. You can stop a local test launcher with **Ctrl+C** in its terminal, or
log off and restart it next time. Do not stop the Render service or pause/delete
the Atlas cluster if partners still need access. No paid service needs cancelling.

From a terminal in `D:\GitHub_Projects\ace-fisio`:

```text
npm --prefix frontend run test:ui
```

Open **http://localhost:4173** and leave that terminal running while testing.
This starts/reuses the demo API and builds the local preview. Unlike the hosted
site, the local preview uses the visible demo accounts and password `Demo123!`.
It uses `ace_fisio_ui_test`, independently of partner records. After logging off,
run the same command again to restart local services.

## Automated checks

Run from the same repository directory:

```text
npm --prefix frontend run test:all
```

This runs the local suite: 17 scheduling unit tests, 36 live backend checks and
26 desktop/mobile browser checks (79 total). That full suite previously passed;
it was not rerun against the hosted partner database. It creates synthetic test
fixtures in the separate local test database. Backend checks need Atlas access
and the browser checks use installed Google Chrome through Playwright.

For browser tests only and their report:

```text
npm --prefix frontend run test:e2e
npm --prefix frontend run test:e2e:report
```

Read-only checks of the current public site:

```text
backend\venv\Scripts\python.exe backend\check_remote.py
node frontend\scripts\check-remote-ui.js
```

On 16 October 2026, both public checks passed: database health, professional and
patient login/dashboard APIs, deep links, PWA files, plus four browser cases
(desktop/Pixel 7 emulation × professional/patient) including session persistence
after refresh. Phone layouts had no horizontal overflow. Actual physical-phone
and iPhone Safari testing is still for you and your partners to perform.

## Deploy later changes without changing this setup

1. Continue on `deploy/free-render-partner-demo`; edit, verify, commit and push
   intended changes to that branch. Do not publish private `.env` files.
2. With the saved Render API key available, run:

   ```text
   backend\venv\Scripts\python.exe backend\render_preview.py --deploy
   ```

3. Check status until the latest deployment says `live`:

   ```text
   backend\venv\Scripts\python.exe backend\render_preview.py
   ```

4. Run the two read-only public checks above, then refresh the phone browser.

For diagnostics use `render_preview.py --logs` or `--network`. If MongoDB works
locally but fails only from Render, compare the current outbound ranges with
Atlas Network Access. Render's key cannot administer Atlas. You can access both
dashboards in Opera GX; the automated Chrome Google sign-in was rejected, which
is why deployment uses the locally saved Render API key.

Do not create another Render service or reseed/reset the partner database just
to resume testing. Additional hosting details are in
[RENDER_SETUP.md](RENDER_SETUP.md), the data model in [DATABASE.md](DATABASE.md),
and broader verification history in [VERIFICATION.md](VERIFICATION.md).

## Resume with the assistant

Say: **"Read START_HERE.md and continue with the existing free Render partner
preview. Keep the current hosting and databases."**

The source, deployment scripts and this guide are committed to the deployment
branch on GitHub. Secrets remain only in local ignored files and Render's private
backend settings.
