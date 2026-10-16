# Free partner preview on Render

**Currently suspended intentionally (16 October 2026).** The user requested a
temporary shutdown. Render reports `suspended`; both local web/API servers are
stopped. Database records and configuration were preserved. Atlas has not been
paused; no Atlas administrative credential is available. Free Atlas clusters
cannot be manually paused and auto-pause after 30 days of inactivity.

When asked to resume: `backend/venv/Scripts/python.exe backend/render_preview.py
--resume`. Use `--suspend` for a later temporary shutdown. Check the suspension
state separately from the latest deployment status: an old deployment can still
show `live` while its service is suspended.

## Current deployment status (16 October 2026)

The free service `srv-db8m230473hc73alum10` is live at
https://ace-fisio-partner-demo.onrender.com. Deployment
`dep-db90k4k9v7es73e4r1t0` (source `5002eac`) is live with a centered professional
popup, admin-managed online visibility, per-weekday hours and breaks, and crossed-out
unavailable patient slots. The 21 unit tests, 36 live backend checks and 32 local
desktop/mobile browser checks passed, as did TypeScript and focused lint. The earlier Atlas
connection issue was fixed by adding the network access entries below.
Public HTTPS checks passed for database health, professional/patient
logins and dashboards, deep links, PWA assets, cache headers and rejection of the
local demo password. Four public Chrome browser checks also passed: desktop and
Pixel 7 phone emulation, each with professional and patient login, dashboard
rendering, session persistence after refresh, direct logout and both patient
booking-type choices, centered professional selection, crossed-out unavailable
slots and admin availability controls. Phone layouts had no horizontal
overflow. These are browser emulation checks, not physical iPhone/Android tests.
Partners can now open the link from their phones.

Render reports these outbound network ranges for this service:

- `74.220.49.0/24`
- `74.220.57.0/24`

Those entries are now active in the existing Atlas project's Network Access list.
They are shared Render ranges, not dedicated IPs. For later deployments run
`backend/venv/Scripts/python.exe backend/render_preview.py --deploy`, wait for a
live deployment, then run `backend/venv/Scripts/python.exe backend/check_remote.py`.
Read-only browser login checks: `node frontend/scripts/check-remote-ui.js`.
Use `render_preview.py --network` to retrieve current ranges, `--logs` for
redacted recent logs. Existing Atlas credentials do not grant Atlas administration
access; adding the access-list entries requires the Atlas account owner.

The repository includes one Docker web service, explicitly `plan: free` in
`render.yaml`. No paid disk, worker, Render database or paid preview is configured.
MongoDB remains on the existing Atlas cluster, using `ace_fisio_partner_demo`.

## Deploy

For assisted deployment, create a Render API key in account settings and save it
locally as `RENDER_API_KEY` in ignored `backend/.env.render`. Then the helper
`backend/venv/Scripts/python.exe backend/render_preview.py --create` provisions
only the named free service and supplies existing backend secrets directly to
Render. Without `--create` it reports status only; `--deploy` requests a rebuild
of the matching free preview. It refuses to change unrelated or paid services.
Revoke the temporary API key in Render after assisted setup is complete.

For manual dashboard deployment:

1. Sign in at https://dashboard.render.com and connect this GitHub repository.
2. Create a Blueprint from the branch containing `render.yaml` (or create a Web
   Service with Docker runtime, repository root directory, and the **Free** instance).
3. Supply `MONGO_URL` from the existing local `backend/.env` as a secret. The
   Blueprint generates a JWT signing key; it sets `DB_NAME=ace_fisio_partner_demo`
   and `SEED_DEMO=false`. If using a manual Web Service, set those values and a
   generated JWT signing secret manually. Do not upload any `.env` files to GitHub.
4. If Atlas rejects the connection, add the Render service's outbound IP ranges
   to Atlas Network Access. No cluster or new paid database is required.
5. Deploy, then verify `/healthz`, professional/patient login and phone navigation
   at the generated HTTPS `onrender.com` address before sharing it.

The private test password is in ignored `backend/.env.partner` under
`PARTNER_TEST_PASSWORD`, for `fisio@demo.com`, `pilates@demo.com`, `joao@demo.com`.
Share it privately with partners. Hosted builds hide local demo autofill controls.
Only synthetic test data belongs in this preview.

The free web service sleeps after 15 idle minutes and wakes on the next visit;
the link remains valid and Atlas records persist. Free hosting remains subject to
Render usage limits. Do not select an upgrade or add paid resources.

## Local verification of hosted behavior

From the repository root:

```text
node frontend/scripts/build-hosted.js
backend/venv/Scripts/python.exe backend/check_hosted.py
```

This tests the actual hosted entry point locally against the partner database
without writing test records. Docker itself requires Docker to be installed;
Render builds the Linux image. Local `test:ui`/`test:e2e` rebuild the regular local
preview and continue using `ace_fisio_ui_test`, independently of partner data.

Deployment files and a successful build do not mean the app is ready: database
connectivity, a live Render deployment and public login checks must also pass.
