/**
 * Nox API smoke test — full loop against a running API (default :4000).
 * Usage: bun scripts/smoke.js [baseUrl]
 *
 * Covers auth (verification ENFORCED; links read from the dev outbox —
 * no RESEND_API_KEY needed), profile surface, and the challenge catalog
 * + admin API (PRD §7 / §20 / §22 / §29).
 */
import { MongoClient } from "mongodb";

const BASE = process.argv[2] ?? "http://localhost:4000";
const TAG = `smoke_${Date.now().toString(36)}`;
// NOTE: must use an allowlisted domain (see ALLOWED_EMAIL_DOMAINS).
const EMAIL = `${TAG}@gmail.com`;
const USER = `u_${TAG}`.slice(0, 20);
const PASS = "correct-horse-9";
const NEW_PASS = "new-horse-99";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

async function req(method, path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, cookie: res.headers.get("set-cookie") };
}
const post = (path, body, cookie) => req("POST", path, body, cookie);
const get = (path, cookie) => req("GET", path, undefined, cookie);

const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
check("health", health?.ok === true, JSON.stringify(health));

const bad = await post("/auth/register", {
  email: "nope",
  password: "short",
  username: "ab",
});
check(
  "register rejects invalid input (422 + issues)",
  bad.status === 422 && Array.isArray(bad.json?.issues),
  `got ${bad.status}`
);

const created = await post("/auth/register", {
  email: EMAIL,
  password: PASS,
  username: USER,
});
check(
  "register accepts valid input",
  created.status === 200 || created.status === 201,
  `got ${created.status} ${JSON.stringify(created.json)}`
);
check(
  "register creates account with NO session (verification pending)",
  !created.cookie,
  `cookie=${!!created.cookie}`
);

// Verification links land in the dev outbox (dev fallback in lib/email.js);
// the token rides as ?token= on the frontend URL — same shape in prod email.
async function verifyEmail(emailAddr) {
  const out = await get(`/auth/dev/outbox?email=${encodeURIComponent(emailAddr)}`);
  const link = out.json?.items?.find((i) => i.kind === "verify-email")?.url;
  const token = link ? new URL(link).searchParams.get("token") : null;
  if (!token) return false;
  const v = await post("/auth/verify-email", { token });
  return v.status === 200;
}

const badDomain = await post("/auth/register", {
  email: `${TAG}@example.com`,
  password: PASS,
  username: `d_${TAG}`.slice(0, 20),
});
check(
  "non-allowlisted domain → 422",
  badDomain.status === 422 && /gmail\.com/i.test(JSON.stringify(badDomain.json)),
  `got ${badDomain.status} ${JSON.stringify(badDomain.json)}`
);

const dupUser = await post("/auth/register", {
  email: `other_${EMAIL}`,
  password: PASS,
  username: USER,
});
check(
  "duplicate username → 422 taken",
  dupUser.status === 422 && /taken|username/i.test(JSON.stringify(dupUser.json)),
  `got ${dupUser.status} ${JSON.stringify(dupUser.json)}`
);

const dupEmail = await post("/auth/register", {
  email: EMAIL,
  password: PASS,
  username: `other_${USER}`.slice(0, 20),
});

const immediateLogin = await post("/auth/login", { email: EMAIL, password: PASS });
check("login before verification → 403", immediateLogin.status === 403, `got ${immediateLogin.status}`);
check("verify-email link from outbox verifies", await verifyEmail(EMAIL));
const verifiedLogin = await post("/auth/login", { email: EMAIL, password: PASS });
check("login works after verification", verifiedLogin.status === 200, `got ${verifiedLogin.status}`);

const mongo = new MongoClient("mongodb://127.0.0.1:27017/Nox");
await mongo.connect();
const pdb = mongo.db();
// With verification enforced, Better Auth answers duplicate-email signups
// with a no-op 200 (anti-enumeration: nothing persisted, no session).
// Verified live: echoed user object, count stays 1, no cookie.
const dupEmailCount = await pdb
  .collection("user")
  .countDocuments({ email: EMAIL.toLowerCase() });
