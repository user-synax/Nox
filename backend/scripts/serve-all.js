/**
 * Production supervisor — boots the API and an execution worker together
 * in ONE container (no --watch). Used as the Render web-service command
 * on the free tier, where a separate background worker isn't available:
 *   dockerCommand: bun scripts/serve-all.js
 *
 * Prefer two services (web + worker) when possible — a wedged worker
 * loop can't starve the API there. This keeps both alive in one process
 * tree here; SIGTERM/SIGINT stops both.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kids = new Map();

let shuttingDown = false;

function start(name, args) {
  const child = spawn("bun", args, { cwd: root, stdio: "inherit" });
  kids.set(name, child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[serve] ${name} exited (${signal ?? `code ${code}`}) — restarting in 2s`);
    setTimeout(() => {
      if (!shuttingDown) start(name, args);
    }, 2000);
  });
  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[serve] stopping…");
  for (const child of kids.values()) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  setTimeout(() => process.exit(0), 15000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start("api", ["src/index.js"]);
start("worker", ["workers/runner.js"]);
console.log("[serve] api + worker up.");
await new Promise(() => {});
