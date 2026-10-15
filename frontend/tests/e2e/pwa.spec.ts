import { test, expect } from './fixtures';

test('PWA-01 installation assets, mobile layout and safe offline fallback', async ({ page, context }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-screen')).toBeVisible();
  const info = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const manifest = await (await fetch('/manifest.json')).json();
    const icons = await Promise.all(manifest.icons.map(async (icon: {src: string}) => {
      const image = new Image(); image.src = icon.src; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }));
    return { lang: document.documentElement.lang, display: manifest.display, icons,
      documentWidth: document.documentElement.scrollWidth, width: innerWidth };
  });
  expect(info.lang).toBe('pt-BR');
  expect(info.display).toBe('standalone');
  expect(info.icons).toEqual([[192, 192], [512, 512]]);
  expect(info.documentWidth).toBeLessThanOrEqual(info.width);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  try {
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Você está sem conexão', { exact: true })).toBeVisible();
    const cached = await page.evaluate(async () => {
      const cache = await caches.open('ace-fisio-offline-v2');
      return (await cache.keys()).map(request => new URL(request.url).pathname);
    });
    expect(cached).toEqual(['/offline.html']);
    await expect(page.locator('input')).toHaveCount(0);
  } finally { await context.setOffline(false); }
});
