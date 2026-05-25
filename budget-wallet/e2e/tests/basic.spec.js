import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response && response.status()).toBeLessThan(400);
});

test('record endpoint requires auth', async ({ request, baseURL }) => {
  const r = await request.post(`${baseURL}/api/payments/record`, { data: { amount: 1 } });
  expect(r.status()).toBe(401);
});
