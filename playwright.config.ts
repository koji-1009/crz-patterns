import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./tests/preview";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A whole-run ceiling, so a hang shows up as a failed run in minutes rather
  // than burning the job's timeout.
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : 0,
  // One retry, not two: a suite this size re-running everything three times
  // costs more than the flake protection is worth.
  retries: process.env.CI ? 1 : 0,
  // The Playwright docs recommend a single worker on CI for stability. A
  // ubuntu-latest runner has 4 vCPUs, so there is headroom to raise this if
  // the suite ever outgrows its runtime; it does not need it today. Spread
  // rather than assign undefined, which exactOptionalPropertyTypes rejects.
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
    // Closest available proxy for the reported iOS failures. It is WebKit on
    // the host OS, not a real iPhone, so it narrows the gap without closing it.
    { name: "mobile-safari", use: { ...devices["iPhone 15"] } },
  ],
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
});
