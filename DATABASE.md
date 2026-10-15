# Clinic and scheduling data model

MongoDB is retained; document references provide relationships.

## Partner testing database

`backend/setup_partner_demo.py` provisions `ace_fisio_partner_demo` on the
existing Atlas cluster using the saved backend connection. It does not copy
clinic data, delete records, or touch `ace_fisio_ui_test`. Partner bookings persist
independently of automated tests. Run with `backend/venv/Scripts/python.exe
backend/setup_partner_demo.py` from the repository root; rerunning preserves data.

The initial synthetic dataset contains two professional logins and one patient
login (`fisio@demo.com`, `pilates@demo.com`, `joao@demo.com`). Their generated
password is stored locally as `PARTNER_TEST_PASSWORD` in ignored
`backend/.env.partner`; it is not the publicly displayed local-demo password.
Do not commit or publish this file.

For the future hosted partner API, set `DB_NAME=ace_fisio_partner_demo`,
`SEED_DEMO=false`, and use the separate `JWT_SECRET_KEY` from `.env.partner`.
Use the existing `MONGO_URL` as a backend-only hosting secret. Do not run the
local test runner on the partner environment. The hosting service must also be
allowed through Atlas network access; this has not yet been configured. This is
database-name separation on the same cluster with the existing credential, not
separate Atlas users or infrastructure. No hosted application is deployed yet.

| Collection | Ownership / key data |
| --- | --- |
| clinics | id, name, timezone (America/Sao_Paulo), currency (BRL) |
| users | id, role, clinic_id; missing clinic_id means default |
| patients | id, clinic_id, optional user_id |
| professional_services | id, clinic_id, professional_id (users.id), name, area, duration_min, integer price_cents, currency |
| professional_availability | professional_id, clinic_id, weekdays (Monday=0), start/end clinic-local time |
| appointments | id, clinic_id, patient_id, professional_id, optional service_id, copied price/duration, series_id, date/time/datetime, individual status |
| calendar_reservations | unique _id = professional_id + local minute, appointment_id, write owner |
| notification_preferences | unique user_id, clinic_id, enabled, phone, consent_version, updated_at |
| consent_audit | application append records for consent changes |

New scheduling APIs enforce clinic ownership. Patient booking professional lists
omit professional emails. A clinic supports arbitrary professional user IDs with
independent calendars, services and prices. Clinic IDs come from the authenticated
user, not a booking request. New patient logins inherit their patient's clinic.

Legacy missing clinic IDs mean `default`; no destructive migration runs. Startup
upserts the default clinic. Recurrence creates 2–52 weekly appointments linked by
UUID. Weekly local wall-clock time is preserved; the patient advance rule uses
the clinic timezone. Legacy naive timestamps remain compatible.

Availability is opt-in for legacy professionals. Saving no weekdays closes the
calendar. Slot display uses half-hour starts from 07:00 to 20:00. Holidays, breaks,
multiple daily shifts, blocked dates and ambiguous/nonexistent DST times remain.

Unique minute reservations prevent concurrent overlapping booking writes across
workers. Every series date is checked before reservations; failed normal writes
roll back documents/reservations. Cancellation releases minutes. Rescheduling
reserves new minutes before compare-and-set against the old timestamp/status.

Before production, move series/reservation changes into MongoDB transactions on
a replica set and implement crash reconciliation: abrupt process termination can
leave orphan reservations or partial series. Concurrency tests use an interleaved
in-memory Mongo-like adapter, not a real multi-worker database deployment.

Multi-clinic support is a **foundation**, not enabled tenant management. Before
provisioning a second clinic, scope all legacy clinical/patient/procedure/payment/
dashboard/export endpoints and separate administrator/professional permissions
with patient assignments. Legacy default roles are preserved. Professional
onboarding/invitations and clinic switching remain to be implemented.
