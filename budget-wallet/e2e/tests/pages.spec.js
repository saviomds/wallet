const { test, expect } = require('@playwright/test');

const PAGES = [
  { nav: 'Dashboard', expectText: 'Quick Actions' },
  { nav: 'Analytics', expectText: 'Analytics' },
  { nav: 'Add Transaction', expectText: 'Add Transaction' },
  { nav: 'Ledger', expectText: 'Master Ledger' },
  { nav: 'Pay & Invoice', expectText: 'Pay & Invoice' },
  { nav: 'Recurring', expectText: 'Recurring' },
  { nav: 'Budget Limits', expectText: 'Budget Limits' },
  { nav: 'Savings Goal', expectText: 'Savings Goal' },
  { nav: 'Shared Wallets', expectText: 'Shared Wallets' },
  { nav: 'Settings', expectText: 'Settings' },
];

for (const p of PAGES) {
  test(`e2e route ${p.nav} shows ${p.expectText}`, async ({ page }) => {
    // Load the test-only e2e route which renders the component with a mock ctx
    const slug = p.nav.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'').replace(/^-+/,'');
    await page.goto(`/e2e/${slug}`);
    await expect(page.getByText(p.expectText, { exact: false })).toBeVisible();
  });
}
