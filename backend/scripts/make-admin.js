/**
 * Grants a role to an existing user (RBAC bootstrap for challenge admins).
 * Usage: bun scripts/make-admin.js <email> [role]
 * Roles: MODERATOR | ADMIN (default) | FOUNDER
 */
const VALID_ROLES = ["MODERATOR", "ADMIN", "FOUNDER"];

const email = process.argv[2]?.toLowerCase();
const role = (process.argv[3] ?? "ADMIN").toUpperCase();

if (!email || !email.includes("@")) {
  console.error("Usage: bun scripts/make-admin.js <email> [MODERATOR|ADMIN|FOUNDER]");
  process.exit(1);
}
if (!VALID_ROLES.includes(role)) {
  console.error(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

const { MongoClient } = await import("mongodb");
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/Nox";
const client = new MongoClient(uri);
await client.connect();

const result = await client
  .db()
  .collection("user")
  .updateOne({ email }, { $set: { roles: [role], updatedAt: new Date() } });

await client.close();

if (result.matchedCount === 0) {
  console.error(`No user with email ${email}. Sign up first, then retry.`);
  process.exit(1);
}
console.log(`OK: ${email} is now ${role}.`);
