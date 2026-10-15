# Free partner preview on Render

The repository includes one Docker web service, explicitly `plan: free` in
`render.yaml`. No paid disk, worker, Render database or paid preview is configured.
MongoDB remains on the existing Atlas cluster, using `ace_fisio_partner_demo`.

## Deploy

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

Deployment files and a successful local build do not mean a public deployment
exists: Render account/repository authorization and a successful hosted build
must still be completed.
