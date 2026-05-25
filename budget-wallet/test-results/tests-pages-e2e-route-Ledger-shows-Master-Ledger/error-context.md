# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\pages.spec.js >> e2e route Ledger shows Master Ledger
- Location: e2e\tests\pages.spec.js:17:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Master Ledger')
Expected: visible
Error: strict mode violation: getByText('Master Ledger') resolved to 2 elements:
    1) <h1>Master Ledger</h1> aka locator('h1')
    2) <h3>Master Ledger</h3> aka locator('h3')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Master Ledger')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: Money
        - heading "Master Ledger" [level=1] [ref=e6]
      - generic [ref=e7]:
        - combobox [ref=e8]:
          - option "USD" [selected]
        - button "Export CSV" [ref=e9] [cursor=pointer]
        - button "+ Add" [ref=e10] [cursor=pointer]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img [ref=e14]
        - textbox "Search transactions…" [ref=e17]
      - textbox [ref=e18]
      - textbox [ref=e19]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]:
          - heading "Master Ledger" [level=3] [ref=e23]
          - generic [ref=e24]: 0 entries
        - generic [ref=e25]:
          - generic [ref=e26]:
            - button "All" [ref=e27] [cursor=pointer]
            - button "Income" [ref=e28] [cursor=pointer]
            - button "Expense" [ref=e29] [cursor=pointer]
          - combobox [ref=e30]:
            - option "Newest" [selected]
            - option "Oldest"
            - option "Highest"
            - option "Lowest"
      - generic [ref=e32]: No transactions yet.
  - button "Open Next.js Dev Tools" [ref=e38] [cursor=pointer]:
    - img [ref=e39]
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