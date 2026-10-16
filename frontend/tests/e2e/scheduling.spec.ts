import { APIRequestContext, Page } from '@playwright/test';
import { test, expect, API, login, nav, select, ymd } from './fixtures';

async function availableDay(clinic: {admin: APIRequestContext; professionalId: string}, start = 7) {
  for (let i = start; i < start + 7; i++) {
    const date = ymd(i);
    const response = await clinic.admin.get(API + `/booking/slots?professional_id=${clinic.professionalId}&date=${date}`);
    expect(response.ok()).toBeTruthy();
    const slots: string[] = await response.json();
    if (slots.length) return { date, time: slots[slots.length - 1] };
  }
  throw new Error('Demo professional has no available days in the next test week.');
}

async function agendaDay(page: Page, date: string) {
  await page.getByTestId('view-mes').click();
  const target = new Date(date + 'T12:00:00');
  const today = new Date();
  const months = (target.getFullYear() - today.getFullYear()) * 12 + target.getMonth() - today.getMonth();
  for (let i = 0; i < months; i++) await page.getByTestId('agenda-next').click();
  await page.getByTestId(`month-day-${date}`).click();
}

async function bookThroughPatientUI(page: Page, patient: {email: string}, professionalId: string, plan: {date: string; time: string}, confirm = true) {
  await login(page, patient.email);
  await nav(page, 'booking');
  await page.getByTestId('book-area-fisio').click();
  await page.getByTestId('book-type-next').click();
  await page.locator('[data-testid^="book-proc-"]').first().click();
  await select(page, 'book-professional', professionalId);
  await page.getByTestId('step1-next').click();
  await page.getByTestId(`book-date-${plan.date}`).click();
  await page.getByTestId(`book-time-${plan.time}`).click();
  await page.getByTestId('step2-next').click();
  if (!confirm) return;
  const response = page.waitForResponse(r => r.url() === API + '/appointments' && r.request().method() === 'POST');
  await page.getByTestId('confirm-booking').click();
  const saved = await response;
  expect(saved.ok()).toBeTruthy();
  const appointment = await saved.json();
  await expect(page.getByTestId('booking-success')).toBeVisible();
  return appointment;
}

test('SCHED-01 patient books available slot, persists in both roles and cancels', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  const plan = await availableDay(clinic);
  const appointment = await bookThroughPatientUI(page, patient, clinic.professionalId, plan);
  await page.getByTestId('goto-history').click();
  await page.reload();
  await expect(page.getByTestId(`cancel-${appointment.id}`)).toBeVisible();
  const adminList = await (await clinic.admin.get(API + `/appointments?patient_id=${patient.id}`)).json();
  expect(adminList.some((a: {id: string}) => a.id === appointment.id)).toBeTruthy();
  await page.getByTestId(`cancel-${appointment.id}`).click();
  const cancelled = page.waitForResponse(r => r.url().endsWith(`/appointments/${appointment.id}`) && r.request().method() === 'DELETE');
  await page.getByTestId('cancel-confirm').click();
  expect((await cancelled).ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId(`cancel-${appointment.id}`)).toHaveCount(0);
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible();
});

test('SCHED-05 booking asks for type first and filters services when switching areas', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  const services: Record<string, {id: string; name: string}> = {};
  for (const area of ['fisio', 'pilates']) {
    const response = await clinic.admin.post(API + '/professional-services', { data: {
      name: `E2E-${clinic.unique}-${area}`, area, duration_min: 45, price_cents: area === 'fisio' ? 12500 : 8000,
    } });
    expect(response.ok()).toBeTruthy();
    services[area] = await response.json(); clinic.trackService(services[area]);
  }
  await login(page, patient.email);
  await nav(page, 'booking');
  await expect(page.getByText('O que você deseja agendar?')).toBeVisible();
  await expect(page.locator('[data-testid^="book-proc-"]')).toHaveCount(0);
  for (const area of ['fisio', 'pilates']) {
    await page.getByTestId(`book-area-${area}`).click();
    await page.getByTestId('book-type-next').click();
    await expect(page.getByTestId('book-professional')).toContainText('Selecione o profissional');
    const procedures = await (await clinic.admin.get(API + '/procedures')).json();
    for (const procedure of procedures) {
      await expect(page.getByTestId(`book-proc-${procedure.id}`)).toHaveCount(procedure.area === area || procedure.area === 'ambos' ? 1 : 0);
    }
    await select(page, 'book-professional', clinic.professionalId);
    await page.getByTestId('book-service').click();
    await expect(page.getByTestId(`book-service-option-${services[area].id}`)).toBeVisible();
    await expect(page.getByTestId(`book-service-option-${services[area === 'fisio' ? 'pilates' : 'fisio'].id}`)).toHaveCount(0);
    await page.getByTestId(`book-service-option-${services[area].id}`).click();
    await expect(page.getByTestId('book-service')).toContainText(services[area].name);
    if (area === 'fisio') await page.getByTestId('book-service-back').click();
  }
});

