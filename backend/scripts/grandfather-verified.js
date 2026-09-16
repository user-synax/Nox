/**
 * One-off: mark pre-enforcement accounts as verified.
 *
 * Context: email verification enforcement shipped after alpha accounts
 * already existed. Those users signed up when no verification was
 * required, so locking them out with a 403 would punish early adopters.
 * New signups must verify (requireEmailVerification: true in src/auth.js).
 *
 * Usage: bun scripts/grandfather-verified.js [--dry-run]
 * Run against production ONCE at deploy time, then retire this script.
 */
import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/Nox";

const client = new MongoClient(uri);
await client.connect();
const users = client.db().collection("user");

const pending = await users.countDocuments({ emailVerified: { $ne: true } });
console.log(`[grandfather] ${pending} account(s) unverified${DRY ? " (dry run — no writes)" : ""}`);

if (!DRY && pending > 0) {
  const res = await users.updateMany(
    { emailVerified: { $ne: true } },
    { $set: { emailVerified: true, updatedAt: new Date() } }
  );
  console.log(`[grandfather] marked ${res.modifiedCount} account(s) verified`);
}

await client.close();
