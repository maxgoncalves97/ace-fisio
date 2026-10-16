/* global __dirname */
// Read-only browser smoke checks; no trace, screenshot or credential output.
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices, expect } = require('@playwright/test');
const { parse } = require('dotenv');
const baseURL = 'https://ace-fisio-partner-demo.onrender.com';

(async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../backend/.env.partner'), 'utf8');
  const password = parse(source).PARTNER_TEST_PASSWORD;
  if (!password) throw new Error('Local partner test password is missing.');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const mobile of [false, true]) {
      for (const [email, area] of [['fisio@demo.com', 'admin'], ['joao@demo.com', 'patient']]) {
        const context = await browser.newContext({ baseURL, ...(mobile ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 } }) });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto('/login');
          await expect(page.getByTestId('demo-fill-fisio@demo.com')).toHaveCount(0);
          await page.getByTestId('login-email-input').fill(email);
          await page.getByTestId('login-password-input').fill(password);
          await page.getByTestId('login-submit-button').click();
          await expect(page).toHaveURL(new RegExp('/' + area + '/dashboard$'), { timeout: 30000 });
          await page.reload();
          await expect(page.getByTestId('login-email-input')).toHaveCount(0);
          await expect(area === 'admin' ? page.locator('[data-testid^="kpi-"]').first() : page.getByTestId('dashboard-book')).toBeVisible({ timeout: 15000 });
          if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          if (area === 'admin') {
            await page.goto('/admin/settings');
            await expect(page.getByTestId('booking-enabled')).toBeVisible();
            await expect(page.getByTestId('availability-day-4')).toBeVisible();
            await page.getByTestId('availability-professional').click();
            await expect(page.getByTestId('availability-professional-modal-title')).toBeVisible();
            await page.getByTestId('availability-professional-modal-close').click();
          }
          if (area === 'patient') {
            await page.goto('/patient/booking');
            await expect(page.getByText('O que você deseja agendar?')).toBeVisible();
            await expect(page.locator('[data-testid^="book-proc-"]')).toHaveCount(0);
            for (const kind of ['fisio', 'pilates']) {
              await page.getByTestId(`book-area-${kind}`).click();
              await page.getByTestId('book-type-next').click();
              await expect(page.getByTestId('book-professional')).toBeVisible();
              await expect(page.locator('[data-testid^="book-proc-"]').first()).toBeVisible();
              if (kind === 'fisio') await page.getByTestId('book-service-back').click();
            }
            await page.getByTestId('book-professional').click();
            const box = await page.getByTestId('book-professional-modal-title').locator('..').locator('..').boundingBox();
            expect(box.y).toBeGreaterThan(0);
            expect(box.y + box.height).toBeLessThan(page.viewportSize().height);
            await page.locator('[data-testid^="book-professional-option-"]').first().click();
            await page.locator('[data-testid^="book-proc-"]').first().click();
            if (await page.getByTestId('book-service').count()) {
              await page.getByTestId('book-service').click();
              await page.locator('[data-testid^="book-service-option-"]').first().click();
            }
            await page.getByTestId('step1-next').click();
            await page.locator('[data-testid^="book-date-"]').first().click();
            await expect(page.getByTestId('book-time-07:00')).toHaveAttribute('aria-disabled', 'true');
            await expect(page.getByTestId('book-time-07:00').getByText('07:00', { exact: true })).toHaveCSS('text-decoration-line', 'line-through');
          }
          await page.getByTestId(mobile ? 'header-logout' : 'sidebar-logout').click();
          await expect(page).toHaveURL(/\/login$/);
          await page.goto(`/${area}/dashboard`);
          await expect(page).toHaveURL(/\/login$/);
          expect(errors).toEqual([]);
          console.log(`PASS: public ${mobile ? 'mobile' : 'desktop'} ${area} login, dashboard, session reload, logout${area === 'patient' ? ' and both booking types' : ''}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
})().catch(() => { console.error('Public UI smoke check failed; credentials were not printed.'); process.exitCode = 1; });