check(
  "duplicate email → no-op 200, nothing persisted",
  dupEmail.status === 200 && dupEmailCount === 1,
  `got ${dupEmail.status}, count=${dupEmailCount}`
);
const userId = created.json?.user?.id;
const stats = userId ? await pdb.collection("profileStats").findOne({ userId }) : null;
check(
  "profileStats seeded (rating 1000, streaks, counters)",
  stats?.rating === 1000 &&
    stats?.xp === 0 &&
    stats?.level === 1 &&
    stats?.currentStreak === 0 &&
    stats?.longestStreak === 0 &&
    stats?.solvedCount === 0 &&
    stats?.attemptCount === 0,
  JSON.stringify(stats)
);

const wrongPass = await post("/auth/login", { email: EMAIL, password: "wrong-password-1" });
check("wrong password → 401", wrongPass.status === 401, `got ${wrongPass.status}`);

const login = await post("/auth/login", { email: EMAIL, password: PASS });
check("login succeeds", login.status === 200, `got ${login.status} ${JSON.stringify(login.json)}`);

const resend = await post("/api/auth/send-verification-email", { email: EMAIL, callbackURL: "/" });
check("resend endpoint always 200", resend.status === 200, `got ${resend.status}`);

const me = await fetch(`${BASE}/auth/me`, {
  headers: login.cookie ? { Cookie: login.cookie } : {},
}).then((r) => r.json());
check(
  "/auth/me resolves sanitized user + stats",
  me?.user?.email === EMAIL && me?.user?.username === USER && me?.stats?.rating === 1000,
  JSON.stringify(me)?.slice(0, 200)
);

const meAliased = await fetch(`${BASE}/api/auth/me`, {
  headers: login.cookie ? { Cookie: login.cookie } : {},
}).then((r) => r.json());
check("/api/auth/me alias works", meAliased?.user?.email === EMAIL);

// ── Profile surface (PRD §6 / §28) ──
const patchBadRes = await fetch(`${BASE}/users/me`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: login.cookie ?? "" },
  body: JSON.stringify({ githubUrl: "not-a-url" }),
});
check("profile rejects bad github URL (422)", patchBadRes.status === 422, `got ${patchBadRes.status}`);

const patchRes = await fetch(`${BASE}/users/me`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: login.cookie ?? "" },
  body: JSON.stringify({
    displayName: "Smoke Tester",
    bio: "Breaks things on purpose.",
    website: "example.com",
    githubUrl: "https://github.com/smoketester",
    interests: ["backend", "security"],
    preferredLanguages: ["typescript"],
  }),
}).then((r) => r.json().then((json) => ({ status: r.status, json })));
check(
  "profile PATCH saves + normalizes URLs",
  patchRes.status === 200 &&
    patchRes.json?.user?.displayName === "Smoke Tester" &&
    patchRes.json?.user?.website === "https://example.com" &&
    patchRes.json?.stats?.preferredLanguages?.includes("typescript"),
  `got ${patchRes.status} ${JSON.stringify(patchRes.json)?.slice(0, 160)}`
);

const pub = await fetch(`${BASE}/users/${USER}`).then((r) =>
  r.json().then((json) => ({ status: r.status, json }))
);
check(
  "public profile hides email, shows PRD fields",
  pub.status === 200 &&
    pub.json?.user?.email === undefined &&
    pub.json?.user?.username === USER &&
    pub.json?.user?.bio === "Breaks things on purpose." &&
    typeof pub.json?.stats?.rating === "number",
  `got ${pub.status}`
);

const missing = await fetch(`${BASE}/users/does_not_exist_zzz`).then((r) => r.status);
check("unknown profile → 404", missing === 404, `got ${missing}`);

