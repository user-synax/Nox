import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, dirname, sep } from "node:path";
import { runCommand, sandboxEnv } from "./spawn.js";

/**
 * Shared job lifecycle: stage files into a fresh temp dir, run the
 * language harness, parse the NOX_RESULT protocol line, clean up.
 * `runHarness(dir, job)` is the only language-specific piece.
 */

const OUTPUT_TAIL = 8192;

function safePath(p) {
  const norm = normalize(String(p)).replace(/^([/\\])+/, "");
  if (norm === "" || norm === "." || norm.startsWith("..") || norm.includes(".."+sep) || sep !== "/" && norm.includes("../")) {
    throw new Error(`Unsafe file path: ${p}`);
  }
  return norm;
}

export async function stageJob(job) {
  const dir = await mkdtemp(join(tmpdir(), "Nox-run-"));
  try {
    for (const f of job.files ?? []) {
      const rel = safePath(f.path);
      const full = join(dir, rel);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, f.content ?? "", "utf8");
    }
    await writeFile(
      join(dir, "job.json"),
      JSON.stringify({
        entryFile: job.entryFile,
        entryFunction: job.entryFunction,
        tests: job.tests,
        testContext: job.testContext ?? {},
      }),
      "utf8"
    );
    return dir;
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

export function parseProtocol(stdout) {
  const lines = String(stdout ?? "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("NOX_RESULT:")) {
      try {
        return JSON.parse(line.slice("NOX_RESULT:".length));
      } catch {
        return { protocolError: "Harness returned malformed results." };
      }
    }
  }
  return { protocolError: "Harness produced no results." };
}

export async function readResultFile(dir) {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return JSON.parse(await readFile(join(dir, "_result.json"), "utf8"));
  } catch {
    return null;
  }
}

export function tail(text) {
  const s = String(text ?? "");
  return s.length > OUTPUT_TAIL ? "…[truncated]\n" + s.slice(-OUTPUT_TAIL) : s;
}

/**
 * Runs one job end-to-end. Returns the terminal result for finishRun():
 * { status, testsPassed, testsTotal, results, error, output,
 *   executionTimeMs }
 */
export async function executeJob(job, runHarness) {
  const started = Date.now();
  const total = job.tests?.length ?? 0;
  let dir = null;
  try {
    dir = await stageJob(job);
  } catch (err) {
    return {
      status: "system-error",
      testsPassed: 0,
      testsTotal: total,
      results: [],
      error: `Could not stage job: ${err?.message ?? err}`,
      output: null,
      executionTimeMs: Date.now() - started,
    };
  }
  try {
    const limit = job.timeLimitMs ?? 2000;
    const run = await runHarness(dir, job, limit);
    const timeMs = Date.now() - started;    if (run.systemError) {
      return {
        status: "system-error",
        testsPassed: 0,
        testsTotal: total,
        results: [],
        error: run.systemError,
        output: tail(run.stdout),
        executionTimeMs: timeMs,
      };
    }
    if (run.timedOut) {
      return {
        status: "timeout",
        testsPassed: 0,
        testsTotal: total,
        results: [],
        error: `Execution exceeded the ${(limit / 1000).toFixed(1)} second limit.`,
        output: tail(run.stdout),
        executionTimeMs: timeMs,
      };
    }
    const protocol = (await readResultFile(dir)) ?? parseProtocol(run.stdout);
    if (protocol.protocolError || protocol.fatal) {
      const errText = protocol.fatal ?? protocol.protocolError;
      const stderrTail = tail(run.stderr);
      return {
        status: "runtime-error",
        testsPassed: 0,
        testsTotal: total,
        results: [],
        error: String(errText).slice(0, 800) + (stderrTail ? `\n${stderrTail}`.slice(0, 800) : ""),
        output: tail(run.stdout),
        executionTimeMs: timeMs,
      };
    }
    const results = Array.isArray(protocol.results) ? protocol.results : [];
    const passed = results.filter((r) => r.passed).length;
    return {
      status: passed === total && total > 0 ? "passed" : "failed",
      testsPassed: passed,
      testsTotal: total,
      results,
      error: null,
      output: tail(run.stdout),
      executionTimeMs: timeMs,
    };
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export { runCommand, sandboxEnv };
