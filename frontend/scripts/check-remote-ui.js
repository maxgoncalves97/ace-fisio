// Read-only browser smoke checks; no trace, screenshot or credential output.
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices, expect } = require('@playwright/test');
const baseURL = 'https://ace-fisio-partner-demo.onrender.com';

(async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../backend/.env.partner'), 'utf8');
  const match = source.match(/^PARTNER_TEST_PASSWORD=['"]?([A-Za-z0-9_-]+)['"]?\r?$/m);
  if (!match) throw new Error('Local partner test password is missing.');
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
          await page.getByTestId('login-password-input').fill(match[1]);
          await page.getByTestId('login-submit-button').click();
          await expect(page).toHaveURL(new RegExp('/' + area + '/dashboard$'), { timeout: 30000 });
          await page.reload();
          await expect(page.getByTestId('login-email-input')).toHaveCount(0);
          await expect(area === 'admin' ? page.locator('[data-testid^="kpi-"]').first() : page.getByTestId('dashboard-book')).toBeVisible({ timeout: 15000 });
          if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          expect(errors).toEqual([]);
          console.log(`PASS: public ${mobile ? 'mobile' : 'desktop'} ${area} login, dashboard and session reload`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
})().catch(() => { console.error('Public UI smoke check failed; credentials were not printed.'); process.exitCode = 1; });
