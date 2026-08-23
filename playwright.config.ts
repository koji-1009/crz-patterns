import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./tests/preview";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : 0,
  retries: process.env.CI ? 1 : 0,
  // Spread rather than assign undefined, which exactOptionalPropertyTypes rejects.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [["html"], ["github"]] : [["html"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
});
