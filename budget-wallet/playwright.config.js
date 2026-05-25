/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run start -- -p 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};

module.exports = config;