test('SCHED-06 admin Friday hours and breaks govern crossed-out slots and professional visibility', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  await login(page, clinic.professionalEmail);
  await nav(page, 'settings');
  await page.getByTestId('availability-day-4-end-0').fill('12:00');
  await page.getByTestId('availability-day-4-add').click();
  await page.getByTestId('availability-day-4-end-1').fill('15:00');
  const save = page.waitForResponse(r => r.url() === API + '/professional-availability' && r.request().method() === 'PUT');
  await page.getByTestId('save-availability').click();
  const saved = await save; expect(saved.ok()).toBeTruthy();
  const schedule = await saved.json();
  await page.reload();
  await expect(page.getByTestId('availability-day-4-end-1')).toHaveValue('15:00');
  await page.getByTestId((page.viewportSize()?.width || 0) >= 900 ? 'sidebar-logout' : 'header-logout').click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, patient.email);
  await nav(page, 'booking');
  await page.getByTestId('book-area-fisio').click();
  await page.getByTestId('book-type-next').click();
  await page.locator('[data-testid^="book-proc-"]').first().click();
  await page.getByTestId('book-professional').click();
  const panel = await page.getByTestId('book-professional-modal-title').locator('..').locator('..').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel!.y).toBeGreaterThan(0);
  expect(panel!.y + panel!.height).toBeLessThan(page.viewportSize()!.height);
  await page.getByTestId(`book-professional-option-${clinic.professionalId}`).click();
  await page.getByTestId('step1-next').click();
  let offset = 7;
  while (new Date(ymd(offset) + 'T12:00:00').getDay() !== 5) offset++;
  const date = ymd(offset);
  await page.getByTestId(`book-date-${date}`).click();
  await expect(page.getByTestId('book-time-14:00')).not.toHaveAttribute('aria-disabled', 'true');
  for (const time of ['12:00', '14:30', '15:00']) {
    await expect(page.getByTestId(`book-time-${time}`)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId(`book-time-${time}`).getByText(time, { exact: true })).toHaveCSS('text-decoration-line', 'line-through');
  }
  const hidden = await clinic.admin.put(API + '/professional-availability', { data: { ...schedule, booking_enabled: false } });
  expect(hidden.ok()).toBeTruthy();
  const patientApi = await clinic.patientApi(patient);
  const bypass = await patientApi.post(API + '/appointments', { data: { patient_id: patient.id, professional_id: clinic.professionalId, date, time: '14:00' } });
  expect(bypass.status()).toBe(400);
  await page.goto('/patient/booking');
  await page.getByTestId('book-area-fisio').click();
  await page.getByTestId('book-type-next').click();
  await page.getByTestId('book-professional').click();
  await expect(page.getByTestId(`book-professional-option-${clinic.professionalId}`)).toHaveCount(0);
});

test('SCHED-02 stale slot is rejected with visible error and no duplicate booking', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  const competitor = await clinic.createPatient();
  const plan = await availableDay(clinic);
  await bookThroughPatientUI(page, patient, clinic.professionalId, plan, false);
  const occupied = await clinic.admin.post(API + '/appointments', { data: { patient_id: competitor.id, professional_id: clinic.professionalId, ...plan, duration_min: 60 } });
  expect(occupied.ok()).toBeTruthy();
  await page.getByTestId('confirm-booking').click();
  await expect(page.getByTestId('booking-error')).toContainText('Horário ocupado');
  await expect(page.getByTestId('booking-success')).toHaveCount(0);
  const own = await (await clinic.admin.get(API + `/appointments?patient_id=${patient.id}`)).json();
  expect(own).toHaveLength(0);
  const api = await clinic.patientApi(patient);
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const date = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
  const response = await api.post(API + '/appointments', { data: { patient_id: patient.id, professional_id: clinic.professionalId, date, time: `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}` } });
  expect(response.status()).toBe(400);
  expect((await response.json()).detail).toContain('12 horas');
});

