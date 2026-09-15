/**
 * Dev supervisor — boots the API and an execution worker together.
 * Usage: bun run dev:all  (or: bun scripts/dev-all.js)
 *
 * Runs alone are the #1 cause of "jobs stuck queued": the API accepts
 * work, but only a worker process can execute it. This keeps both alive
 * in one terminal; Ctrl+C stops both.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kids = new Map();

function start(name, args) {
  const child = spawn("bun", args, { cwd: root, stdio: "inherit" });
  kids.set(name, child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev] ${name} exited (${signal ?? `code ${code}`}) — restarting in 2s`);
    setTimeout(() => {
      if (!shuttingDown) start(name, args);
    }, 2000);
  });
  return child;
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[dev] stopping…");
  for (const child of kids.values()) {
    try {
      child.kill("SIGINT");
    } catch {}
  }
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start("api", ["--watch", "src/index.js"]);
start("worker", ["--watch", "workers/runner.js"]);
console.log("[dev] api + worker up. Ctrl+C stops both.");
await new Promise(() => {});
