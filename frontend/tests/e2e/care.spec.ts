import { test, expect, API, PASSWORD, login, nav, select } from './fixtures';

test('CARE-01 professional registers patient with login; patient signs in', async ({ page, browser, clinic }) => {
  await login(page, clinic.professionalEmail);
  await nav(page, 'patients');
  const mobile = (page.viewportSize()?.width || 0) < 900;
  await page.getByTestId(mobile ? 'new-patient-fab' : 'new-patient-button').click();
  const name = `E2E-${clinic.unique}-registered`;
  const email = `e2e-${clinic.unique}@example.com`;
  await page.getByTestId('patient-name-input').fill(name);
  await page.getByTestId('patient-email-input').fill(email);
  await page.getByTestId('patient-phone-input').fill('11999990000');
  await page.getByTestId('toggle-login').click();
  await page.getByTestId('patient-login-pass').fill(PASSWORD);
  const response = page.waitForResponse(r => r.url() === API + '/patients' && r.request().method() === 'POST');
  await page.getByTestId('submit-patient').click();
  const saved = await response;
  expect(saved.ok()).toBeTruthy();
  const patient = await saved.json(); clinic.trackPatient(patient);
  await expect(page).toHaveURL(new RegExp(`/admin/patient/${patient.id}$`));
  await page.reload();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  const context = await browser.newContext();
  try {
    const patientPage = await context.newPage();
    await login(patientPage, email);
    await expect(patientPage).toHaveURL(/\/patient\/dashboard$/);
  } finally { await context.close(); }
});

test('CARE-02 intake, private clinical note and progress measurement persist', async ({ page, clinic }) => {
  const patient = await clinic.createPatient();
  await login(page, clinic.professionalEmail);
  await page.goto(`/admin/patient/${patient.id}`);
  await page.getByTestId('tab-anamnese').click();
  await page.getByTestId('anamnese-queixa').fill('E2E-Dor lombar relatada pelo paciente');
  await page.getByTestId('anamnese-tempo').fill('3 semanas');
  await page.getByTestId('save-anamnese').click();
  await expect(page.getByText('Anamnese salva com sucesso.')).toBeVisible();
  await page.reload();
  await page.getByTestId('tab-anamnese').click();
  await expect(page.getByTestId('anamnese-queixa')).toHaveValue('E2E-Dor lombar relatada pelo paciente');
  await page.getByTestId('tab-evolucoes').click();
  await page.getByTestId('new-evolution').click();
  const privateNote = `E2E-private-${clinic.unique}`;
  await page.getByTestId('evo-clinica').fill(privateNote);
  await page.getByTestId('evo-tipo').fill('Sessão de fisioterapia');
  await page.getByTestId('save-evolution').click();
  await expect(page.getByText(`Evolução: ${privateNote}`, { exact: true })).toBeVisible();
  await page.getByTestId('tab-avaliacoes').click();
  await page.getByTestId('new-assessment').click();
  await select(page, 'assess-dor', '4');
  await page.getByTestId('assess-adm').fill('95');
  await page.getByTestId('assess-local').fill('Lombar');
  const response = page.waitForResponse(r => r.url().endsWith(`/patients/${patient.id}/assessments`) && r.request().method() === 'POST');
  await page.getByTestId('save-assessment').click();
  expect((await response).ok()).toBeTruthy();
  await page.reload();
  await page.getByTestId('tab-avaliacoes').click();
  await expect(page.getByText('Lombar', { exact: false }).first()).toBeVisible();
  const api = await clinic.patientApi(patient);
  expect((await api.get(API + `/patients/${patient.id}/evolutions`)).status()).toBe(403);
  const progress = await api.get(API + `/patients/${patient.id}/assessments`);
  expect((await progress.json()).some((a: {dor: number; amplitude_movimento: number}) => a.dor === 4 && a.amplitude_movimento === 95)).toBeTruthy();
  const dashboard = await api.get(API + '/patient/dashboard');
  expect(await dashboard.text()).not.toContain(privateNote);
});

test('CARE-03 prescribed exercise and shared recommendation reach patient with notifications', async ({ page, browser, clinic }, testInfo) => {
  const patient = await clinic.createPatient();
  await login(page, clinic.professionalEmail);
  await page.goto(`/admin/patient/${patient.id}`);
  await page.getByTestId('tab-exercicios').click();
  await page.getByTestId('new-exercise').click();
  const exercise = `E2E-exercise-${clinic.unique}`;
  await page.getByTestId('ex-name').fill(exercise);
  await page.getByTestId('ex-desc').fill('Instrução revisada pelo profissional.');
  await page.getByTestId('ex-series').fill('3');
  await page.getByTestId('ex-reps').fill('10');
  await page.getByTestId('save-exercise').click();
  await expect(page.getByText(exercise, { exact: true })).toBeVisible();
  await page.getByTestId('tab-orientacoes').click();
  await page.getByTestId('new-note').click();
  const note = `E2E-public-${clinic.unique}`;
  await page.getByTestId('note-text').fill(note);
  await page.getByTestId('save-note').click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch });
  try {
    const pp = await context.newPage();
    await login(pp, patient.email);
    await pp.goto('http://localhost:4173/patient/exercises');
    await expect(pp.getByText(exercise, { exact: true })).toBeVisible();
    await expect(pp.getByText('3 séries', { exact: true })).toBeVisible();
    await pp.reload();
    await expect(pp.getByText(exercise, { exact: true })).toBeVisible();
    await pp.goto('http://localhost:4173/patient/history');
    await pp.getByTestId('seg-orientacoes').click();
    await expect(pp.getByText(note, { exact: true })).toBeVisible();
    await pp.goto('http://localhost:4173/patient/notifications');
    await expect(pp.getByText('Novo exercício prescrito', { exact: true })).toBeVisible();
    await pp.getByTestId('read-all').click();
    await expect(pp.getByTestId('read-all')).toHaveCount(0);
    const api = await clinic.patientApi(patient);
    expect((await (await api.get(API + '/notifications')).json()).every((n: {read: boolean}) => n.read)).toBeTruthy();
  } finally { await context.close(); }
});
