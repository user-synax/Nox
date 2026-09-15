/**
 * Curated MVP challenge seeds — 5 real JavaScript debugging challenges.
 * Usage: bun scripts/seed-challenges.js [--author email]
 *
 * Upserts by slug (safe to re-run). Test convention: each test's `input`
 * is the positional-args array, `expected` is the deep-equal return value
 * (async functions are awaited by the judge). A challenge description may
 * document extra judge-injected trailing args (e.g. a fake `db`).
 */

const CHALLENGES = [
  {
    title: "Off by One: Cart Total",
    slug: "off-by-one-cart-total", entryFile: "cart.js", entryFunction: "cartTotal",
    description: `The checkout page undercharges every order. Customers noticed before finance did.

\`cartTotal(prices)\` should return the sum of every price in the array. Right now the last item never gets counted — a single order of one item totals $0.

Reproduce it with the visible tests, find the boundary mistake, and fix it.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "algorithms",
    tags: ["arrays", "off-by-one", "loops"],
    starterFiles: [
      {
        path: "cart.js",
        content: `// Returns the total price of all items in the cart.
export function cartTotal(prices) {
  let total = 0;
  for (let i = 0; i < prices.length - 1; i++) {
    total += prices[i];
  }
  return total;
}
`,
      },
    ],
    visibleTests: [
      { name: "sums several prices", input: [[1, 2, 3, 4]], expected: 10 },
      { name: "single item cart", input: [[5]], expected: 5 },
    ],
    hiddenTests: [
      { name: "empty cart", input: [[]], expected: 0 },
      { name: "refunds and discounts", input: [[10, -3, 2.5]], expected: 9.5 },
      { name: "many items", input: [Array.from({ length: 100 }, (_, i) => i + 1)], expected: 5050 },
    ],
    constraints: "prices.length ≤ 10^5. Each price is a finite number.",
    hints: [
      "Walk the loop bounds with a 1-element array on paper.",
      "The last valid index is length - 1 — how far does i get?",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Falsy Trap: Compact IDs",
    slug: "falsy-trap-compact-ids", entryFile: "ids.js", entryFunction: "compactIds",
    description: `User ID 0 is a real user (the very first account), but they keep vanishing from admin lists.

\`compactIds(ids)\` should strip only null, undefined, and empty-string entries. Right now it treats 0 as missing too — JavaScript falsiness strikes again.

Fix the predicate so every real ID survives.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "easy",
    category: "general",
    tags: ["falsy", "arrays", "predicates"],
    starterFiles: [
      {
        path: "ids.js",
        content: `// Removes only null, undefined and "" entries.
// Every other value — including 0 — is a real ID and must be kept.
export function compactIds(ids) {
  return ids.filter((id) => {
    if (id) return true;
    return false;
  });
}
`,
      },
    ],
    visibleTests: [
      { name: "keeps zero", input: [[0, 1, 2]], expected: [0, 1, 2] },
      { name: "drops nullish and empty", input: [[null, 7, undefined, "", 9]], expected: [7, 9] },
    ],
    hiddenTests: [
      { name: "all missing", input: [[null, undefined, ""]], expected: [] },
      { name: "keeps false-like strings", input: [["0", "false", 0]], expected: ["0", "false", 0] },
      { name: "drops NaN too", input: [[NaN, 3]], expected: [3] },
    ],
    constraints: "ids.length ≤ 10^4. Entries are JSON values.",
    hints: [
      "List every falsy value in JavaScript — which ones must survive here?",
      "An explicit comparison beats a truthiness check for this filter.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Floating Promises: Batch Usernames",
    slug: "floating-promises-batch-usernames", entryFile: "users.js", entryFunction: "getUsernames", testContext: { db: "({ fetchUser: async (id) => { await new Promise((r) => setTimeout(r, Math.random() * 25)); return { name: \"abcde\"[id - 1] ?? (\"user\" + id) }; } })" },
    description: `The admin panel renders "[object Promise], [object Promise]" instead of usernames. Production is not amused.

\`getUsernames(ids, db)\` must resolve every id through \`db.fetchUser(id)\` (which returns a Promise of { name }) and return the names IN ORDER. Right now it hands back an array of unsettled promises.

Make the function actually wait for its work. Calling convention: tests invoke \`getUsernames(input[0], db)\` where \`db\` is injected by the judge — don't import or mock anything.`,
    kind: "runtime-error",
    language: "javascript",
    difficulty: "medium",
    category: "backend",
    tags: ["async", "promises", "await"],
    starterFiles: [
      {
        path: "users.js",
        content: `// Resolves each id via db.fetchUser(id) -> Promise<{ name }>.
// Returns the names in the same order as ids.
export function getUsernames(ids, db) {
  const users = ids.map((id) => db.fetchUser(id));
  return users.map((u) => u.name);
}
`,
      },
    ],
    visibleTests: [
      {
        name: "resolves two users in order",
        description: "db.fetchUser resolves { name } per id; ids map to letters a–e.",
        input: [[3, 1]],
        expected: ["c", "a"],
      },
    ],
    hiddenTests: [
      { name: "empty batch", input: [[]], expected: [] },
      { name: "order is stable under latency", input: [[5, 2, 4, 1, 3]], expected: ["e", "b", "d", "a", "c"] },
    ],
    constraints: "ids.length ≤ 100. fetchUser latency is simulated and unordered.",
    hints: [
      "What is the type of `users[0]` right now? Log it.",
      "Mapping to promises is fine — the waiting part is what's missing.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Reference Trap: Dedupe Users",
    slug: "reference-trap-dedupe-users", entryFile: "roster.js", entryFunction: "dedupeUsers",
    description: `The team roster shows the same person three times. The dedupe helper runs, changes nothing, and everyone blames the database.

\`dedupeUsers(users)\` should drop repeat appearances of the same id, keeping the FIRST occurrence and the original order. Right now it relies on reference equality, so two objects with the same id look "different".

Dedupe by id, not by reference.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "medium",
    category: "backend",
    tags: ["objects", "set", "equality"],
    starterFiles: [
      {
        path: "roster.js",
        content: `// Removes repeat appearances of the same user id.
// Keeps the first occurrence, preserves order.
export function dedupeUsers(users) {
  return [...new Set(users)];
}
`,
      },
    ],
    visibleTests: [
      {
        name: "drops repeat ids",
        input: [[{ id: 1, name: "ada" }, { id: 2, name: "grace" }, { id: 1, name: "ada (old)" }]],
        expected: [{ id: 1, name: "ada" }, { id: 2, name: "grace" }],
      },
      {
        name: "no repeats stays identical",
        input: [[{ id: 1 }, { id: 2 }]],
        expected: [{ id: 1 }, { id: 2 }],
      },
    ],
    hiddenTests: [
      { name: "empty roster", input: [[]], expected: [] },
      {
        name: "keeps first occurrence data",
        input: [[{ id: 7, role: "admin" }, { id: 7, role: "user" }, { id: 8, role: "user" }]],
        expected: [{ id: 7, role: "admin" }, { id: 8, role: "user" }],
      },
      {
        name: "string ids work too",
        input: [[{ id: "a" }, { id: "b" }, { id: "a" }]],
        expected: [{ id: "a" }, { id: "b" }],
      },
    ],
    constraints: "users.length ≤ 10^4. Each entry has an id (number or string).",
    hints: [
      "Set compares object REFERENCES. When are two literals ever the same reference?",
      "Track the ids you have already emitted — in insertion order.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Blind Spot: Binary Search Bounds",
    slug: "blind-spot-binary-search", entryFile: "search.js", entryFunction: "binarySearch",
    description: `Search works — except when the answer sits at the edges. First and last elements of large sorted arrays come back "not found", and the on-call rotation is tired of it.

\`binarySearch(sorted, target)\` must return the index of target or -1. The loop quits one step too early, so boundary elements are never examined.

Fix the bounds. The loop must always terminate (no infinite loops — the judge enforces the time limit).`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "algorithms",
    tags: ["binary-search", "bounds", "loops"],
    starterFiles: [
      {
        path: "search.js",
        content: `// Returns the index of target in a sorted ascending array, or -1.
export function binarySearch(sorted, target) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
`,
      },
    ],
    visibleTests: [
      { name: "finds a middle element", input: [[1, 3, 5, 7, 9], 5], expected: 2 },
      { name: "finds the first element", input: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { name: "finds the last element", input: [[1, 3, 5, 7, 9], 9], expected: 4 },
      { name: "missing returns -1", input: [[1, 3, 5, 7, 9], 6], expected: -1 },
    ],
    hiddenTests: [
      { name: "single element hit", input: [[42], 42], expected: 0 },
      { name: "single element miss", input: [[42], 7], expected: -1 },
      { name: "two elements, find high", input: [[10, 20], 20], expected: 1 },
      { name: "empty array", input: [[], 1], expected: -1 },
      {
        name: "large array edges",
        input: [Array.from({ length: 1000 }, (_, i) => i * 2), 1998],
        expected: 999,
      },
    ],
    constraints: "sorted.length ≤ 10^5, ascending, distinct. Must terminate within the time limit.",
    hints: [
      "Trace lo/hi on a 1-element array — does the loop body ever run?",
      "Think about what must be true when the loop exits: which indices are still unchecked?",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 25,
    status: "published",
  },
  {
    title: "Stringly Typed: Add Scores",
    slug: "stringly-typed-add-scores",
    description: `The leaderboard total shows "53" instead of 8. Form values arrive as STRINGS, and JavaScript happily "adds" them by gluing.

\`addScores(a, b)\` must return the NUMERIC sum of its two arguments, whether they arrive as numbers or numeric strings.

Convert first, then add.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["types", "coercion", "numbers"],
    starterFiles: [
      {
        path: "scores.js",
        content: `// Adds two form values. Values may arrive as numbers or numeric
// strings — the result must always be a real number.
export function addScores(a, b) {
  return a + b;
}
`,
      },
    ],
    entryFile: "scores.js",
    entryFunction: "addScores",
    visibleTests: [
      { name: "adds numbers", input: [2, 3], expected: 5 },
      { name: "adds numeric strings", input: ["2", "3"], expected: 5 },
    ],
    hiddenTests: [
      { name: "mixed string and number", input: ["4", 6], expected: 10 },
      { name: "decimals", input: ["0.5", "0.25"], expected: 0.75 },
      { name: "zeroes", input: ["0", 0], expected: 0 },
    ],
    constraints: "Inputs are numbers or numeric strings.",
    hints: [
      "What does + do when either side is a string?",
      "There is a built-in that turns numeric strings into numbers.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Watch Your Step: Greet",
    slug: "watch-your-step-greet",
    description: `Nothing runs at all — Python refuses to even load the file. Read the error message: it tells you the exact line.

\`greet(name)\` should return "Hello, <name>!". Right now the return statement sits at the wrong indentation level, which is a hard error in Python, not a quirk.

Fix the indentation so the module loads and the function works.`,
    kind: "runtime-error",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "indentation", "syntax"],
    starterFiles: [
      {
        path: "greet.py",
        content: `def greet(name):
return "Hello, " + name + "!"
`,
      },
    ],
    entryFile: "greet.py",
    entryFunction: "greet",
    visibleTests: [
      { name: "greets Ada", input: ["Ada"], expected: "Hello, Ada!" },
    ],
    hiddenTests: [
      { name: "greets Grace", input: ["Grace"], expected: "Hello, Grace!" },
      { name: "empty name", input: [""], expected: "Hello, !" },
    ],
    constraints: "name is a string.",
    hints: [
      "In Python, indentation IS structure — a function body must sit one level in.",
      "Most editors can convert the fix to 4 spaces automatically.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Floor It: Average",
    slug: "floor-it-average",
    description: `Test scores average 1.5, but the report prints 1. Somewhere a division is rounding DOWN.

\`average(nums)\` should return the exact mean. Right now it uses floor division, which silently drops every fraction.

Pick the division that keeps the decimal part.`,
    kind: "logic-error",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "division", "numbers"],
    starterFiles: [
      {
        path: "stats.py",
        content: `def average(nums):
    return sum(nums) // len(nums)
`,
      },
    ],
    entryFile: "stats.py",
    entryFunction: "average",
    visibleTests: [
      { name: "even average", input: [[2, 4, 6]], expected: 4 },
      { name: "fractional average", input: [[1, 2]], expected: 1.5 },
    ],
    hiddenTests: [
      { name: "single score", input: [[5]], expected: 5 },
      { name: "long decimal", input: [[1, 2, 4]], expected: 2.3333333333333335 },
    ],
    constraints: "nums is a non-empty list of numbers.",
    hints: [
      "Python has two division operators. What does each one promise?",
      "// always rounds down — even when the math doesn't.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Nowhere to Return: Build User",
    slug: "nowhere-to-return-build-user",
    description: `The profile page shows a blank card. No crash, no error — the function just quietly hands back nothing.

\`buildUser(name)\` should return { name, role: "debugger" }. But return followed by a line break ends the statement early, and the object below becomes dead code.

Rejoin the return with its value.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["asi", "return", "objects"],
    starterFiles: [
      {
        path: "user.js",
        content: `// Builds a profile object for a new debugger.
export function buildUser(name) {
  return
  {
    name: name,
    role: "debugger",
  };
}
`,
      },
    ],
    entryFile: "user.js",
    entryFunction: "buildUser",
    visibleTests: [
      { name: "builds ada", input: ["ada"], expected: { name: "ada", role: "debugger" } },
    ],
    hiddenTests: [
      { name: "builds grace", input: ["grace"], expected: { name: "grace", role: "debugger" } },
      { name: "empty name still builds", input: [""], expected: { name: "", role: "debugger" } },
    ],
    constraints: "name is a string.",
    hints: [
      "JavaScript inserts semicolons where it thinks statements end. What did `return` + newline become?",
      "The opening brace must share the return's line.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
];

const args = process.argv.slice(2);
const authorFlag = args.indexOf("--author");
const authorEmail = authorFlag >= 0 ? args[authorFlag + 1]?.toLowerCase() : null;

const { MongoClient } = await import("mongodb");
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/Nox";
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const col = db.collection("challenges");

let authorId = "system";
if (authorEmail) {
  const author = await col.db
    .collection("user")
    .findOne({ email: authorEmail }, { projection: { _id: 1 } });
  if (!author) {
    console.error(`No user with email ${authorEmail}. Seed without --author, or create the user first.`);
    process.exit(1);
  }
  authorId = author._id.toString();
}

let created = 0;
let updated = 0;
for (const c of CHALLENGES) {
  const now = new Date();
  const result = await col.updateOne(
    { slug: c.slug },
    {
      $set: { ...c, authorId, version: 1, updatedAt: now },
      $setOnInsert: { solveCount: 0, attemptCount: 0, createdAt: now },
    },
    { upsert: true }
  );
  if (result.upsertedCount > 0) created += 1;
  else updated += 1;
  console.log(`  ${result.upsertedCount > 0 ? "created" : "updated"}  ${c.slug}`);
}

await client.close();
console.log(`\nSeed done: ${created} created, ${updated} updated.`);
