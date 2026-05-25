import { test, expect } from '@playwright/test';

test('pay page shows form and pay button state', async ({ page }) => {
  await page.goto('/e2e/pay');

  // Recipient input
  const recipient = page.locator('input[placeholder="john@example.com"]');
  await expect(recipient).toBeVisible();
  await recipient.fill('alice@example.com');

  // Amount input
  const amount = page.locator('input[placeholder="0.00"]');
  await expect(amount).toBeVisible();
  await amount.fill('12.50');

  // Description input
  const desc = page.locator('input[placeholder="Services, goods, invoice #…"]');
  await expect(desc).toBeVisible();
  await desc.fill('Consulting');

  // After filling details, button should prompt to sign in (no session present)
  const payBtn = page.locator('button.btn-primary');
  await expect(payBtn).toBeVisible();
  await expect(payBtn).toHaveText(/sign in/i);
  await expect(payBtn).toBeDisabled();
});
