import { spawn } from "node:child_process";

/**
 * Sandboxed-ish child execution (process isolation tier).
 *
 * Guarantees: separate process (never the API/worker event loop), wall-clock
 * kill at timeoutMs, stdout/stderr capped, scrubbed environment (no secrets
 * ever reach user code), fresh temp cwd per job.
 *
 * Known limits without containers (documented, accepted for this milestone):
 * no RAM/CPU quotas, no network egress block, no syscall filtering.
 * The runner interface keeps those swappable: a Docker worker only needs
 * to replace executeJob()'s spawn core.
 */

const MAX_OUTPUT_BYTES = 64 * 1024;

function pushCapped(store, chunk) {
  const text = chunk.toString("utf8");
  if (store.text.length + text.length > MAX_OUTPUT_BYTES) {
    const room = MAX_OUTPUT_BYTES - store.text.length;
    if (room > 0) store.text += text.slice(0, room);
    store.truncated = true;
    return;
  }
  store.text += text;
}

export function runCommand({ cmd, args, cwd, timeoutMs, env }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const stdout = { text: "", truncated: false };
    const stderr = { text: "", truncated: false };
    let timedOut = false;
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (err) {
      return done({
        systemError: `Could not start runtime: ${err?.message ?? err}`,
        timeMs: Date.now() - started,
      });
    }

    const killTimer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* already dead */
      }
    }, timeoutMs);
    // Don't let a hung stdio drain hold the worker open past the kill.
    killTimer.unref?.();

    child.stdout.on("data", (c) => pushCapped(stdout, c));
    child.stderr.on("data", (c) => pushCapped(stderr, c));
    child.on("error", (err) => {
      clearTimeout(killTimer);
      done({
        systemError: `Runtime failed to run: ${err?.message ?? err}`,
        timeMs: Date.now() - started,
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(killTimer);
      done({
        timedOut,
        code,
        signal,
        stdout: stdout.text,
        stderr: stderr.text,
        truncated: stdout.truncated || stderr.truncated,
        timeMs: Date.now() - started,
      });
    });
  });
}

/**
 * Minimal environment for user code: PATH + Windows runtime needs.
 * Everything else (API keys, ports, DB URLs) stays out by construction.
 */
export function sandboxEnv() {
  const keep = {};
  for (const k of ["PATH", "SystemRoot", "SystemDrive", "TEMP", "TMP"]) {
    if (process.env[k]) keep[k] = process.env[k];
  }
  keep.PYTHONUTF8 = "1";
  keep.PYTHONDONTWRITEBYTECODE = "1";
  keep.PYTHONIOENCODING = "utf-8";
  keep.NODE_NO_WARNINGS = "1";
  return keep;
}