test('SCHED-03 professional sees calendar and records confirmation separately from attendance', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  const plan = await availableDay(clinic);
  const response = await clinic.admin.post(API + '/appointments', { data: { patient_id: patient.id, professional_id: clinic.professionalId, ...plan, duration_min: 60 } });
  expect(response.ok()).toBeTruthy();
  const appointment = await response.json();
  await login(page, clinic.professionalEmail);
  await nav(page, 'agenda');
  await agendaDay(page, plan.date);
  await page.getByTestId(`appt-${appointment.id}`).click();
  await page.getByTestId('action-confirmado').click();
  await expect(page.getByTestId(`appt-${appointment.id}`)).toContainText('Confirmado');
  const before = await (await clinic.admin.get(API + `/patients/${patient.id}/attendance-summary`)).json();
  expect(before.realizadas).toBe(0);
  await page.getByTestId(`appt-${appointment.id}`).click();
  await page.getByTestId('action-presente').click();
  await expect(page.getByTestId(`appt-${appointment.id}`)).toContainText('Presente');
  await page.reload();
  await agendaDay(page, plan.date);
  await expect(page.getByTestId(`appt-${appointment.id}`)).toContainText('Presente');
  await page.getByTestId('view-semana').click();
  await expect(page.getByTestId(`appt-${appointment.id}`)).toBeVisible();
  const after = await (await clinic.admin.get(API + `/patients/${patient.id}/attendance-summary`)).json();
  expect(after.realizadas).toBe(1);
});

test('SCHED-04 weekly sessions persist, duplicate series fails and upcoming sessions cancel', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  const plan = await availableDay(clinic);
  await login(page, clinic.professionalEmail);
  await nav(page, 'agenda');
  async function fillSeries() {
    await page.getByTestId((page.viewportSize()?.width || 0) >= 900 ? 'new-appt-button' : 'new-appt-fab').click();
    await select(page, 'appt-patient-select', patient.id);
    await select(page, 'appt-date-select', plan.date);
    await select(page, 'appt-time-select', plan.time);
    await select(page, 'appt-repeat-select', '2');
  }
  await fillSeries();
  const created = page.waitForResponse(r => r.url() === API + '/appointment-series' && r.request().method() === 'POST');
  await page.getByTestId('submit-appt').click();
  const response = await created; expect(response.ok()).toBeTruthy();
  const series = await response.json();
  expect(series.appointments).toHaveLength(2);
  // Compare calendar dates, not browser-local elapsed time across UK DST.
  expect(Date.parse(series.appointments[1].date + 'T00:00:00Z') - Date.parse(series.appointments[0].date + 'T00:00:00Z')).toBe(7 * 86400000);
  expect(series.appointments[1].time).toBe(series.appointments[0].time);
  await expect(page.getByTestId('new-appt-modal-title')).toHaveCount(0);
  await fillSeries();
  await page.getByTestId('submit-appt').click();
  await expect(page.getByText(/Horário ocupado em/)).toBeVisible();
  await page.getByTestId('new-appt-modal-close').click();
  const persisted = await (await clinic.admin.get(API + `/appointments?patient_id=${patient.id}`)).json();
  expect(persisted).toHaveLength(2);
  await page.reload();
  await agendaDay(page, plan.date);
  await expect(page.getByTestId(`appt-${series.appointments[0].id}`)).toContainText('Repetição semanal');
  await page.getByTestId(`appt-${series.appointments[0].id}`).click();
  await page.getByTestId('cancel-series').click();
  await expect(page.getByTestId(`appt-${series.appointments[0].id}`)).toContainText('Cancelado');
  const final = await (await clinic.admin.get(API + `/appointments?patient_id=${patient.id}`)).json();
  expect(final.every((a: {status: string}) => a.status === 'cancelado')).toBeTruthy();
});
