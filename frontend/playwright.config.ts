import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1, // Bound database load; every mutating test owns unique fixtures.
  forbidOnly: true,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    actionTimeout: 10000,
    navigationTimeout: 20000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node scripts/start-demo-api.js', url: 'http://127.0.0.1:8000/local-demo-health', reuseExistingServer: true, timeout: 60000 },
    { command: 'node scripts/preview-web.js', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 20000 },
  ],
});
