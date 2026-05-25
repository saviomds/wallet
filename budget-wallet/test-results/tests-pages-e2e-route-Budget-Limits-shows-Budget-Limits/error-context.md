# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\pages.spec.js >> e2e route Budget Limits shows Budget Limits
- Location: e2e\tests\pages.spec.js:17:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Budget Limits')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Budget Limits')

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- alert
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | const PAGES = [
  4  |   { nav: 'Dashboard', expectText: 'Quick Actions' },
  5  |   { nav: 'Analytics', expectText: 'Analytics' },
  6  |   { nav: 'Add Transaction', expectText: 'Add Transaction' },
  7  |   { nav: 'Ledger', expectText: 'Master Ledger' },
  8  |   { nav: 'Pay & Invoice', expectText: 'Pay & Invoice' },
  9  |   { nav: 'Recurring', expectText: 'Recurring' },
  10 |   { nav: 'Budget Limits', expectText: 'Budget Limits' },
  11 |   { nav: 'Savings Goal', expectText: 'Savings Goal' },
  12 |   { nav: 'Shared Wallets', expectText: 'Shared Wallets' },
  13 |   { nav: 'Settings', expectText: 'Settings' },
  14 | ];
  15 | 
  16 | for (const p of PAGES) {
  17 |   test(`e2e route ${p.nav} shows ${p.expectText}`, async ({ page }) => {
  18 |     // Load the test-only e2e route which renders the component with a mock ctx
  19 |     const slug = p.nav.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'').replace(/^-+/,'');
  20 |     await page.goto(`/e2e/${slug}`);
> 21 |     await expect(page.getByText(p.expectText, { exact: false })).toBeVisible();
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  22 |   });
  23 | }
  24 | 
```