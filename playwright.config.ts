import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:38123",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile-safari",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: "bun run e2e:serve",
    url: "http://127.0.0.1:38123",
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
