import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { executeJob, runCommand, sandboxEnv } from "./common.js";

/**
 * JavaScript runner: stages user files + a harness that imports the entry
 * export, runs each visible test (awaiting promises), and prints one
 * NOX_RESULT JSON line. Deep-equal uses Object.is leaves (NaN-safe).
 */

const HARNESS = `import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const job = JSON.parse(readFileSync(process.argv[2], "utf8"));
const here = dirname(resolve(process.argv[2]));
// File first (survives stdout floods), stdout line as fallback.
const out = (obj) => {
  const s = JSON.stringify(obj);
  try { writeFileSync(join(here, "_result.json"), s); } catch {}
  console.log("NOX_RESULT:" + s);
};

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function safe(v) {
  try {
    const s = JSON.stringify(v);
    if (s !== undefined) return JSON.parse(s);
  } catch {}
  try {
    return { __unserializable__: String(v) };
  } catch {
    return { __unserializable__: "[unprintable]" };
  }
}

let extra = [];
try {
  for (const src of Object.values(job.testContext ?? {})) {
    extra.push(new Function("return (" + src + ")")());
  }
} catch (e) {
  out({ fatal: "test setup failed: " + (e && e.message ? e.message : e) });
  process.exit(3);
}

let mod;
try {
  mod = await import(pathToFileURL(resolve(here, job.entryFile)).href);
} catch (e) {
  const stack = e && e.stack ? e.stack : String(e);
  out({ fatal: stack.split("\\n").slice(0, 3).join("\\n") });
  process.exit(3);
}

const fn = mod[job.entryFunction];
if (typeof fn !== "function") {
  out({ fatal: '"' + job.entryFunction + '" is not exported from ' + job.entryFile });
  process.exit(3);
}

const results = [];
for (const t of job.tests) {
  try {
    let actual = fn.apply(null, (t.input || []).concat(extra));
    if (actual && typeof actual.then === "function") actual = await actual;
    results.push({
      name: t.name,
      passed: deepEqual(actual, t.expected),
      actual: safe(actual),
      expected: t.expected === undefined ? null : t.expected,
    });
  } catch (e) {
    const stack = e && e.stack ? e.stack : String(e);
    results.push({ name: t.name, passed: false, error: stack.split("\\n").slice(0, 4).join("\\n") });
  }
}
out({ results });
`;

async function runHarness(dir, job, limitMs) {
  await writeFile(join(dir, "_run.mjs"), HARNESS, "utf8");
  return runCommand({
    cmd: "node",
    args: ["--max-old-space-size=256", "_run.mjs", "job.json"],
    cwd: dir,
    timeoutMs: limitMs,
    env: sandboxEnv(),
  });
}

export function executeJavascript(job) {
  return executeJob(job, runHarness);
}
