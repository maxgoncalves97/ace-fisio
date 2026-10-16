# Workflow coverage

Generated from `frontend/tests/workflows.json` and the latest Playwright JSON report.

Latest browser run: **32 passed, 0 failed, 0 flaky, 0 skipped, 0 setup/run errors**. Started: 2026-10-16T11:23:34.265Z.

**Passing tests cover only the implemented portion in each row. They do not make partial or missing requirements complete.**

| ID | Requested workflow | Implementation | Desktop Chrome | Mobile Chrome emulation | Test IDs / API or unit evidence | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- |
| W01 | Patient self-registration | Missing | No browser test | No browser test | CARE-01 covers professional-created login only | No public registration flow; do not count staff-created accounts as self-registration. |
| W02 | Login, invalid credentials, session persistence and logout | Implemented | Pass (implemented portion) | Pass (implemented portion) | AUTH-01; TestAuth | Patient mobile logout and real password recovery need separate product work. |
| W03 | Patient completes and updates intake with drafts/uploads | Partial | Pass (implemented portion) | Pass (implemented portion) | CARE-02; test_anamnese_upsert | Tested professional intake entry only. Patient editing, drafts and secure uploads are missing. |
| W04 | Patient books an available appointment | Implemented | Pass (implemented portion) | Pass (implemented portion) | SCHED-01; TestAppointments; test_patient_12_hour_rule | Holidays, blocked dates, breaks and configurable booking policy remain. |
| W05 | Professional views schedule and records confirmation/attendance | Partial | Pass (implemented portion) | Pass (implemented portion) | SCHED-03; test_status_transitions; test_attendance_summary | Daily/weekly/monthly views and status separation tested; attendance audit history remains. |
| W06 | Professional records progress and confidential clinical notes | Partial | Pass (implemented portion) | Pass (implemented portion) | CARE-02; AUTH-02; TestClinicalDocs; test_patient_cannot_read_evolutions | Creation/persistence and patient denial tested. Professional assignments, note editing/history and separate admin rights remain. |
| W07 | Patient views permitted progress | Partial | Pass (implemented portion) | Pass (implemented portion) | CARE-02; Own assessments API checked in CARE-02 | Patient assessment API permission tested; dedicated patient progress/charts UI is missing. |
| W08 | Professional assigns exercise/recommendation; patient views it | Implemented | Pass (implemented portion) | Pass (implemented portion) | CARE-03; test_exercises_flow; test_notes_flow | Media attachments and non-exercise recommendation types are not covered. |
| W09 | Patient completes exercises and tracks adherence | Missing | No browser test | No browser test | No completion endpoint | Viewing assignments is tested separately; completion tracking does not exist. |
| W10 | Administrator reviews appointments and manual payments | Partial | Pass (implemented portion) | Pass (implemented portion) | SCHED-03; PAY-01; test_admin_dashboard; test_payments_flow | Manual payment recording only; administrator/professional permission separation and operational reports remain. |
| W11 | Professional creates patient with login | Implemented | Pass (implemented portion) | Pass (implemented portion) | CARE-01; test_create_update_patient_with_login | Distinct from patient self-registration. |
| W12 | Weekly recurring appointments and upcoming-series cancellation | Implemented | Pass (implemented portion) | Pass (implemented portion) | SCHED-04; test_series_persists_and_cancel_releases_slots; test_weekly_series | Crash-safe transactions/reconciliation and real multi-worker deployment testing remain. |
| W13 | Patient cancels and reschedules appointments | Partial | Pass (implemented portion) | Pass (implemented portion) | SCHED-01; test_reschedule_moves_reservations | Cancellation UI tested. Rescheduling API has isolated tests; patient UI currently offers cancellation only. |
| W14 | Reject bookings under 12 hours or occupied slots | Implemented | Pass (implemented portion) | Pass (implemented portion) | SCHED-02; test_patient_12h_rule_blocks; test_simultaneous_overlaps_with_real_mongodb | Real concurrent requests tested; DST transitions and process-crash recovery are not. |
| W15 | Unauthenticated and patient access restrictions | Partial | Pass (implemented portion) | Pass (implemented portion) | AUTH-01; AUTH-02; TestRBAC; test_patient_cannot_create_series | Patient boundaries covered; unauthorized-professional and complete cross-clinic isolation are unfinished. |
| W16 | Professional services, prices, duration and working hours | Partial | Pass (implemented portion) | Pass (implemented portion) | CONFIG-01; test_service_price_and_duration; test_availability_applies_to_every_occurrence | Own settings tested. Professional onboarding, holidays, split shifts and clinic administration remain. |
| W17 | In-app notifications reach patient and can be marked read | Implemented | Pass (implemented portion) | Pass (implemented portion) | CARE-03; test_notifications_get; test_read_all_notifications | Configurable scheduled reminder worker/email delivery remains. |
| W18 | WhatsApp consent and revocation | Implemented | Pass (implemented portion) | Pass (implemented portion) | NOTIFY-01; test_whatsapp_consent_persists_and_revokes | Consent only; tests explicitly confirm provider setup is required. |
| W19 | Email/WhatsApp reminder delivery, retries and deduplication | Missing | No browser test | No browser test | No delivery worker/provider | Provider credentials, templates, callbacks, localized messages and background processing required. |
| W20 | Online payments, failed payments and duplicate webhooks | Missing | No browser test | No browser test | No gateway/webhook integration | Manual payment tests do not cover financial-provider transactions, Pix, refunds or receipts. |
| W21 | Portuguese, English and Spanish interfaces and locale formatting | Partial | Pass (implemented portion) | Pass (implemented portion) | PWA-01; No localization suite | Portuguese HTML/manifest verified only. English/Spanish translations and selectors are missing. |
| W22 | PWA installation assets, safe offline behavior and mobile layout | Partial | Pass (implemented portion) | Pass (implemented portion) | PWA-01; Not applicable | Chrome desktop/mobile emulation only. Actual Android/iPhone installation and Safari remain untested. |
| W23 | Multiple professionals and clinics with scoped access | Partial | Pass (implemented portion) | Pass (implemented portion) | CONFIG-01; AUTH-02; test_clinic_boundary covers new booking helper | Independent synthetic professionals exercise calendars. Tenant management and all legacy clinic/assignment boundaries remain unfinished. |
| W24 | Password recovery delivers usable reset link | Missing | No browser test | No browser test | Endpoint returns implemented=false | Current UI confirmation does not mean a reset email was sent. |
| W25 | Clinical edit history, reports, privacy/retention and backups | Missing | No browser test | No browser test | No full automation | Separate implementation and production-readiness phase required. |
| W26 | Search and filter existing patients | Implemented | No browser test | No browser test | TestPatients search/filter checks | API coverage exists; a dedicated browser search/filter regression is still missing. |

## How to run

```powershell
# repository root — build and run both browser projects
npm --prefix frontend run test:e2e
# Open the interactive HTML report
npm --prefix frontend run test:e2e:report
# Refresh this checklist from existing results
npm --prefix frontend run test:coverage
```

Tests require Chrome, frontend dependencies and backend/venv. The runner starts/reuses the local isolated demo API and preview. It refuses mutation tests without the isolated database marker. Every mutating test provisions its own synthetic professional/patients and removes exactly those named fixtures afterward. Existing demo/clinic data is preserved. No browser responses are mocked.

Failure screenshots, traces, JSON and JUnit results are under ignored `frontend/test-results/`; the HTML report is under ignored `frontend/playwright-report/`. They may contain synthetic test data and local session tokens; do not publish them as production artifacts.

Unit/API evidence is a source mapping, not a fresh result from this browser run. Run `backend/run_local_tests.py` and `backend/tests/test_scheduling_unit.py` for current backend results. No missing feature is disguised as a skipped passing test.