// Avatar: 1×1 PNG. 503 while Appwrite is unconfigured, 200 + URL once live.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const form = new FormData();
form.append("avatar", new Blob([png], { type: "image/png" }), "avatar.png");
const avatarRes = await fetch(`${BASE}/users/me/avatar`, {
  method: "POST",
  headers: { Cookie: login.cookie ?? "" },
  body: form,
});
const avatarJson = await avatarRes.json().catch(() => null);
check(
  "avatar upload: 503 unconfigured OR 200 with URL",
  (avatarRes.status === 503 && /not configured/.test(avatarJson?.error ?? "")) ||
    (avatarRes.status === 200 && /^https?:\/\//.test(avatarJson?.avatarUrl ?? "")),
  `got ${avatarRes.status} ${JSON.stringify(avatarJson)}`
);

const onboard = await post(
  "/users/me/onboarding",
  { displayName: "Smoke Tester" },
  login.cookie
);
check(
  "onboarding completes + stamps flag",
  onboard.status === 200 && onboard.json?.user?.onboardingCompleted === true,
  `got ${onboard.status} ${JSON.stringify(onboard.json?.user)?.slice(0, 120)}`
);

const forgot = await post("/auth/forgot-password", { email: EMAIL });
check("forgot-password generic success", forgot.status === 200 && forgot.json?.status === true, `got ${forgot.status}`);

// Reset link is the frontend URL itself (?token=) — parse it directly.
const outbox2 = await get(`/auth/dev/outbox?email=${encodeURIComponent(EMAIL)}`);
const resetUrl = outbox2.json?.items?.find((i) => i.kind === "password-reset")?.url;
const resetToken = resetUrl ? new URL(resetUrl).searchParams.get("token") : null;
check("reset link carries token", !!resetToken, resetUrl ?? "no url");
if (resetToken) {
  const reset = await post("/auth/reset-password", { token: resetToken, password: NEW_PASS });
  check("reset-password accepts token", reset.status === 200, `got ${reset.status}`);
  const loginNew = await post("/auth/login", { email: EMAIL, password: NEW_PASS });
  check("login succeeds with new password", loginNew.status === 200, `got ${loginNew.status}`);
}

const logout = await post("/auth/logout", undefined, login.cookie);
check("logout succeeds", logout.status === 200, `got ${logout.status}`);


// ── Challenge catalog (PRD §7 / §20) ──
const catalog = await get("/challenges");
check(
  "catalog lists published (no hidden data)",
  catalog.status === 200 &&
    catalog.json?.total >= 5 &&
    catalog.json?.items?.every(
      (c) => c.hiddenTests === undefined && c.starterFiles === undefined && typeof c.excerpt === "string"
    ),
  `got ${catalog.status} total=${catalog.json?.total}`
);

const easy = await get("/challenges?difficulty=easy");
check("filter by difficulty", easy.status === 200 && easy.json?.total >= 6, `got ${easy.status} total=${easy.json?.total}`);

const backend = await get("/challenges?category=backend");
check("filter by category", backend.status === 200 && backend.json?.total >= 2, `got ${backend.status} total=${backend.json?.total}`);

const search = await get("/challenges?q=binary");
check(
  "keyword search",
  search.status === 200 && search.json?.total === 1 && search.json?.items?.[0]?.slug === "blind-spot-binary-search",
  `got ${search.status} total=${search.json?.total}`
);

const py = await get("/challenges?language=Python");
check("filter by language", py.status === 200 && py.json?.total >= 2, `got ${py.status} total=${py.json?.total}`);

const newbies = await get("/challenges?category=newbies");
check("newbies category", newbies.status === 200 && newbies.json?.total >= 4, `got ${newbies.status} total=${newbies.json?.total}`);

const sorted = await get("/challenges?sort=newest");
check("sort newest", sorted.status === 200 && sorted.json?.items?.length > 0, `got ${sorted.status}`);

const detail = await get("/challenges/off-by-one-cart-total");
check(
  "detail serves files + visible tests, strips hidden",
  detail.status === 200 &&
    detail.json?.challenge?.starterFiles?.length === 1 &&
    detail.json?.challenge?.visibleTests?.length === 2 &&
    detail.json?.challenge?.hiddenTests === undefined,
  `got ${detail.status}`
);

const ghost = await get("/challenges/does-not-exist");
check("unknown slug → 404", ghost.status === 404, `got ${ghost.status}`);

// ── Challenge admin (PRD §22, RBAC) ──
const ADMIN_EMAIL = `admin_${TAG}@gmail.com`;
const adminCreated = await post("/auth/register", {
  email: ADMIN_EMAIL,
  password: PASS,
  username: `a_${TAG}`.slice(0, 20),
});
check("admin account verifies", await verifyEmail(ADMIN_EMAIL));
const adminCookie = adminCreated.cookie;
const anonAdmin = await get("/admin/challenges");
check("admin list without session → 401", anonAdmin.status === 401, `got ${anonAdmin.status}`);
// NOTE: login.cookie is stale here (password rotated + logged out above),
// so re-login as the plain USER for the 403 check.
const userReLogin = await post("/auth/login", { email: EMAIL, password: NEW_PASS });
const userAdmin = await get("/admin/challenges", userReLogin.cookie);
check("admin list as USER → 403", userAdmin.status === 403, `got ${userAdmin.status}`);

// Promote directly (what scripts/make-admin.js does).
await pdb.collection("user").updateOne(
  { email: ADMIN_EMAIL.toLowerCase() },
  { $set: { roles: ["ADMIN"], updatedAt: new Date() } }
);
const reLogin = await post("/auth/login", { email: ADMIN_EMAIL, password: PASS });
const GodCookie = reLogin.cookie;

const adminList = await get("/admin/challenges", GodCookie);
check(
  "admin list includes hidden tests",
  adminList.status === 200 &&
    adminList.json?.items?.length >= 5 &&
    adminList.json?.items?.every((c) => Array.isArray(c.hiddenTests)),
  `got ${adminList.status}`
);

const badChallenge = await post("/admin/challenges", { title: "x" }, GodCookie);
check("admin create validates (422)", badChallenge.status === 422, `got ${badChallenge.status}`);

const draft = await post(
  "/admin/challenges",
  {
    title: "Smoke Draft",
    description: "A draft that the public must never see until published.",
    language: "javascript",
    difficulty: "easy",
    category: "general",
    entryFile: "a.js",
    entryFunction: "a",
    starterFiles: [{ path: "a.js", content: "export const a = 1;\n" }],
    visibleTests: [{ name: "works", input: [[]], expected: [] }],
  },
  GodCookie
);
check("admin create draft (201)", draft.status === 201 && draft.json?.challenge?.status === "draft", `got ${draft.status}`);
const draftId = draft.json?.challenge?.id;
const draftSlug = draft.json?.challenge?.slug;

const beforePublish = await get(`/challenges/${draftSlug}`);
check("draft hidden from public", beforePublish.status === 404, `got ${beforePublish.status}`);

const patched = await fetch(`${BASE}/admin/challenges/${draftId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: GodCookie ?? "" },
  body: JSON.stringify({ description: "Updated description for version bump." }),
}).then((r) => r.json().then((json) => ({ status: r.status, json })));
check(
  "admin PATCH bumps version on content edit",
  patched.status === 200 && patched.json?.challenge?.version === 2,
  `got ${patched.status}`
);

const published = await post(`/admin/challenges/${draftId}/publish`, undefined, GodCookie);
check("admin publish", published.status === 200 && published.json?.challenge?.status === "published", `got ${published.status}`);

const afterPublish = await get(`/challenges/${draftSlug}`);
check("published draft goes public", afterPublish.status === 200, `got ${afterPublish.status}`);

const unpublished = await post(`/admin/challenges/${draftId}/unpublish`, undefined, GodCookie);
check("admin unpublish", unpublished.status === 200, `got ${unpublished.status}`);

const deleted = await fetch(`${BASE}/admin/challenges/${draftId}`, {
  method: "DELETE",
  headers: { Cookie: GodCookie ?? "" },
}).then((r) => r.status);
check("admin delete", deleted === 200, `got ${deleted}`);

// ── Visible-test execution (queue + workers) ──
// NOTE: requires a worker process (bun workers/runner.js) alongside the API.
const anonRun = await post("/challenges/off-by-one-cart-total/run", {
  files: [{ path: "cart.js", content: "export function cartTotal(){return 0;}\n" }],
});
check("run without session → 401", anonRun.status === 401, `got ${anonRun.status}`);

const runAuth = await post("/auth/login", { email: EMAIL, password: NEW_PASS });
const runCookie = runAuth.cookie;

const badFiles = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "evil.js", content: "x" }] },
  runCookie
);
check("run unknown file → 422", badFiles.status === 422, `got ${badFiles.status}`);

async function waitRun(id, cookie, timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    const r = await get(`/runs/${id}`, cookie);
    const st = r.json?.run?.status;
    if (st && st !== "queued" && st !== "running") return r.json.run;
    if (Date.now() - start > timeoutMs) return { status: "POLL-TIMEOUT" };
    await new Promise((r) => setTimeout(r, 500));
  }
}

const cartDetail = await get("/challenges/off-by-one-cart-total");
const cartStarter = cartDetail.json?.challenge?.starterFiles?.[0]?.content ?? "";

const brokenRun = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "cart.js", content: cartStarter }] },
  runCookie
);
check("run enqueues (202)", brokenRun.status === 202 && !!brokenRun.json?.runId, `got ${brokenRun.status}`);
const broken = brokenRun.json?.runId ? await waitRun(brokenRun.json.runId, runCookie) : null;
check(
  "broken code fails visible tests (0/2)",
  broken?.status === "failed" && broken?.testsPassed === 0 && broken?.testsTotal === 2,
  `got ${broken?.status} ${broken?.testsPassed}/${broken?.testsTotal}`
);

const fixedCode = `export function cartTotal(prices) {
  let total = 0;
  for (let i = 0; i < prices.length; i++) total += prices[i];
  return total;
}
`;
const fixedRun = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "cart.js", content: fixedCode }] },
  runCookie
);
const fixed = fixedRun.json?.runId ? await waitRun(fixedRun.json.runId, runCookie) : null;
check(
  "fixed code passes (2/2)",
  fixed?.status === "passed" && fixed?.testsPassed === 2,
  `got ${fixed?.status} ${fixed?.testsPassed}/${fixed?.testsTotal}`
);

const loopRun = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "cart.js", content: "export function cartTotal(){ while(true){} }\n" }] },
  runCookie
);
const looped = loopRun.json?.runId ? await waitRun(loopRun.json.runId, runCookie, 15000) : null;
check("infinite loop → timeout", looped?.status === "timeout", `got ${looped?.status}`);

const syntaxRun = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "cart.js", content: "export function( {\n" }] },
  runCookie
);
const syntaxed = syntaxRun.json?.runId ? await waitRun(syntaxRun.json.runId, runCookie) : null;
check("syntax error → runtime-error", syntaxed?.status === "runtime-error", `got ${syntaxed?.status}`);

const pyDetail = await get("/challenges/watch-your-step-greet");
const pyStarter = pyDetail.json?.challenge?.starterFiles?.[0]?.content ?? "";
const pyRun = await post(
  "/challenges/watch-your-step-greet/run",
  { files: [{ path: "greet.py", content: pyStarter }] },
  runCookie
);
const pyRes = pyRun.json?.runId ? await waitRun(pyRun.json.runId, runCookie) : null;
check(
  "Python IndentationError → runtime-error",
  pyRes?.status === "runtime-error" && /indent/i.test(pyRes?.error ?? ""),
  `got ${pyRes?.status}`
);

const pyFixed = await post(
  "/challenges/watch-your-step-greet/run",
  { files: [{ path: "greet.py", content: 'def greet(name):\n    return "Hello, " + name + "!"\n' }] },
  runCookie
);
const pyFixedRes = pyFixed.json?.runId ? await waitRun(pyFixed.json.runId, runCookie) : null;
check(
  "fixed Python passes (1/1)",
  pyFixedRes?.status === "passed" && pyFixedRes?.testsPassed === 1,
  `got ${pyFixedRes?.status}`
);

const stranger = await get(`/runs/${fixedRun.json?.runId}`, GodCookie);
check("admin can read any run", stranger.status === 200, `got ${stranger.status}`);
// Fresh plain user (non-owner, non-admin) must not see the run at all.
const plainEmail = `plain_${TAG}@gmail.com`;
await post("/auth/register", { email: plainEmail, password: PASS, username: `p_${TAG}`.slice(0, 20) });
await verifyEmail(plainEmail);
const plainLogin = await post("/auth/login", { email: plainEmail, password: PASS });
const snooped = await get(`/runs/${fixedRun.json?.runId}`, plainLogin.cookie);
check("non-owner cannot read run (404)", snooped.status === 404, `got ${snooped.status}`);

// ── Hidden judging + submissions (PRD §11–§14) ──
async function waitSubmission(id, cookie, timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    const r = await get(`/submissions/${id}`, cookie);
    const st = r.json?.submission?.status;
    if (st && st !== "pending") return r.json.submission;
    if (Date.now() - start > timeoutMs) return { status: "POLL-TIMEOUT" };
    await new Promise((r) => setTimeout(r, 500));
  }
}

const anonSubmit = await post("/challenges/off-by-one-cart-total/submit", {
  files: [{ path: "cart.js", content: fixedCode }],
});
check("submit without session → 401", anonSubmit.status === 401, `got ${anonSubmit.status}`);

const submitBroken = await post(
  "/challenges/off-by-one-cart-total/submit",
  { files: [{ path: "cart.js", content: cartStarter }] },
  runCookie
);
check("submit enqueues (202)", submitBroken.status === 202 && !!submitBroken.json?.submissionId, `got ${submitBroken.status}`);
const rejected = submitBroken.json?.submissionId
  ? await waitSubmission(submitBroken.json.submissionId, runCookie)
  : null;
check(
  "broken code rejected, score 0, -2 rating",
  rejected?.status === "rejected" && rejected?.score === 0 && rejected?.ratingDelta === -2,
  `got ${rejected?.status} score=${rejected?.score} delta=${rejected?.ratingDelta}`
);

const submitFixed = await post(
  "/challenges/off-by-one-cart-total/submit",
  { files: [{ path: "cart.js", content: fixedCode }] },
  runCookie
);
const accepted = submitFixed.json?.submissionId
  ? await waitSubmission(submitFixed.json.submissionId, runCookie)
  : null;
const breakdown = accepted?.scoreBreakdown;
check(
  "fixed code accepted with PRD breakdown + first-solve XP",
  accepted?.status === "accepted" &&
    accepted?.score >= 90 &&
    accepted?.score === breakdown?.correctness + breakdown?.efficiency + breakdown?.speed + breakdown?.quality &&
    accepted?.xpAwarded === 50 &&
    accepted?.ratingDelta > 0,
  `got ${accepted?.status} score=${accepted?.score} xp=${accepted?.xpAwarded} delta=${accepted?.ratingDelta}`
);
check(
  "hidden results leak-proof (names only)",
  Array.isArray(accepted?.results) &&
    accepted.results.length === 3 &&
    accepted.results.every((r) => r.input === undefined && r.expected === undefined && r.actual === undefined),
  JSON.stringify(accepted?.results)?.slice(0, 160)
);
// First accept on attempt 2 (easy): first-fix only (+25), no clean-shot.
check(
  "first accept unlocks first-fix (+25 XP)",
  accepted?.achievementXp === 25 &&
    accepted?.achievementsUnlocked?.length === 1 &&
    accepted?.achievementsUnlocked?.[0]?.key === "first-fix",
  JSON.stringify(accepted?.achievementsUnlocked)?.slice(0, 160)
);

const afterStats = await get("/users/me", runCookie);
check(
  "stats settled (rating/xp/solved/streak)",
  afterStats.json?.stats?.xp === 75 &&
    afterStats.json?.stats?.solvedCount === 1 &&
    afterStats.json?.stats?.currentStreak === 1 &&
    afterStats.json?.stats?.successRate === 0.5 &&
    afterStats.json?.user?.onboardingCompleted !== undefined,
  JSON.stringify(afterStats.json?.stats)?.slice(0, 200)
);
check(
  "achievements ride on /users/me",
  afterStats.json?.achievements?.length === 1 &&
    afterStats.json?.achievements?.[0]?.key === "first-fix",
  JSON.stringify(afterStats.json?.achievements)?.slice(0, 160)
);

const achCatalog = await get("/achievements");
check(
  "achievement catalog lists 8 with XP",
  achCatalog.status === 200 &&
    achCatalog.json?.achievements?.length === 8 &&
    achCatalog.json?.achievements?.every((a) => a.xp === 25),
  `got ${achCatalog.status}`
);

const resubmit = await post(
  "/challenges/off-by-one-cart-total/submit",
  { files: [{ path: "cart.js", content: fixedCode }] },
  runCookie
);
check(
  "solved challenge locked (submit → 403)",
  resubmit.status === 403 && /already solved/i.test(JSON.stringify(resubmit.json)),
  `got ${resubmit.status}`
);
const rerun = await post(
  "/challenges/off-by-one-cart-total/run",
  { files: [{ path: "cart.js", content: fixedCode }] },
  runCookie
);
check(
  "solved challenge locked (run → 403)",
  rerun.status === 403,
  `got ${rerun.status}`
);
const solvedDetail = await get("/challenges/off-by-one-cart-total", runCookie);
check(
  "detail reports solved + accepted snapshot",
  solvedDetail.json?.challenge?.solved === true &&
    Array.isArray(solvedDetail.json?.challenge?.solution?.files) &&
    solvedDetail.json.challenge.solution.files.length === 1,
  `got solved=${solvedDetail.json?.challenge?.solved}`
);
const solvedList = await get("/challenges?q=off-by-one", runCookie);
check(
  "catalog reports solved",
  solvedList.json?.items?.[0]?.solved === true,
  `got solved=${solvedList.json?.items?.[0]?.solved}`
);
const afterRepeat = await get("/users/me", runCookie);
check(
  "locked: xp and solved unchanged",
  afterRepeat.json?.stats?.solvedCount === 1 && afterRepeat.json?.stats?.xp === 75,
  `xp=${afterRepeat.json?.stats?.xp} solved=${afterRepeat.json?.stats?.solvedCount}`
);

const pubAch = await fetch(`${BASE}/users/${USER}`).then((r) =>
  r.json().then((json) => ({ status: r.status, json }))
);
check(
  "public profile exposes achievements",
  pubAch.status === 200 &&
    pubAch.json?.achievements?.length === 1 &&
    pubAch.json?.achievements?.[0]?.key === "first-fix",
  `got ${pubAch.status}`
);

const global = await get("/leaderboard/global?limit=50");
check(
  "global leaderboard ranks by rating",
  global.status === 200 && global.json?.entries?.some((e) => e.username === USER && e.rank === "Bronze"),
  `got ${global.status}`
);
const weekly = await get("/leaderboard/weekly?limit=50");
check(
  "weekly leaderboard tracks progression",
  weekly.status === 200 && weekly.json?.entries?.some((e) => e.username === USER && e.solves >= 1),
  `got ${weekly.status}`
);

const history = await get("/users/me/submissions", runCookie);
check(
  "submission history lists own submits",
  history.status === 200 && history.json?.total >= 2,
  `got ${history.status} total=${history.json?.total}`
);

const subSnoop = await get(`/submissions/${submitFixed.json?.submissionId}`, plainLogin.cookie);
check("non-owner cannot read submission (404)", subSnoop.status === 404, `got ${subSnoop.status}`);
const subAdmin = await get(`/submissions/${submitFixed.json?.submissionId}`, GodCookie);
check("admin can read submission", subAdmin.status === 200, `got ${subAdmin.status}`);

await mongo.close();
console.log(failures === 0 ? "\nSMOKE PASS" : `\nSMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
