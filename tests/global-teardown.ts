import { execFileSync } from "node:child_process";

export default async function globalTeardown() {
  try {
    execFileSync("npx", ["astro", "preview", "stop"], { stdio: "inherit" });
  } catch {
    // Already stopped, or never started — nothing to clean up.
  }
}
