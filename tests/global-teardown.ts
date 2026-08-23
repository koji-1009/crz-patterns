import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

import { PID_FILE } from "./preview";

export default async function globalTeardown() {
  // Covers the daemonised server.
  spawnSync("npx", ["astro", "preview", "stop"], { stdio: "ignore" });

  // Covers a server that stayed in the foreground instead.
  if (existsSync(PID_FILE)) {
    const pid = Number(readFileSync(PID_FILE, "utf8"));
    if (pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Already gone.
      }
    }
    rmSync(PID_FILE, { force: true });
  }
}
