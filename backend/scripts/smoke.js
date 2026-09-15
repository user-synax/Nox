/**
 * Nox API smoke test — full loop against a running API (default :4000).
 * Usage: bun scripts/smoke.js [baseUrl]
 *
 * Covers auth (verification DISABLED, direct signup), profile surface,
 * and the challenge catalog + admin API (PRD §7 / §20 / §22 / §29).
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
  "register signs straight in (session cookie, no verification)",
  !!created.cookie && created.json?.user?.emailVerified !== undefined,
  `cookie=${!!created.cookie}`
);

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
check("login works immediately, no verification", immediateLogin.status === 200, `got ${immediateLogin.status}`);

const mongo = new MongoClient("mongodb://127.0.0.1:27017/Nox");
await mongo.connect();
const pdb = mongo.db();
// Verification disabled → no anti-enumeration veil: a taken email is a
// plain 422 and nothing new is persisted.
const dupEmailCount = await pdb
  .collection("user")
  .countDocuments({ email: EMAIL.toLowerCase() });
check(
  "duplicate email → 422, nothing persisted",
  dupEmail.status === 422 && dupEmailCount === 1,
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

// Reset link → 302 to frontend with ?token= → POST alias consumes it.
const outbox2 = await get(`/auth/dev/outbox?email=${encodeURIComponent(EMAIL)}`);
const resetUrl = outbox2.json?.items?.find((i) => i.kind === "password-reset")?.url;
const resetRes = resetUrl ? await fetch(resetUrl, { redirect: "manual" }) : null;
const location = resetRes?.headers.get("location");
const resetToken = location ? new URL(location).searchParams.get("token") : null;
check("reset link redirects with token", !!resetToken, location ?? "no location");
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
check("filter by difficulty", easy.status === 200 && easy.json?.total === 2, `got ${easy.status} total=${easy.json?.total}`);

const backend = await get("/challenges?category=backend");
check("filter by category", backend.status === 200 && backend.json?.total === 2, `got ${backend.status} total=${backend.json?.total}`);

const search = await get("/challenges?q=binary");
check(
  "keyword search",
  search.status === 200 && search.json?.total === 1 && search.json?.items?.[0]?.slug === "blind-spot-binary-search",
  `got ${search.status} total=${search.json?.total}`
);

const py = await get("/challenges?language=Python");
check("empty filter set", py.status === 200 && py.json?.total === 0 && Array.isArray(py.json?.items), `got ${py.status}`);

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

await mongo.close();
console.log(failures === 0 ? "\nSMOKE PASS" : `\nSMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
