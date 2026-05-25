# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\pages.spec.js >> e2e route Analytics shows Analytics
- Location: e2e\tests\pages.spec.js:17:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Analytics')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Analytics')
    - waiting for" http://localhost:3000/e2e/analytics" navigation to finish...
    - navigated to "http://localhost:3000/e2e/analytics"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - navigation [ref=e7]:
            - button "previous" [disabled] [ref=e8]:
              - img "previous" [ref=e9]
            - generic [ref=e11]:
              - generic [ref=e12]: 1/
              - text: "2"
            - button "next" [ref=e13] [cursor=pointer]:
              - img "next" [ref=e14]
          - img
        - generic [ref=e16]:
          - link "Next.js 16.2.4 (stale) Webpack" [ref=e17] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e18]
            - generic "There is a newer version (16.2.6) available, upgrade recommended!" [ref=e20]: Next.js 16.2.4 (stale)
            - generic [ref=e21]: Webpack
          - img
      - generic [ref=e22]:
        - dialog "Console Error" [ref=e23]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e30]: Console Error
              - generic [ref=e31]:
                - button "Copy Error Info" [ref=e32] [cursor=pointer]:
                  - img [ref=e33]
                - button "No related documentation found" [disabled] [ref=e35]:
                  - img [ref=e36]
                - button "Attach Node.js inspector" [ref=e38] [cursor=pointer]:
                  - img [ref=e39]
            - generic [ref=e48]:
              - text: Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (
              - link "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template" [ref=e49] [cursor=pointer]:
                - /url: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
              - text: ).
          - generic [ref=e50]: "1"
          - generic [ref=e51]: "2"
        - contentinfo [ref=e52]:
          - region "Error feedback" [ref=e53]:
            - paragraph [ref=e54]:
              - link "Was this helpful?" [ref=e55] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e56] [cursor=pointer]:
              - img [ref=e57]
            - button "Mark as not helpful" [ref=e60] [cursor=pointer]:
              - img [ref=e61]
    - generic [ref=e67] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e68]:
        - img [ref=e69]
      - generic [ref=e72]:
        - button "Open issues overlay" [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]: "1"
            - generic [ref=e76]: "2"
          - generic [ref=e77]:
            - text: Issue
            - generic [ref=e78]: s
        - button "Collapse issues badge" [ref=e79]:
          - img [ref=e80]
  - generic [ref=e83]:
    - img [ref=e84]
    - heading "This page couldn’t load" [level=1] [ref=e86]
    - paragraph [ref=e87]: Reload to try again, or go back.
    - generic [ref=e88]:
      - button "Reload" [ref=e90] [cursor=pointer]
      - button "Back" [ref=e91] [cursor=pointer]
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