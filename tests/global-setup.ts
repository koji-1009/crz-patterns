import { execFileSync } from "node:child_process";

/**
 * Astro 7's `astro preview` starts a background server and returns straight
 * away, so Playwright's `webServer` option would see the process exit before
 * the suite starts. Drive Astro's own CLI here instead, and stop it again in
 * global-teardown.
 */
const PREVIEW_URL = "http://127.0.0.1:4321/crz-patterns/";

function astro(...args: string[]) {
  execFileSync("npx", ["astro", ...args], { stdio: "inherit" });
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready at ${url}`);
}

export default async function globalSetup() {
  astro("build");
  astro("preview", "--host", "127.0.0.1");
  await waitForServer(PREVIEW_URL);
}
