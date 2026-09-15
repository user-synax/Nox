import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { executeJob, runCommand, sandboxEnv } from "./common.js";

/**
 * Python runner: stages user files + a harness that imports the entry
 * function, runs each visible test, and prints one NOX_RESULT JSON line.
 * Import-time failures (e.g. IndentationError) surface as runtime-error —
 * for some challenges, that failure IS the lesson.
 */

const HARNESS = `import importlib.util
import json
import sys
import os
import traceback
import inspect
import asyncio

def safe(v):
    try:
        json.dumps(v)
        return v
    except Exception:
        try:
            return {"__unserializable__": str(v)}
        except Exception:
            return {"__unserializable__": "[unprintable]"}

def out(obj):
    s = json.dumps(obj)
    try:
        open(os.path.join(here, "_result.json"), "w", encoding="utf-8").write(s)
    except Exception:
        pass
    sys.stdout.write("NOX_RESULT:" + s + "\\n")
    sys.stdout.flush()

job = json.load(open(sys.argv[1], encoding="utf-8"))
here = os.path.dirname(os.path.abspath(sys.argv[1]))

extra = []
try:
    for src in (job.get("testContext") or {}).values():
        extra.append(eval(src, {"__builtins__": __builtins__}))
except Exception as e:
    out({"fatal": "test setup failed: %s" % e})
    sys.exit(3)

entry = os.path.join(here, job["entryFile"])
try:
    mod_name = "usercode_" + os.path.splitext(os.path.basename(entry))[0]
    spec = importlib.util.spec_from_file_location(mod_name, entry)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
except BaseException:
    out({"fatal": traceback.format_exc(limit=3)})
    sys.exit(3)

fn = getattr(mod, job["entryFunction"], None)
if not callable(fn):
    out({"fatal": '"%s" is not defined in %s' % (job["entryFunction"], job["entryFile"])})
    sys.exit(3)

results = []
for t in job["tests"]:
    try:
        actual = fn(*(t.get("input") or []), *extra)
        if inspect.isawaitable(actual):
            actual = asyncio.run(actual)
        results.append({
            "name": t["name"],
            "passed": actual == t.get("expected"),
            "actual": safe(actual),
            "expected": t.get("expected"),
        })
    except BaseException:
        results.append({"name": t["name"], "passed": False, "error": traceback.format_exc(limit=4)})
out({"results": results})
`;

async function runHarness(dir, job, limitMs) {
  await writeFile(join(dir, "_run.py"), HARNESS, "utf8");
  const Python = process.env.NOX_PYTHON ?? "Python";
  return runCommand({
    // -S skips site.py (stdlib-only challenges don't need it, ~50ms saved),
    // -u keeps stdio unbuffered so timeout kills don't eat trailing output.
    cmd: Python,
    args: ["-S", "-u", "_run.py", "job.json"],
    cwd: dir,
    timeoutMs: limitMs,
    env: sandboxEnv(),
  });
}

export function executePython(job) {
  return executeJob(job, runHarness);
}
