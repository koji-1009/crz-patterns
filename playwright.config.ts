import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}/crz-patterns/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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

export { BASE_URL, PORT };
