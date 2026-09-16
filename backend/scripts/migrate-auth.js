/**
 * One-off: migrate off Better Auth to the hand-rolled session system.
 *
 *   1. Copies credential password hashes (account.providerId ==
 *      "credential") onto user.passwordHash. The hash format
 *      (scrypt N=16384/r=16/p=1, `salt:derived`) verifies with the same
 *      node:crypto code, so NOBODY needs a password reset. First login
 *      transparently re-hashes to the current format.
 *   2. Backfills usernames for pre-bridge OAuth accounts that lack one.
 *   3. Drops the dead Better Auth collections (account, session,
 *      verification). Everyone re-logs-in once — sessions don't migrate.
 *
 * Usage: bun scripts/migrate-auth.js [--dry-run]
 * Run against production ONCE at deploy time (MONGODB_URI=...), then
 * retire this script. Safe to re-run: every step skips finished work.
 */
import { MongoClient, ObjectId } from "mongodb";
import { socialUsernameBase, uniqueUsername } from "../src/lib/usernames.js";

const DRY = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/Nox";

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const users = db.collection("user");

function toId(v) {
  try {
    return new ObjectId(String(v));
  } catch {
    return null;
  }
}

// ── 1. password hashes ──
const creds = await db
  .collection("account")
  .find({ providerId: "credential" })
  .project({ userId: 1, password: 1 })
  .toArray()
  .catch(() => []);
let copied = 0;
let skipped = 0;
for (const acc of creds) {
  const id = toId(acc.userId);
  if (!id || typeof acc.password !== "string") {
    skipped += 1;
    continue;
  }
  const res = DRY
    ? { modifiedCount: 0 }
    : await users.updateOne(
        { _id: id, passwordHash: { $exists: false } },
        { $set: { passwordHash: acc.password, updatedAt: new Date() } }
      );
  // Dry run counts would-be writes by checking current state instead.
  if (DRY) {
    const u = await users.findOne(
      { _id: id, passwordHash: { $exists: false } },
      { projection: { _id: 1 } }
    );
    if (u) copied += 1;
    else skipped += 1;
  } else if (res.modifiedCount === 1) {
    copied += 1;
  } else {
    skipped += 1;
  }
}
console.log(`[migrate] passwords: ${copied} copied, ${skipped} skipped${DRY ? " (dry run)" : ""}`);

// ── 2. missing usernames (pre-bridge OAuth accounts) ──
const nameless = await users
  .find({ $or: [{ username: { $exists: false } }, { username: null }] })
  .project({ email: 1, name: 1, displayName: 1 })
  .toArray()
  .catch(() => []);
let named = 0;
for (const u of nameless) {
  const handle = await uniqueUsername(
    db,
    socialUsernameBase(u.displayName ?? u.name, u.email)
  );
  if (!DRY) {
    await users.updateOne(
      { _id: u._id },
      { $set: { username: handle, displayName: u.displayName ?? u.name ?? handle, updatedAt: new Date() } }
    );
  }
  named += 1;
}
console.log(`[migrate] usernames: ${named} backfilled${DRY ? " (dry run)" : ""}`);

// ── 3. dead collections ──
if (DRY) {
  for (const c of ["account", "session", "verification"]) {
    const n = await db.collection(c).countDocuments({}).catch(() => 0);
    console.log(`[migrate] drop ${c}: ${n} doc(s) would go (dry run)`);
  }
} else {
  for (const c of ["account", "session", "verification"]) {
    await db.collection(c).drop().catch(() => {});
    console.log(`[migrate] dropped ${c}`);
  }
}

await client.close();
console.log(DRY ? "[migrate] dry run — no writes" : "[migrate] done");
