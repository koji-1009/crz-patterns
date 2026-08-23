import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

import { PID_FILE, PREVIEW_URL } from "./preview";

/**
 * Astro 7's `astro preview` starts a background server and returns straight
 * away, so Playwright's `webServer` option would see the process exit before
 * the suite starts. Drive it here instead, and stop it in global-teardown.
 *
 * Nothing may inherit this process's stdio: a GitHub Actions step does not
 * finish while any surviving process still holds its output pipe, so a server
 * that outlives the command that started it would hang the job.
 */
function run(args: string[], detach: boolean) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn("npx", ["astro", ...args], {
      stdio: "ignore",
      detached: detach,
    });
    if (detach) {
      child.unref();
      resolve(child.pid ?? 0);
      return;
    }
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(0)
        : reject(new Error(`astro ${args.join(" ")} exited with ${code}`)),
    );
  });
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready at ${url}`);
}

export default async function globalSetup() {
  await run(["build"], false);
  const pid = await run(["preview", "--host", "127.0.0.1"], true);
  // `astro preview` may daemonise, in which case this pid is the launcher and
  // has already exited. Record it anyway: if it did stay in the foreground,
  // teardown has to be able to kill it.
  writeFileSync(PID_FILE, String(pid));
  await waitForServer(PREVIEW_URL);
}
