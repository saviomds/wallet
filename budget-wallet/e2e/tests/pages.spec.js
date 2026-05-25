import { test, expect } from '@playwright/test';

const PAGES = [
  { route: 'dashboard', selector: 'text', expectText: 'Quick Actions' },
  { route: 'analytics', selector: 'h1', expectText: 'Analytics' },
  { route: 'add', selector: 'h1', expectText: 'Add Transaction' },
  { route: 'ledger', selector: 'h1', expectText: 'Master Ledger' },
  { route: 'pay', selector: 'h1', expectText: 'Pay & Invoice' },
  { route: 'recurring', selector: 'h1', expectText: 'Recurring' },
  { route: 'budgets', selector: 'h1', expectText: 'Budget Limits' },
  { route: 'savings', selector: 'h1', expectText: 'Savings Goal' },
  { route: 'shared', selector: 'h1', expectText: 'Shared Wallets' },
  { route: 'settings', selector: 'h1', expectText: 'Settings' },
];

for (const p of PAGES) {
  test(`e2e route ${p.route} shows ${p.expectText}`, async ({ page }) => {
    await page.goto(`/e2e/${p.route}`);
    if (p.selector === 'text') {
      await expect(page.getByText(p.expectText, { exact: true })).toBeVisible();
      return;
    }
    await expect(page.locator(p.selector).filter({ hasText: p.expectText })).toBeVisible();
  });
}
