# Free partner preview on Render

## Current deployment status (16 October 2026)

The free service `srv-db8m230473hc73alum10` has been created at
https://ace-fisio-partner-demo.onrender.com. Its first Linux Docker build passed,
but application startup failed because the Atlas TLS connection was rejected.
The same saved MongoDB connection works from the development computer. Atlas
network access is the likely cause; this has not yet been verified by changing
the access list. The preview is **not yet ready for partner testing**.

Render reports these outbound network ranges for this service:

- `74.220.49.0/24`
- `74.220.57.0/24`

Add those separately to the existing Atlas project's Network Access list, retaining
existing entries. Then run `backend/venv/Scripts/python.exe backend/render_preview.py
--deploy`, wait for a live deployment, and run `backend/venv/Scripts/python.exe
backend/check_remote.py`. These are shared Render ranges, not dedicated IPs.
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
