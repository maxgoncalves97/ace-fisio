import { test, expect, API, PASSWORD, login, nav } from './fixtures';

test('AUTH-01 protected routes, invalid login, persisted session and logout', async ({ page }) => {
  await page.goto('/admin/patients');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-email-input').fill('fisio@demo.com');
  await page.getByTestId('login-password-input').fill('incorrect-password');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-error')).toContainText('Email ou senha inválidos');
  await page.getByTestId('login-password-input').fill(PASSWORD);
  await page.getByTestId('login-submit-button').click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.reload();
  await expect(page.locator('[data-testid^="kpi-"]').first()).toBeVisible();
  await nav(page, 'settings');
  await page.getByTestId('settings-logout').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin/agenda');
  await expect(page).toHaveURL(/\/login$/);
});

test('AUTH-02 patient cannot open admin UI or another patient/private record', async ({ page, clinic }) => {
  const own = await clinic.createPatient();
  const other = await clinic.createPatient();
  await login(page, own.email);
  await page.goto('/admin/patients');
  await expect(page).toHaveURL(/\/patient\/dashboard$/);
  const api = await clinic.patientApi(own);
  expect((await api.get(API + '/patients')).status()).toBe(403);
  expect((await api.get(API + `/patients/${other.id}`)).status()).toBe(403);
  expect((await api.get(API + `/patients/${own.id}/evolutions`)).status()).toBe(403);
  expect((await api.get(API + `/patients/${own.id}`)).ok()).toBeTruthy();
  await expect(page.getByText(other.name, { exact: true })).toHaveCount(0);
});
