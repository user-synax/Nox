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
  // ── NEWBIES batch (10 × easy: JS + Python fundamentals) ──
  {
    title: "Capitalize First Letter",
    slug: "capitalize-first-letter",
    description: `New signups show as "ada" instead of "Ada". The profile card expects a capitalized display name.

\`capitalize(word)\` should upper-case the first character and keep the rest as-is. Right now it lower-cases the first character instead.

Fix the case conversion. Empty string stays empty.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["strings", "basics"],
    starterFiles: [
      {
        path: "capitalize.js",
        content: `// Uppercases the first character, keeps the rest as-is.
export function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toLowerCase() + word.slice(1);
}
`,
      },
    ],
    entryFile: "capitalize.js",
    entryFunction: "capitalize",
    visibleTests: [
      { name: "capitalizes ada", input: ["ada"], expected: "Ada" },
      { name: "capitalizes hello", input: ["hello"], expected: "Hello" },
    ],
    hiddenTests: [
      { name: "empty stays empty", input: [""], expected: "" },
      { name: "single letter", input: ["a"], expected: "A" },
      { name: "keeps the tail", input: ["aDA"], expected: "ADA" },
    ],
    constraints: "word is a string.",
    hints: [
      "Lower-casing the first letter does the opposite of the spec.",
      "There is a string method that upper-cases one character.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Is Even Check",
    slug: "is-even-check",
    description: `The "even rows" table filter highlights 3, 5, 7 instead of 2, 4, 6. Someone tested oddness and called it even.

\`isEven(n)\` should return true for even integers (including 0 and negatives). Right now it checks for a remainder of 1, which misses evens and negative odds.

Fix the remainder comparison.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["numbers", "modulo"],
    starterFiles: [
      {
        path: "even.js",
        content: `// True for even integers (0 and negatives count).
export function isEven(n) {
  return n % 2 === 1;
}
`,
      },
    ],
    entryFile: "even.js",
    entryFunction: "isEven",
    visibleTests: [
      { name: "4 is even", input: [4], expected: true },
      { name: "3 is odd", input: [3], expected: false },
    ],
    hiddenTests: [
      { name: "zero is even", input: [0], expected: true },
      { name: "negative even", input: [-2], expected: true },
      { name: "negative odd", input: [-3], expected: false },
    ],
    constraints: "n is an integer.",
    hints: [
      "What does -3 % 2 give in JavaScript? It is not 1.",
      "Even means the remainder after dividing by 2 is zero.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Count Vowels, All Cases",
    slug: "count-vowels-basic",
    description: `The essay scorer counts "hello" fine but scores "AEIOU" as zero vowels. Uppercase letters are invisible to it.

\`countVowels(s)\` should count a, e, i, o, u in either case. Right now it only matches lowercase.

Normalize the case before checking.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["strings", "loops"],
    starterFiles: [
      {
        path: "vowels.js",
        content: `// Counts vowels (a, e, i, o, u) in any case.
export function countVowels(s) {
  let count = 0;
  for (const ch of s) {
    if ("aeiou".includes(ch)) count++;
  }
  return count;
}
`,
      },
    ],
    entryFile: "vowels.js",
    entryFunction: "countVowels",
    visibleTests: [
      { name: "lowercase mix", input: ["hello"], expected: 2 },
      { name: "all uppercase", input: ["AEIOU"], expected: 5 },
    ],
    hiddenTests: [
      { name: "empty string", input: [""], expected: 0 },
      { name: "no vowels", input: ["bcdfg"], expected: 0 },
      { name: "mixed case", input: ["AaEe"], expected: 4 },
    ],
    constraints: "s is a string.",
    hints: [
      "Compare like with like: convert each character before the lookup.",
      "One string method makes the whole check case-insensitive.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Double Each Number",
    slug: "double-each-list",
    description: `The cart promises "double points" but adds 2 instead of doubling. 5 points becomes 7, not 10.

\`double_all(nums)\` should return a new list with every number multiplied by 2. Right now it adds 2.

Multiply instead of adding.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "lists"],
    starterFiles: [
      {
        path: "double.py",
        content: `def double_all(nums):
    return [n + 2 for n in nums]
`,
      },
    ],
    entryFile: "double.py",
    entryFunction: "double_all",
    visibleTests: [
      { name: "doubles small list", input: [[1, 2, 3]], expected: [2, 4, 6] },
      { name: "zero stays zero", input: [[0]], expected: [0] },
    ],
    hiddenTests: [
      { name: "empty list", input: [[]], expected: [] },
      { name: "negatives", input: [[-1, 5]], expected: [-2, 10] },
    ],
    constraints: "nums is a list of numbers.",
    hints: [
      "Adding 2 and multiplying by 2 agree on exactly one input. Which one?",
      "Change the arithmetic operator inside the comprehension.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Is Positive Check",
    slug: "is-positive-check",
    description: `The finance filter marks a $0 balance as "positive". Zero is not positive — it is neither positive nor negative.

\`is_positive(n)\` should return True only when n is strictly greater than 0. Right now it uses >= and lets zero through.

Tighten the comparison.`,
    kind: "logic-error",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "conditions"],
    starterFiles: [
      {
        path: "positive.py",
        content: `def is_positive(n):
    return n >= 0
`,
      },
    ],
    entryFile: "positive.py",
    entryFunction: "is_positive",
    visibleTests: [
      { name: "positive number", input: [5], expected: true },
      { name: "zero is not positive", input: [0], expected: false },
    ],
    hiddenTests: [
      { name: "negative number", input: [-1], expected: false },
      { name: "large positive", input: [100], expected: true },
    ],
    constraints: "n is a number.",
    hints: [
      "Zero passes >= but should not pass >. Which one matches the spec?",
      "Positive means strictly greater than zero.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Max of Two",
    slug: "max-of-two-numbers",
    description: `The leaderboard "best score" widget shows the WORSE of two scores. Personal bests keep going down.

\`maxOf(a, b)\` should return the larger value. Right now it calls the minimum helper.

Call the maximum helper instead.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["numbers", "math"],
    starterFiles: [
      {
        path: "maxof.js",
        content: `// Returns the larger of a and b.
export function maxOf(a, b) {
  return Math.min(a, b);
}
`,
      },
    ],
    entryFile: "maxof.js",
    entryFunction: "maxOf",
    visibleTests: [
      { name: "picks larger", input: [2, 3], expected: 3 },
      { name: "negatives", input: [-1, -5], expected: -1 },
    ],
    hiddenTests: [
      { name: "equal values", input: [5, 5], expected: 5 },
      { name: "first larger", input: [7, 2], expected: 7 },
    ],
    constraints: "a and b are finite numbers.",
    hints: [
      "Read the Math call out loud — does it match the function name?",
      "Min and max are one word apart.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "First Element",
    slug: "first-element-list",
    description: `The queue preview shows the SECOND job and crashes on a queue of one. Queues are zero-indexed.

\`first(nums)\` should return nums[0]. Right now it returns index 1, which is out of range for single-element lists.

Fix the index.`,
    kind: "runtime-error",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "lists", "indexing"],
    starterFiles: [
      {
        path: "first.py",
        content: `def first(nums):
    return nums[1]
`,
      },
    ],
    entryFile: "first.py",
    entryFunction: "first",
    visibleTests: [
      { name: "first of three", input: [[1, 2, 3]], expected: 1 },
      { name: "single element", input: [[7]], expected: 7 },
    ],
    hiddenTests: [
      { name: "negatives", input: [[-5, 0, 5]], expected: -5 },
      { name: "two elements", input: [[42, 99]], expected: 42 },
    ],
    constraints: "nums is a non-empty list.",
    hints: [
      "Lists start counting at 0, not 1.",
      "A single-element list has no index 1 — that is the crash.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Last Element",
    slug: "last-element-array",
    description: `The "most recent" feed always shows blank. The lookup reads one slot past the end of the array.

\`last(arr)\` should return arr[arr.length - 1]. Right now it reads arr[arr.length], which is always undefined.

Step the index back by one.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["arrays", "indexing"],
    starterFiles: [
      {
        path: "last.js",
        content: `// Returns the last element of the array.
export function last(arr) {
  return arr[arr.length];
}
`,
      },
    ],
    entryFile: "last.js",
    entryFunction: "last",
    visibleTests: [
      { name: "last of three", input: [[1, 2, 3]], expected: 3 },
      { name: "single string", input: [["a"]], expected: "a" },
    ],
    hiddenTests: [
      { name: "two numbers", input: [[10, 20]], expected: 20 },
      { name: "four numbers", input: [[5, 6, 7, 8]], expected: 8 },
    ],
    constraints: "arr is a non-empty array.",
    hints: [
      "Valid indices run 0 to length - 1. Where does length itself point?",
      "Subtract one from the index.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Total Letters, Not Words",
    slug: "total-length-words",
    description: `The reading-time estimator counts WORDS instead of LETTERS. ["hello", "hi"] estimates 2 minutes instead of 7.

\`total_length(words)\` should return the sum of len(w) for every word. Right now it returns the word count.

Sum the lengths, not the list.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "newbies",
    tags: ["Python", "strings", "lists"],
    starterFiles: [
      {
        path: "totlen.py",
        content: `def total_length(words):
    return len(words)
`,
      },
    ],
    entryFile: "totlen.py",
    entryFunction: "total_length",
    visibleTests: [
      { name: "two words", input: [["hello", "hi"]], expected: 7 },
      { name: "one word", input: [["abc"]], expected: 3 },
    ],
    hiddenTests: [
      { name: "empty list", input: [[]], expected: 0 },
      { name: "varied lengths", input: [["a", "bb", "ccc"]], expected: 6 },
    ],
    constraints: "words is a list of strings.",
    hints: [
      "len(words) is the container. You need len of each item inside.",
      "Loop over the words (or sum with a generator) and add len(w).",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Fizz Word: Multiples of Three",
    slug: "fizz-word-three",
    description: `The Fizz badges trigger on EVEN numbers instead of multiples of 3. Level 3 shows "3", level 4 shows "Fizz".

\`fizzWord(n)\` should return "Fizz" when n is divisible by 3, else String(n). Right now it checks divisibility by 2.

Change the divisor.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "newbies",
    tags: ["numbers", "modulo"],
    starterFiles: [
      {
        path: "fizz.js",
        content: `// "Fizz" for multiples of 3, else the number as a string.
export function fizzWord(n) {
  return n % 2 === 0 ? "Fizz" : String(n);
}
`,
      },
    ],
    entryFile: "fizz.js",
    entryFunction: "fizzWord",
    visibleTests: [
      { name: "3 is Fizz", input: [3], expected: "Fizz" },
      { name: "4 is plain", input: [4], expected: "4" },
    ],
    hiddenTests: [
      { name: "6 is Fizz", input: [6], expected: "Fizz" },
      { name: "7 is plain", input: [7], expected: "7" },
      { name: "9 is Fizz", input: [9], expected: "Fizz" },
    ],
    constraints: "n is a positive integer.",
    hints: [
      "The spec says 3. The code says 2. Trust the spec.",
      "One digit changes the whole behavior.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  // ── GENERAL batch (6: easy×2, medium×2, hard×2) ──
  {
    title: "Has Unique Characters",
    slug: "has-unique-chars",
    description: `The username validator rejects "abc" (all unique) and accepts "aba" (has a repeat). The comparison is backwards.

\`hasUniqueChars(s)\` should return true when every character appears once. Right now the equality check is inverted.

Flip the operator.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "easy",
    category: "general",
    tags: ["strings", "set"],
    starterFiles: [
      {
        path: "unique.js",
        content: `// True when every character in s appears exactly once.
export function hasUniqueChars(s) {
  return new Set(s).size !== s.length;
}
`,
      },
    ],
    entryFile: "unique.js",
    entryFunction: "hasUniqueChars",
    visibleTests: [
      { name: "all unique", input: ["abc"], expected: true },
      { name: "has repeat", input: ["aba"], expected: false },
    ],
    hiddenTests: [
      { name: "empty string", input: [""], expected: true },
      { name: "all same", input: ["aaaa"], expected: false },
      { name: "single char", input: ["z"], expected: true },
    ],
    constraints: "s is a string.",
    hints: [
      "A Set drops duplicates. When is its size EQUAL to the string length?",
      "The current operator answers the opposite question.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 5,
    status: "published",
  },
  {
    title: "Reverse Word Order",
    slug: "reverse-words-order",
    description: `The headline flipper reverses LETTERS ("hello world" becomes "dlrow olleh") instead of reversing WORD order.

\`reverse_words(s)\` should return the words in reverse order, single-space joined. Right now it reverses the whole string character by character.

Split into words first, then reverse the list.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "general",
    tags: ["Python", "strings"],
    starterFiles: [
      {
        path: "revwords.py",
        content: `def reverse_words(s):
    return s[::-1]
`,
      },
    ],
    entryFile: "revwords.py",
    entryFunction: "reverse_words",
    visibleTests: [
      { name: "two words", input: ["hello world"], expected: "world hello" },
      { name: "three words", input: ["a b c"], expected: "c b a" },
    ],
    hiddenTests: [
      { name: "single word", input: ["solo"], expected: "solo" },
      { name: "empty string", input: [""], expected: "" },
      { name: "keeps words intact", input: ["one two"], expected: "two one" },
    ],
    constraints: "s is a string of space-separated words.",
    hints: [
      "s[::-1] reverses characters. You need to reverse a LIST of words.",
      "Split on spaces, reverse the list, join with a single space.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Flatten One Level",
    slug: "flatten-one-level",
    description: `The export flattener does nothing: [1, [2, 3], 4] comes back still nested. The flatten depth is zero, which means "do not flatten".

\`flattenOnce(arr)\` should merge one level of nesting. Right now it calls flat(0).

Raise the depth by one.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "medium",
    category: "general",
    tags: ["arrays", "nesting"],
    starterFiles: [
      {
        path: "flatten.js",
        content: `// Merges one level of nesting: [1, [2, 3], 4] -> [1, 2, 3, 4].
export function flattenOnce(arr) {
  return arr.flat(0);
}
`,
      },
    ],
    entryFile: "flatten.js",
    entryFunction: "flattenOnce",
    visibleTests: [
      { name: "flattens nested", input: [[1, [2, 3], 4]], expected: [1, 2, 3, 4] },
      { name: "flat stays flat", input: [[1, 2, 3]], expected: [1, 2, 3] },
    ],
    hiddenTests: [
      { name: "empties vanish", input: [[[], [1], [2, 3]]], expected: [1, 2, 3] },
      { name: "empty array", input: [[]], expected: [] },
    ],
    constraints: "arr is an array nested at most one level.",
    hints: [
      "flat(0) is documented to flatten nothing. What depth merges one level?",
      "One argument is off by one.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 10,
    status: "published",
  },
  {
    title: "Group Words by Length",
    slug: "group-by-length",
    description: `The word-length report keeps only the LAST word of each length. "hi" disappears whenever "yo" arrives — the bucket is overwritten instead of appended to.

\`group_by_length(words)\` should map str(length) to the list of words with that length, in order. Right now each bucket is reassigned.

Append to the bucket instead of replacing it. Keys are strings because the judge transports tests as JSON.`,
    kind: "logic-error",
    language: "Python",
    difficulty: "medium",
    category: "general",
    tags: ["Python", "dicts", "grouping"],
    starterFiles: [
      {
        path: "grouplen.py",
        content: `def group_by_length(words):
    groups = {}
    for w in words:
        groups[str(len(w))] = [w]
    return groups
`,
      },
    ],
    entryFile: "grouplen.py",
    entryFunction: "group_by_length",
    visibleTests: [
      { name: "groups two lengths", input: [["hi", "yo", "hey"]], expected: { 2: ["hi", "yo"], 3: ["hey"] } },
    ],
    hiddenTests: [
      { name: "empty input", input: [[]], expected: {} },
      { name: "shared bucket", input: [["a", "bb", "c"]], expected: { 1: ["a", "c"], 2: ["bb"] } },
    ],
    constraints: "words is a list of strings. Keys are str(len).",
    hints: [
      "Assignment replaces the old list. The earlier words are lost.",
      "Create the bucket once (setdefault), then append every word.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Parse CSV Line",
    slug: "parse-csv-line",
    description: `The CSV importer splits inside quoted fields: 'a,"b,c",d' becomes four columns instead of three. Real CSV lets quotes protect commas.

\`parseCsvLine(line)\` should split on commas that are OUTSIDE double quotes, strip the surrounding quotes of quoted fields, and treat "" inside quotes as an escaped quote. Right now it is a naive split(",").

Walk the line tracking whether you are inside quotes.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "general",
    tags: ["strings", "parsing", "csv"],
    starterFiles: [
      {
        path: "csv.js",
        content: `// Splits one CSV line on commas outside double quotes.
// Quoted fields lose their outer quotes; "" inside quotes means ".
export function parseCsvLine(line) {
  return line.split(",");
}
`,
      },
    ],
    entryFile: "csv.js",
    entryFunction: "parseCsvLine",
    visibleTests: [
      { name: "plain row", input: ["a,b,c"], expected: ["a", "b", "c"] },
      { name: "quoted comma", input: ['a,"b,c",d'], expected: ["a", "b,c", "d"] },
    ],
    hiddenTests: [
      { name: "two quoted", input: ['"a,b","c"'], expected: ["a,b", "c"] },
      { name: "empty quoted field", input: ['a,"",c'], expected: ["a", "", "c"] },
      { name: "single empty", input: [""], expected: [""] },
    ],
    constraints: "line is one CSV record. Quotes follow RFC-4180 basics.",
    hints: [
      "Iterate characters with an inQuotes flag toggled by unescaped quotes.",
      "Only treat a comma as a separator when inQuotes is false.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 25,
    status: "published",
  },
  {
    title: "Most Frequent Word",
    slug: "most-frequent-word",
    description: `The trending tag widget shows the RAREST tag. With ["a", "b", "a"] it crowns "b" — the minimum is picked where the maximum belongs.

\`most_frequent(words)\` should return the word with the highest count (first one wins ties). Right now it takes the min by count.

Take the max instead. Non-empty input.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "hard",
    category: "general",
    tags: ["Python", "counting", "max"],
    starterFiles: [
      {
        path: "freq.py",
        content: `def most_frequent(words):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return min(counts, key=counts.get)
`,
      },
    ],
    entryFile: "freq.py",
    entryFunction: "most_frequent",
    visibleTests: [
      { name: "clear winner", input: [["a", "b", "a", "c", "a", "b"]], expected: "a" },
      { name: "dog beats cat", input: [["dog", "cat", "dog", "bird"]], expected: "dog" },
    ],
    hiddenTests: [
      { name: "single word", input: [["one"]], expected: "one" },
      { name: "late winner", input: [["a", "a", "b", "b", "b"]], expected: "b" },
    ],
    constraints: "words is a non-empty list of strings.",
    hints: [
      "min by count is the rarest. The spec wants the most common.",
      "One function name is the whole fix.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  // ── ALGORITHMS batch (6: easy×2, medium×2, hard×1, expert×1) ──
  {
    title: "Linear Contains Value",
    slug: "linear-contains-value",
    description: `Search says 3 is missing from [1, 2, 3]. The scan stops one step early and never inspects the last slot.

\`contains(arr, x)\` should return true when x appears anywhere. Right now the loop ends at length - 1.

Let the loop reach the final index.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "algorithms",
    tags: ["arrays", "search", "loops"],
    starterFiles: [
      {
        path: "contains.js",
        content: `// True when x appears anywhere in arr.
export function contains(arr, x) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === x) return true;
  }
  return false;
}
`,
      },
    ],
    entryFile: "contains.js",
    entryFunction: "contains",
    visibleTests: [
      { name: "finds last element", input: [[1, 2, 3], 3], expected: true },
      { name: "finds first element", input: [[1, 2, 3], 1], expected: true },
    ],
    hiddenTests: [
      { name: "missing value", input: [[], 1], expected: false },
      { name: "single hit", input: [[5], 5], expected: true },
      { name: "single miss", input: [[5], 9], expected: false },
    ],
    constraints: "arr is an array of numbers.",
    hints: [
      "With one element, how many times does the loop body run?",
      "The exit condition drops the last index. Remove the minus one.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Sum of Squares",
    slug: "sum-squares-range",
    description: `The score table for n=3 shows 5 instead of 14 (1 + 4 + 9). The range stops BEFORE n, so the last square never gets added.

\`sum_squares(n)\` should return 1^2 + 2^2 + ... + n^2. Right now range(1, n) excludes n.

Extend the range by one. sum_squares(0) is 0.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "algorithms",
    tags: ["Python", "math", "range"],
    starterFiles: [
      {
        path: "sumsq.py",
        content: `def sum_squares(n):
    return sum(i * i for i in range(1, n))
`,
      },
    ],
    entryFile: "sumsq.py",
    entryFunction: "sum_squares",
    visibleTests: [
      { name: "n = 3", input: [3], expected: 14 },
      { name: "n = 1", input: [1], expected: 1 },
    ],
    hiddenTests: [
      { name: "n = 0", input: [0], expected: 0 },
      { name: "n = 5", input: [5], expected: 55 },
    ],
    constraints: "n is an integer with 0 <= n <= 1000.",
    hints: [
      "range stops before its end. Which end value includes n?",
      "The fix is three characters: + 1 in the right place.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Two Sum Indices",
    slug: "two-sum-indices",
    description: `The pair finder returns [0, 0] for ([3, 2, 4], 6) — it reuses the same element twice (3 + 3). A valid pair needs two DISTINCT positions.

\`twoSum(nums, target)\` should return indices [i, j] with i != j and nums[i] + nums[j] === target, or null when none exists. Right now the inner loop starts at i, allowing i === j.

Start the inner loop at i + 1.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "medium",
    category: "algorithms",
    tags: ["arrays", "hashmap", "two-sum"],
    starterFiles: [
      {
        path: "twosum.js",
        content: `// Indices [i, j], i !== j, with nums[i] + nums[j] === target, else null.
export function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return null;
}
`,
      },
    ],
    entryFile: "twosum.js",
    entryFunction: "twoSum",
    visibleTests: [
      { name: "needs distinct slots", input: [[3, 2, 4], 6], expected: [1, 2] },
      { name: "classic case", input: [[2, 7, 11, 15], 9], expected: [0, 1] },
    ],
    hiddenTests: [
      { name: "duplicate values", input: [[3, 3], 6], expected: [0, 1] },
      { name: "ends pair", input: [[0, 4, 3, 0], 0], expected: [0, 3] },
      { name: "no pair", input: [[1, 2, 3], 7], expected: null },
    ],
    constraints: "nums.length <= 10^4. Exactly zero or one valid pair in tests.",
    hints: [
      "j = i means the element pairs with itself. When is that legal?",
      "The inner loop must start one step after the outer index.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Palindrome, Cleaned",
    slug: "palindrome-clean-check",
    description: `The palindrome detector rejects "Racecar" and "A man, a plan, a canal: Panama". It compares raw characters — case and punctuation break it.

\`is_palindrome(s)\` should ignore case and non-alphanumeric characters. Right now it is a plain s == s[::-1].

Filter to alphanumerics and lower-case before comparing.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "medium",
    category: "algorithms",
    tags: ["Python", "strings", "palindrome"],
    starterFiles: [
      {
        path: "palin.py",
        content: `def is_palindrome(s):
    return s == s[::-1]
`,
      },
    ],
    entryFile: "palin.py",
    entryFunction: "is_palindrome",
    visibleTests: [
      { name: "mixed case", input: ["Racecar"], expected: true },
      { name: "plain miss", input: ["hello"], expected: false },
    ],
    hiddenTests: [
      { name: "famous phrase", input: ["A man, a plan, a canal: Panama"], expected: true },
      { name: "with quotes", input: ["No 'x' in Nixon"], expected: true },
      { name: "simple miss", input: ["abc"], expected: false },
    ],
    constraints: "s is a string.",
    hints: [
      "Build a cleaned string first: keep ch.isalnum(), lower each kept char.",
      "Then check the cleaned string against its own reverse.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Merge Sorted Arrays",
    slug: "merge-sorted-arrays",
    description: `The merge helper drops the tail: merge([1, 3, 5], [2, 4, 6]) returns [1, 2, 3, 4, 5] — the 6 vanishes. When one side runs out, the loop just returns.

\`mergeSorted(a, b)\` should interleave both ascending arrays fully. Right now the leftovers after the main loop are discarded.

Append the remaining slice of each side after the loop.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "algorithms",
    tags: ["arrays", "merge", "sorting"],
    starterFiles: [
      {
        path: "merge.js",
        content: `// Merges two ascending arrays into one ascending array.
export function mergeSorted(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out;
}
`,
      },
    ],
    entryFile: "merge.js",
    entryFunction: "mergeSorted",
    visibleTests: [
      { name: "interleaves", input: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { name: "empty left", input: [[], [1]], expected: [1] },
    ],
    hiddenTests: [
      { name: "empty right", input: [[1], []], expected: [1] },
      { name: "left runs out first", input: [[1, 2], [3, 4]], expected: [1, 2, 3, 4] },
      { name: "both empty", input: [[], []], expected: [] },
    ],
    constraints: "a and b are ascending arrays.",
    hints: [
      "When the while exits, one side may still hold items. Where do they go?",
      "Concat a.slice(i) and b.slice(j) onto the result.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 20,
    status: "published",
  },
  {
    title: "Nth Fibonacci",
    slug: "fib-nth-number",
    description: `The sequence helper is one step behind: fib(5) returns 3 instead of 5. The loop runs n - 1 times instead of n.

\`fib(n)\` should return the nth Fibonacci number with fib(0) = 0, fib(1) = 1. Right now range(n - 1) short-changes every n >= 1.

Run the loop n times.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "expert",
    category: "algorithms",
    tags: ["Python", "math", "fibonacci", "off-by-one"],
    starterFiles: [
      {
        path: "fib.py",
        content: `def fib(n):
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return a
`,
      },
    ],
    entryFile: "fib.py",
    entryFunction: "fib",
    visibleTests: [
      { name: "fib 5", input: [5], expected: 5 },
      { name: "fib 0", input: [0], expected: 0 },
    ],
    hiddenTests: [
      { name: "fib 1", input: [1], expected: 1 },
      { name: "fib 10", input: [10], expected: 55 },
      { name: "fib 7", input: [7], expected: 13 },
    ],
    constraints: "0 <= n <= 30.",
    hints: [
      "Trace n = 1 by hand: how many iterations run, and what is returned?",
      "The range end is one too small.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 20,
    status: "published",
  },
  // ── FRONTEND batch (6 × javascript: easy×2, medium×2, hard×1, expert×1) ──
  {
    title: "Format Price From Cents",
    slug: "format-price-cents",
    description: `Prices render as "$2" instead of "$2.00" and "$0" instead of "$0.00". The cents-to-dollars math is right, but the two-decimal formatting is missing.

\`formatPrice(cents)\` should return "$" plus dollars with exactly two decimals. Right now it concatenates the raw division.

Format with two fraction digits.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "frontend",
    tags: ["formatting", "numbers", "ui"],
    starterFiles: [
      {
        path: "price.js",
        content: `// Formats integer cents as "$D.CC" with exactly two decimals.
export function formatPrice(cents) {
  return "$" + cents / 100;
}
`,
      },
    ],
    entryFile: "price.js",
    entryFunction: "formatPrice",
    visibleTests: [
      { name: "whole dollars", input: [200], expected: "$2.00" },
      { name: "with cents", input: [199], expected: "$1.99" },
    ],
    hiddenTests: [
      { name: "nickel", input: [5], expected: "$0.05" },
      { name: "zero", input: [0], expected: "$0.00" },
      { name: "large", input: [12345], expected: "$123.45" },
    ],
    constraints: "cents is a non-negative integer.",
    hints: [
      "Division gives 2, but the spec wants 2.00. Concatenation alone cannot add the zeros.",
      "Look for a number method that fixes the fraction digit count.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Classnames Join",
    slug: "classnames-join",
    description: `Buttons render class="btn false active" — falsy flags leak into the class list as literal text. Conditional classes pass false/null/undefined when off.

\`cx(...args)\` should join only truthy arguments with single spaces. Right now it joins everything, stringifying the falsy values.

Filter before joining.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "frontend",
    tags: ["css", "classnames", "ui"],
    starterFiles: [
      {
        path: "cx.js",
        content: `// Joins truthy class names with single spaces.
export function cx(...args) {
  return args.join(" ");
}
`,
      },
    ],
    entryFile: "cx.js",
    entryFunction: "cx",
    visibleTests: [
      { name: "drops false", input: ["btn", false, "active"], expected: "btn active" },
      { name: "plain join", input: ["a", "b"], expected: "a b" },
    ],
    hiddenTests: [
      { name: "drops nullish", input: [false, null, undefined, "x"], expected: "x" },
      { name: "all falsy", input: [false, null], expected: "" },
      { name: "empty call", input: [], expected: "" },
    ],
    constraints: "args are strings or falsy flags.",
    hints: [
      "join stringifies false into 'false'. The values must go before joining.",
      "One array method removes every falsy value in a line.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Truncate With Ellipsis",
    slug: "truncate-with-ellipsis",
    description: `Card previews either append "..." to short text that fits ("hello" becomes "hello...") or overflow the width ("hello world" at 8 becomes 11 chars). The ellipsis is always glued on without budgeting for it.

\`truncate(str, maxLen)\` should return str unchanged when it fits, else str.slice(0, maxLen - 3) + "..." (maxLen >= 3 in tests). Right now it is str.slice(0, maxLen) + "..." unconditionally.

Guard the short case and reserve 3 chars for the dots.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "medium",
    category: "frontend",
    tags: ["strings", "ui", "ellipsis"],
    starterFiles: [
      {
        path: "trunc.js",
        content: `// Fits str in maxLen chars: unchanged when short, else cut + "...".
export function truncate(str, maxLen) {
  return str.slice(0, maxLen) + "...";
}
`,
      },
    ],
    entryFile: "trunc.js",
    entryFunction: "truncate",
    visibleTests: [
      { name: "short stays whole", input: ["hello", 8], expected: "hello" },
      { name: "long gets ellipsis", input: ["hello world", 8], expected: "hello..." },
    ],
    hiddenTests: [
      { name: "exact fit", input: ["abc", 3], expected: "abc" },
      { name: "tight cut", input: ["abcdef", 5], expected: "ab..." },
    ],
    constraints: "maxLen >= 3 in all tests.",
    hints: [
      "Two bugs: no early return for fitting text, and the slice ignores the dots width.",
      "The cut point is maxLen minus the ellipsis length.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Validate Email, Basically",
    slug: "validate-email-basic",
    description: `Signup accepts "user@domain" (no dot) and "a@b@c.com" (two @ signs) as valid emails. The check is just includes("@").

\`isValidEmail(s)\` should require one @ with non-empty local part, a domain containing a dot, and no spaces. Right now any @ passes.

Use a simple anchored pattern covering those three rules.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "medium",
    category: "frontend",
    tags: ["forms", "validation", "regex"],
    starterFiles: [
      {
        path: "email.js",
        content: `// True for basic user@domain.tld shapes (no spaces, one @, dot in domain).
export function isValidEmail(s) {
  return s.includes("@");
}
`,
      },
    ],
    entryFile: "email.js",
    entryFunction: "isValidEmail",
    visibleTests: [
      { name: "real address", input: ["user@example.com"], expected: true },
      { name: "missing dot", input: ["user@domain"], expected: false },
    ],
    hiddenTests: [
      { name: "double at", input: ["a@b@c.com"], expected: false },
      { name: "missing local", input: ["@example.com"], expected: false },
      { name: "short valid", input: ["test@mail.co"], expected: true },
      { name: "plain word", input: ["not-an-email"], expected: false },
    ],
    constraints: "s is a string.",
    hints: [
      "includes('@') cannot see the second @ or the missing dot.",
      "An anchored regex with negated @-classes covers all three rules.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Paginate Items",
    slug: "paginate-items",
    description: `Page 1 of the list shows items 3-4 instead of 1-2. The slice treats the 1-based page as 0-based, skipping the first page entirely.

\`paginate(items, page, perPage)\` uses 1-based pages: page 1 is items[0..perPage). Right now it slices from page * perPage.

Shift the start back by one page.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "hard",
    category: "frontend",
    tags: ["pagination", "arrays", "off-by-one"],
    starterFiles: [
      {
        path: "paginate.js",
        content: `// 1-based pagination: page 1 -> items[0..perPage).
export function paginate(items, page, perPage) {
  return items.slice(page * perPage, page * perPage + perPage);
}
`,
      },
    ],
    entryFile: "paginate.js",
    entryFunction: "paginate",
    visibleTests: [
      { name: "first page", input: [[1, 2, 3, 4, 5], 1, 2], expected: [1, 2] },
      { name: "second page", input: [[1, 2, 3, 4, 5], 2, 2], expected: [3, 4] },
    ],
    hiddenTests: [
      { name: "last partial", input: [[1, 2, 3], 3, 1], expected: [3] },
      { name: "past the end", input: [[1, 2], 5, 2], expected: [] },
    ],
    constraints: "page >= 1, perPage >= 1.",
    hints: [
      "Page 1 must start at index 0. What does page * perPage give for page 1?",
      "The start index is (page - 1) * perPage.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Sort Table Rows",
    slug: "sort-table-rows",
    description: `The table sorts 10 before 2 and 9 ("10", "2", "9"). Numbers are compared as STRINGS, so "10" < "2" lexicographically. It also sorts the input array in place.

\`sortRows(rows, key)\` should return a NEW array sorted ascending by key: numeric comparison for numbers, localeCompare for anything else. Right now it is rows.sort with a string comparator.

Copy first, then compare by type.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "expert",
    category: "frontend",
    tags: ["sorting", "tables", "immutability"],
    starterFiles: [
      {
        path: "sortrows.js",
        content: `// New array sorted ascending by key (numbers numerically).
export function sortRows(rows, key) {
  return rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}
`,
      },
    ],
    entryFile: "sortrows.js",
    entryFunction: "sortRows",
    visibleTests: [
      { name: "numbers numerically", input: [[{ n: 10 }, { n: 9 }, { n: 2 }], "n"], expected: [{ n: 2 }, { n: 9 }, { n: 10 }] },
      { name: "strings alphabetically", input: [[{ name: "b" }, { name: "a" }], "name"], expected: [{ name: "a" }, { name: "b" }] },
    ],
    hiddenTests: [
      { name: "hundreds", input: [[{ n: 100 }, { n: 20 }, { n: 3 }], "n"], expected: [{ n: 3 }, { n: 20 }, { n: 100 }] },
      { name: "empty rows", input: [[], "n"], expected: [] },
    ],
    constraints: "rows is an array of objects sharing key.",
    hints: [
      "localeCompare on numbers compares '10' < '2'. Numbers need subtraction.",
      "Branch: both values numbers -> a - b; otherwise String localeCompare. Spread-copy first.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 25,
    status: "published",
  },
  // ── BACKEND batch (6: easy×2, medium×2, hard×2) ──
  {
    title: "Build URL With Query",
    slug: "build-url-query",
    description: `Share links break on spaces ("hello world" goes out raw) and empty params leave a dangling "?". Values must be percent-encoded and an empty param set means no question mark at all.

\`buildUrl(base, params)\` should return base + "?" + encoded pairs, or base when params is empty. Right now keys and values are concatenated raw and "?" is always added.

Encode each side and skip the "?" when there is nothing to join.`,
    kind: "api-bug",
    language: "javascript",
    difficulty: "easy",
    category: "backend",
    tags: ["urls", "encoding", "api"],
    starterFiles: [
      {
        path: "buildurl.js",
        content: `// Builds base + encoded "?k=v&..." (no "?" when params is empty).
export function buildUrl(base, params) {
  const qs = Object.entries(params)
    .map((pair) => pair[0] + "=" + pair[1])
    .join("&");
  return base + "?" + qs;
}
`,
      },
    ],
    entryFile: "buildurl.js",
    entryFunction: "buildUrl",
    visibleTests: [
      { name: "encodes spaces", input: ["https://a.com", { q: "hello world" }], expected: "https://a.com?q=hello%20world" },
      { name: "empty params", input: ["https://a.com", {}], expected: "https://a.com" },
    ],
    hiddenTests: [
      { name: "two params", input: ["https://a.com", { a: "1", b: "2" }], expected: "https://a.com?a=1&b=2" },
      { name: "encodes ampersand", input: ["https://a.com", { redirect: "a&b=c" }], expected: "https://a.com?redirect=a%26b%3Dc" },
    ],
    constraints: "params values are strings.",
    hints: [
      "Raw concatenation cannot handle spaces or & — one global function encodes both.",
      "Return base early when the entries list is empty.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 10,
    status: "published",
  },
  {
    title: "Is JSON Content Type",
    slug: "is-json-content-type",
    description: `The webhook gate rejects "application/json; charset=utf-8" and "Application/JSON" — real-world content types with parameters and mixed case. Only the bare lowercase form passes.

\`is_json_content(content_type)\` should accept any case variant of application/json, ignoring any ";" parameters and surrounding spaces. Right now it is an exact == comparison.

Split off the parameters, strip, and lower-case before comparing.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "backend",
    tags: ["Python", "http", "headers"],
    starterFiles: [
      {
        path: "contenttype.py",
        content: `def is_json_content(content_type):
    return content_type == "application/json"
`,
      },
    ],
    entryFile: "contenttype.py",
    entryFunction: "is_json_content",
    visibleTests: [
      { name: "bare type", input: ["application/json"], expected: true },
      { name: "with charset", input: ["application/json; charset=utf-8"], expected: true },
    ],
    hiddenTests: [
      { name: "mixed case", input: ["Application/JSON"], expected: true },
      { name: "other type", input: ["text/html"], expected: false },
    ],
    constraints: "content_type is a string.",
    hints: [
      "Everything after the first ';' is metadata, not the media type.",
      "Case must not matter: normalize before comparing.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Slugify Title",
    slug: "slugify-title",
    description: `Article URLs come out as "Hello-World!" and "-Multiple---Spaces-". Slugs must be lowercase, punctuation-free, single-dashed, and unpadded.

\`slugify(title)\` should lower-case, replace every run of non [a-z0-9] with one "-", and trim leading/trailing dashes. Right now it only swaps whitespace for dashes.

Normalize the case first, then collapse the unwanted runs.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "medium",
    category: "backend",
    tags: ["slugs", "strings", "urls"],
    starterFiles: [
      {
        path: "slugify.js",
        content: `// Lowercase kebab-case slug without padding dashes.
export function slugify(title) {
  return title.replace(/\\s+/g, "-");
}
`,
      },
    ],
    entryFile: "slugify.js",
    entryFunction: "slugify",
    visibleTests: [
      { name: "basic words", input: ["Hello World"], expected: "hello-world" },
      { name: "punctuation", input: ["Hello, World!"], expected: "hello-world" },
    ],
    hiddenTests: [
      { name: "extra spaces", input: ["  Multiple   Spaces  "], expected: "multiple-spaces" },
      { name: "with year", input: ["Blog Post 2024"], expected: "blog-post-2024" },
    ],
    constraints: "title is a non-empty string.",
    hints: [
      "Two gaps: case is never lowered, and only whitespace (not punctuation) is replaced.",
      "One regex over [^a-z0-9]+ after lower-casing covers spaces AND punctuation.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Page Offset Calculator",
    slug: "paginate-offset-calc",
    description: `Page 1 queries OFFSET 10 instead of 0 — the first ten rows are skipped for everyone. The formula forgets pages are 1-based.

\`page_offset(page, per_page)\` should return (page - 1) * per_page. Right now it is page * per_page.

Subtract one page first.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "medium",
    category: "backend",
    tags: ["Python", "pagination", "sql"],
    starterFiles: [
      {
        path: "offset.py",
        content: `def page_offset(page, per_page):
    return page * per_page
`,
      },
    ],
    entryFile: "offset.py",
    entryFunction: "page_offset",
    visibleTests: [
      { name: "first page", input: [1, 10], expected: 0 },
      { name: "second page", input: [2, 10], expected: 10 },
    ],
    hiddenTests: [
      { name: "third page", input: [3, 5], expected: 10 },
      { name: "single per page", input: [1, 1], expected: 0 },
    ],
    constraints: "page >= 1, per_page >= 1.",
    hints: [
      "Page 1 must offset 0. What does page * per_page give for page 1?",
      "Parenthesize (page - 1) before multiplying.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Rate Limit Gate",
    slug: "rate-limit-allow",
    description: `The rate limiter counts YESTERDAY's requests against today's quota. Users are blocked long after the window slid past their old hits.

\`isAllowed(timestamps, now, limit, windowSec)\` should count only hits with t > now - windowSec and allow when that count is below limit. Right now it counts the whole history.

Filter by the window before comparing to the limit. Timestamps are seconds, ascending.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "backend",
    tags: ["rate-limit", "api", "sliding-window"],
    starterFiles: [
      {
        path: "ratelimit.js",
        content: `// True when fewer than ` + "`limit`" + ` hits fall inside (now - windowSec, now].
export function isAllowed(timestamps, now, limit, windowSec) {
  return timestamps.length < limit;
}
`,
      },
    ],
    entryFile: "ratelimit.js",
    entryFunction: "isAllowed",
    visibleTests: [
      { name: "old hits expired", input: [[1, 2, 3], 10, 3, 5], expected: true },
      { name: "recent hits count", input: [[8, 9], 10, 3, 5], expected: true },
    ],
    hiddenTests: [
      { name: "one live hit", input: [[1, 2, 100], 102, 2, 5], expected: true },
      { name: "window full", input: [[100, 101, 102], 102, 2, 5], expected: false },
    ],
    constraints: "timestamps ascending; windowSec >= 1.",
    hints: [
      "Stale entries outside (now - windowSec, now] must not count.",
      "Filter with t > now - windowSec, then compare the filtered length.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 20,
    status: "published",
  },
  {
    title: "Parse Bearer Token",
    slug: "parse-auth-bearer",
    description: `Auth crashes with an IndexError on "Bearer" (no token) and accepts "Token abc" as valid. Scheme matching is also case-sensitive, rejecting "bearer xyz".

\`parse_bearer(auth)\` should return the token when auth is "Bearer <token>" (any case, extra spaces tolerated) and None otherwise — never raise. Right now it blindly returns the second space-split part.

Validate the shape: two parts, first one lower-cased equals "bearer".`,
    kind: "api-bug",
    language: "Python",
    difficulty: "hard",
    category: "backend",
    tags: ["Python", "auth", "headers"],
    starterFiles: [
      {
        path: "bearer.py",
        content: `def parse_bearer(auth):
    parts = auth.split(" ")
    return parts[1]
`,
      },
    ],
    entryFile: "bearer.py",
    entryFunction: "parse_bearer",
    visibleTests: [
      { name: "good header", input: ["Bearer mytoken123"], expected: "mytoken123" },
      { name: "missing token", input: ["Bearer"], expected: null },
    ],
    hiddenTests: [
      { name: "wrong scheme", input: ["Token abc"], expected: null },
      { name: "lowercase scheme", input: ["bearer XYZ"], expected: "XYZ" },
      { name: "empty header", input: [""], expected: null },
    ],
    constraints: "auth is a string.",
    hints: [
      "parts[1] assumes a shape the input may not have. Check the length first.",
      "Split on any whitespace, then compare the scheme case-insensitively.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 18,
    status: "published",
  },
  // ── SECURITY batch (6: easy×2, medium×2, hard×1, expert×1) ──
  {
    title: "Escape HTML Basics",
    slug: "escape-html-basic",
    description: `User bios inject markup: "a&b" renders as-is and '"quoted"' breaks out of attributes. Only < and > are escaped — & and quotes pass through raw.

\`escapeHtml(s)\` should replace & first, then <, >, double quotes, and single quotes. Right now &/quotes are untouched (and escaping & last would double-escape).

Map the five characters, ampersand first.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "security",
    tags: ["xss", "escaping", "html"],
    starterFiles: [
      {
        path: "escape.js",
        content: `// Escapes & < > " ' for safe HTML embedding (& first).
export function escapeHtml(s) {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
`,
      },
    ],
    entryFile: "escape.js",
    entryFunction: "escapeHtml",
    visibleTests: [
      { name: "angle brackets", input: ["<b>hi</b>"], expected: "&lt;b&gt;hi&lt;/b&gt;" },
      { name: "ampersand", input: ["a&b"], expected: "a&amp;b" },
    ],
    hiddenTests: [
      { name: "double quotes", input: ['"quoted"'], expected: "&quot;quoted&quot;" },
      { name: "mixed", input: ["<a>&</a>"], expected: "&lt;a&gt;&amp;&lt;/a&gt;" },
    ],
    constraints: "s is a string.",
    hints: [
      "List what is escaped now (two chars) vs what the spec needs (five).",
      "Escape & BEFORE introducing new & via &lt; — order matters.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 10,
    status: "published",
  },
  {
    title: "Redact Secret Key",
    slug: "redact-secret-key",
    description: `Logs show "sk-l**********" — the FIRST four characters, the most identifying part. Redaction must keep the LAST four and mask the rest.

\`redact(secret)\` should return "*" * (len - 4) + last 4 chars; strings of length <= 4 become "****" (empty stays empty). Right now it keeps the head instead of the tail.

Slice from the end, not the start.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "security",
    tags: ["Python", "secrets", "redaction"],
    starterFiles: [
      {
        path: "redact.py",
        content: `def redact(secret):
    if len(secret) <= 4:
        return "****" if secret else ""
    return secret[:4] + "*" * (len(secret) - 4)
`,
      },
    ],
    entryFile: "redact.py",
    entryFunction: "redact",
    visibleTests: [
      { name: "long key", input: ["12345678"], expected: "****5678" },
      { name: "short key", input: ["abcd"], expected: "****" },
    ],
    hiddenTests: [
      { name: "prefixed key", input: ["sk-live-abcdef"], expected: "**********cdef" },
      { name: "empty stays empty", input: [""], expected: "" },
    ],
    constraints: "secret is a string.",
    hints: [
      "secret[:4] is the head. Which slice takes the tail?",
      "Stars go first, preserved chars last.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Safe Redirect Check",
    slug: "safe-redirect-check",
    description: `The post-login redirect follows "//evil.com" off-site. The guard only checks startsWith("/"), which protocol-relative URLs satisfy — an open redirect.

\`isSafeRedirect(url)\` should allow single-slash relative paths ("/dashboard", "/" itself) and reject "//...", "/\\...", absolute http(s), and anything without the leading slash. Right now every leading-slash string passes.

Require exactly one leading slash followed by a non-slash, non-backslash char (or the bare "/").`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "medium",
    category: "security",
    tags: ["redirect", "open-redirect", "validation"],
    starterFiles: [
      {
        path: "redirect.js",
        content: `// True only for safe same-origin relative redirects.
export function isSafeRedirect(url) {
  return url.startsWith("/");
}
`,
      },
    ],
    entryFile: "redirect.js",
    entryFunction: "isSafeRedirect",
    visibleTests: [
      { name: "relative ok", input: ["/dashboard"], expected: true },
      { name: "protocol-relative blocked", input: ["//evil.com"], expected: false },
    ],
    hiddenTests: [
      { name: "absolute blocked", input: ["https://evil.com"], expected: false },
      { name: "backslash trick", input: ["/\\evil"], expected: false },
      { name: "with query", input: ["/profile?x=1"], expected: true },
    ],
    constraints: "url is a string.",
    hints: [
      "'//evil.com'.startsWith('/') is true — that is the hole.",
      "Check the SECOND character too: it must exist and must not be / or backslash (or accept bare '/').",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Strong Password Check",
    slug: "strong-password-check",
    description: `"password" and "ABCDEFGH" both pass as "strong" — the checker only measures length. Real rules need character variety.

\`is_strong_password(pw)\` should require length >= 8 AND at least one uppercase, one lowercase, and one digit. Right now it is len(pw) >= 8 alone.

Add the three character-class checks.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "medium",
    category: "security",
    tags: ["Python", "passwords", "validation"],
    starterFiles: [
      {
        path: "pwdcheck.py",
        content: `def is_strong_password(pw):
    return len(pw) >= 8
`,
      },
    ],
    entryFile: "pwdcheck.py",
    entryFunction: "is_strong_password",
    visibleTests: [
      { name: "strong passes", input: ["Abcdef12"], expected: true },
      { name: "common word fails", input: ["password"], expected: false },
    ],
    hiddenTests: [
      { name: "no lower or digit", input: ["ABCDEFGH"], expected: false },
      { name: "no digit", input: ["Abcdefgh"], expected: false },
      { name: "too short", input: ["A1b"], expected: false },
    ],
    constraints: "pw is a string.",
    hints: [
      "Length is necessary but not sufficient. What three groups must appear?",
      "any(c.isupper() ...) style checks combine with the length rule.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 12,
    status: "published",
  },
  {
    title: "Sanitize Filename",
    slug: "sanitize-filename",
    description: `Uploads escape their directory: "../../etc/passwd" sanitizes to "../etc/passwd" — still a traversal. The replacement runs ONCE, so stacked sequences survive.

\`sanitizeFilename(name)\` should remove EVERY "../" occurrence (repeat until none remain) and strip any leading "/". Right now it is a single non-global replace.

Replace globally — or loop until the needle is gone.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "hard",
    category: "security",
    tags: ["path-traversal", "sanitization", "files"],
    starterFiles: [
      {
        path: "filename.js",
        content: `// Strips all "../" traversals and leading slashes.
export function sanitizeFilename(name) {
  return name.replace("../", "");
}
`,
      },
    ],
    entryFile: "filename.js",
    entryFunction: "sanitizeFilename",
    visibleTests: [
      { name: "double traversal", input: ["../../etc/passwd"], expected: "etc/passwd" },
      { name: "clean name", input: ["hello.txt"], expected: "hello.txt" },
    ],
    hiddenTests: [
      { name: "nested traversal", input: ["a/../b/../c"], expected: "a/b/c" },
      { name: "deep traversal", input: ["../../../x"], expected: "x" },
    ],
    constraints: "name is a string.",
    hints: [
      "String.replace with a string pattern replaces only the FIRST hit.",
      "A global regex (or split/join, or a while loop) gets every occurrence.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Token Expiry Check",
    slug: "token-expiry-check",
    description: `Sessions accept tokens from the FUTURE (issued_at > now) — clock-skew forgeries never expire-check correctly. The code only tests now < issued_at + ttl.

\`is_token_valid(issued_at, now, ttl_seconds)\` should require issued_at <= now < issued_at + ttl_seconds. Right now the lower bound is missing.

Add the issued_at <= now half of the range. Times are integer seconds.`,
    kind: "logic-error",
    language: "Python",
    difficulty: "expert",
    category: "security",
    tags: ["Python", "auth", "tokens", "time"],
    starterFiles: [
      {
        path: "expiry.py",
        content: `def is_token_valid(issued_at, now, ttl_seconds):
    return now < issued_at + ttl_seconds
`,
      },
    ],
    entryFile: "expiry.py",
    entryFunction: "is_token_valid",
    visibleTests: [
      { name: "live token", input: [100, 150, 60], expected: true },
      { name: "future issued", input: [200, 100, 60], expected: false },
    ],
    hiddenTests: [
      { name: "just before issue", input: [100, 99, 60], expected: false },
      { name: "at expiry edge", input: [100, 160, 60], expected: false },
      { name: "issued now", input: [100, 100, 60], expected: true },
    ],
    constraints: "All values are integer seconds; ttl_seconds > 0.",
    hints: [
      "A token cannot be valid before it exists. Which comparison is missing?",
      "Validity is a two-sided range: issued_at <= now AND now < issued_at + ttl.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 18,
    status: "published",
  },
  // ── DATABASE batch (5: easy×2, medium×2, hard×1) ──
  {
    title: "Pick Fields Projection",
    slug: "pick-fields-projection",
    description: `The public API leaks full user rows — password hashes ride along with the name. The "projection" returns the ORIGINAL object untouched.

\`pick(obj, fields)\` should build a NEW object with only the listed keys that exist on obj. Right now it returns obj itself.

Copy the wanted keys into a fresh object.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "database",
    tags: ["projection", "objects", "api"],
    starterFiles: [
      {
        path: "pick.js",
        content: `// New object with only fields present on obj.
export function pick(obj, fields) {
  return obj;
}
`,
      },
    ],
    entryFile: "pick.js",
    entryFunction: "pick",
    visibleTests: [
      { name: "picks one", input: [{ a: 1, b: 2 }, ["a"]], expected: { a: 1 } },
      { name: "empty fields", input: [{ a: 1 }, []], expected: {} },
    ],
    hiddenTests: [
      { name: "picks other", input: [{ a: 1, b: 2 }, ["b"]], expected: { b: 2 } },
      { name: "missing key skipped", input: [{ a: 1 }, ["zzz"]], expected: {} },
    ],
    constraints: "obj is a flat JSON object; fields is an array of strings.",
    hints: [
      "Returning obj shares the reference AND every secret field.",
      "Loop the fields, copy obj[k] when k exists in obj.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Filter Active Users",
    slug: "filter-active-users",
    description: `The "active" roster admits 1, "yes", and other truthy junk — downstream code expects real booleans. The filter uses truthiness instead of identity.

\`filter_active(users)\` should keep rows where active is True (exactly, via is). Right now it is if u.get("active").

Compare with is True so only the boolean passes.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "database",
    tags: ["Python", "filtering", "booleans"],
    starterFiles: [
      {
        path: "active.py",
        content: `def filter_active(users):
    return [u for u in users if u.get("active")]
`,
      },
    ],
    entryFile: "active.py",
    entryFunction: "filter_active",
    visibleTests: [
      { name: "splits booleans", input: [[{ name: "a", active: true }, { name: "b", active: false }]], expected: [{ name: "a", active: true }] },
      { name: "one is not True", input: [[{ active: 1 }, { active: true }]], expected: [{ active: true }] },
    ],
    hiddenTests: [
      { name: "string is not True", input: [[{ active: "yes" }, { active: true }]], expected: [{ active: true }] },
      { name: "empty list", input: [[]], expected: [] },
    ],
    constraints: "users is a list of dicts.",
    hints: [
      "1 == True in Python, but 1 is True is False. The spec wants identity.",
      "One keyword changes truthiness into strictness.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Build Mongo Filter",
    slug: "build-mongo-filter",
    description: `User search returns wrong ages (21 matches when minAge is 21... it should INCLUDE 21) and sends { name: undefined } debris when fields are missing.

\`buildFilter(filters)\` should include name only when set, and age as { $gte: minAge } only when minAge is a number. Right now it always sets both and uses $gt.

Add each clause conditionally and use the inclusive operator.`,
    kind: "api-bug",
    language: "javascript",
    difficulty: "medium",
    category: "database",
    tags: ["mongodb", "filters", "queries"],
    starterFiles: [
      {
        path: "mongofilter.js",
        content: `// { name }? + { age: { $gte: minAge } }? — only set keys included.
export function buildFilter(filters) {
  return { name: filters.name, age: { $gt: filters.minAge } };
}
`,
      },
    ],
    entryFile: "mongofilter.js",
    entryFunction: "buildFilter",
    visibleTests: [
      { name: "both filters", input: [{ name: "ada", minAge: 18 }], expected: { name: "ada", age: { $gte: 18 } } },
      { name: "empty filters", input: [{}], expected: {} },
    ],
    hiddenTests: [
      { name: "age only", input: [{ minAge: 21 }], expected: { age: { $gte: 21 } } },
      { name: "name only", input: [{ name: "g" }], expected: { name: "g" } },
    ],
    constraints: "filters has optional name (string) and minAge (number).",
    hints: [
      "$gt excludes the boundary; the spec says inclusive.",
      "Build an empty object and attach each key only when its input is present.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Query, Sort, Page",
    slug: "query-sort-page",
    description: `The admin table shows the OLDEST rows first on page 1 and skips rows between pages. Sorting is descending and paging is 0-based — both backwards.

\`query_page(rows, sort_key, page, per_page)\` should sort ASCENDING by sort_key and return the 1-based page slice. Right now it sorts reverse=True and slices from page * per_page.

Drop the reverse flag and shift the slice by one page.`,
    kind: "api-bug",
    language: "Python",
    difficulty: "medium",
    category: "database",
    tags: ["Python", "sorting", "pagination"],
    starterFiles: [
      {
        path: "querypage.py",
        content: `def query_page(rows, sort_key, page, per_page):
    ordered = sorted(rows, key=lambda r: r[sort_key], reverse=True)
    start = page * per_page
    return ordered[start:start + per_page]
`,
      },
    ],
    entryFile: "querypage.py",
    entryFunction: "query_page",
    visibleTests: [
      { name: "first page asc", input: [[{"age": 30}, {"age": 20}, {"age": 25}], "age", 1, 2], expected: [{ age: 20 }, { age: 25 }] },
      { name: "second page", input: [[{"age": 30}, {"age": 20}, {"age": 25}], "age", 2, 2], expected: [{ age: 30 }] },
    ],
    hiddenTests: [
      { name: "names sort", input: [[{"n": "b"}, {"n": "a"}], "n", 1, 5], expected: [{ n: "a" }, { n: "b" }] },
      { name: "empty rows", input: [[], "age", 1, 10], expected: [] },
    ],
    constraints: "page >= 1, per_page >= 1. Keys exist on every row.",
    hints: [
      "Two bugs stacked: direction and offset. Fix them independently.",
      "Ascending means no reverse flag; page 1 starts at index 0.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Upsert Merge by ID",
    slug: "upsert-merge-by-id",
    description: `Sync duplicates every record: merging [{id: 1, v: 1}] with [{id: 1, v: 2}] yields TWO rows instead of one updated row. Incoming rows are appended blindly.

\`mergeById(existing, incoming)\` should key by id — incoming wins on conflict — preserving existing order then appending brand-new ids. Right now it is [...existing, ...incoming].

Index by id, overwrite, then emit in order.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "database",
    tags: ["upsert", "merge", "sync"],
    starterFiles: [
      {
        path: "upsert.js",
        content: `// Merge by id: incoming wins; existing order, then new ids.
export function mergeById(existing, incoming) {
  return [...existing, ...incoming];
}
`,
      },
    ],
    entryFile: "upsert.js",
    entryFunction: "mergeById",
    visibleTests: [
      { name: "update wins", input: [[{ id: 1, v: 1 }], [{ id: 1, v: 2 }]], expected: [{ id: 1, v: 2 }] },
      { name: "append new", input: [[{ id: 1 }], [{ id: 2 }]], expected: [{ id: 1 }, { id: 2 }] },
    ],
    hiddenTests: [
      { name: "both empty", input: [[], []], expected: [] },
      { name: "mixed batch", input: [[{ id: 1, v: 1 }, { id: 2, v: 1 }], [{ id: 2, v: 2 }, { id: 3, v: 3 }]], expected: [{ id: 1, v: 1 }, { id: 2, v: 2 }, { id: 3, v: 3 }] },
    ],
    constraints: "Every row has a unique id within its own array.",
    hints: [
      "A Map keyed by id with an order list separates identity from position.",
      "Existing ids keep their slots; unseen incoming ids append at the end.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 20,
    status: "published",
  },
  // ── PERFORMANCE batch (5: easy×2, medium×2, hard×1) ──
  {
    title: "Find Max, Negatives Included",
    slug: "find-max-single-pass",
    description: `The dashboard peak shows 0 for an all-negative series [-5, -2, -9] — the accumulator starts at 0, which no element can beat below zero.

\`findMax(arr)\` should return the largest element in one pass, starting from the first element. Right now max starts at 0.

Seed the accumulator with arr[0] and scan from index 1. Non-empty input.`,
    kind: "bug-fix",
    language: "javascript",
    difficulty: "easy",
    category: "performance",
    tags: ["max", "scan", "negatives"],
    starterFiles: [
      {
        path: "maxarr.js",
        content: `// Largest element via one linear scan.
export function findMax(arr) {
  let max = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}
`,
      },
    ],
    entryFile: "maxarr.js",
    entryFunction: "findMax",
    visibleTests: [
      { name: "positives", input: [[1, 5, 3]], expected: 5 },
      { name: "all negative", input: [[-5, -2, -9]], expected: -2 },
    ],
    hiddenTests: [
      { name: "single seven", input: [[7]], expected: 7 },
      { name: "zero wins", input: [[0, -1]], expected: 0 },
      { name: "single negative", input: [[-1]], expected: -1 },
    ],
    constraints: "arr is a non-empty array of finite numbers.",
    hints: [
      "0 is a guess, not a neutral seed. What value is guaranteed to be in the array?",
      "Start from arr[0] — then 0 only wins when it is really there.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Word Count, Any Spacing",
    slug: "word-count-spaces",
    description: `The counter reports 4 words for "hello   world" — splitting on single spaces counts every gap as a word. Tabs and leading spaces inflate it further.

\`word_count(s)\` should split on ANY whitespace run and ignore edges (empty string is 0). Right now it is len(s.split(" ")).

Split without arguments: runs collapse and edges vanish.`,
    kind: "bug-fix",
    language: "Python",
    difficulty: "easy",
    category: "performance",
    tags: ["Python", "strings", "split"],
    starterFiles: [
      {
        path: "wcount.py",
        content: `def word_count(s):
    return len(s.split(" "))
`,
      },
    ],
    entryFile: "wcount.py",
    entryFunction: "word_count",
    visibleTests: [
      { name: "two words", input: ["hello world"], expected: 2 },
      { name: "extra spaces", input: ["hello   world"], expected: 2 },
    ],
    hiddenTests: [
      { name: "empty string", input: [""], expected: 0 },
      { name: "padded", input: ["  hi  "], expected: 1 },
      { name: "single word", input: ["one"], expected: 1 },
    ],
    constraints: "s is a string.",
    hints: [
      "'a  b'.split(' ') keeps empty strings between the gaps. Who counts those?",
      "Calling split with no separator splits on runs and strips the edges.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 8,
    status: "published",
  },
  {
    title: "Dedupe Fast With Set",
    slug: "dedupe-fast-set",
    description: `The dedupe helper is quadratic AND scrambles order: lastIndexOf keeps the LAST occurrence, so [1, 2, 1, 3] comes back [2, 1, 3]. Each lookup also rescans the array (O(n^2)).

\`dedupeFast(arr)\` should preserve first-occurrence order in linear time via a Set. Right now it is filter + lastIndexOf.

Spread a Set built from the array.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "medium",
    category: "performance",
    tags: ["dedupe", "set", "order", "complexity"],
    starterFiles: [
      {
        path: "dedupefast.js",
        content: `// Order-preserving dedupe in linear time (first occurrence wins).
export function dedupeFast(arr) {
  return arr.filter((v, i) => arr.lastIndexOf(v) === i);
}
`,
      },
    ],
    entryFile: "dedupefast.js",
    entryFunction: "dedupeFast",
    visibleTests: [
      { name: "keeps first order", input: [[1, 2, 1, 3]], expected: [1, 2, 3] },
      { name: "adjacent repeats", input: [[1, 2, 2, 3]], expected: [1, 2, 3] },
    ],
    hiddenTests: [
      { name: "all same", input: [[1, 1, 1]], expected: [1] },
      { name: "strings", input: [["a", "b", "a"]], expected: ["a", "b"] },
      { name: "empty", input: [[]], expected: [] },
    ],
    constraints: "arr elements are JSON values.",
    hints: [
      "lastIndexOf finds the FINAL position: duplicates are kept at their last slot, not their first.",
      "new Set(arr) keeps first occurrences in one pass; spread it back to an array.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Pair Sum, Distinct Indices",
    slug: "has-pair-sum-fast",
    description: `The fraud detector flags a SINGLE 5 as "a pair summing to 10" — the double loop allows i == j, pairing each element with itself. It is also O(n^2).

\`has_pair_sum(nums, target)\` should answer whether two DISTINCT positions sum to target, ideally in one pass with a seen-set. Right now the inner loop starts at 0 for every i.

Require i != j (or track complements in a set for linear time).`,
    kind: "logic-error",
    language: "Python",
    difficulty: "medium",
    category: "performance",
    tags: ["Python", "two-sum", "set", "complexity"],
    starterFiles: [
      {
        path: "pairsum.py",
        content: `def has_pair_sum(nums, target):
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] + nums[j] == target:
                return True
    return False
`,
      },
    ],
    entryFile: "pairsum.py",
    entryFunction: "has_pair_sum",
    visibleTests: [
      { name: "real pair", input: [[2, 7, 11, 15], 9], expected: true },
      { name: "single cannot pair", input: [[3], 6], expected: false },
    ],
    hiddenTests: [
      { name: "lone five", input: [[5], 10], expected: false },
      { name: "zero needs two", input: [[0], 0], expected: false },
      { name: "no pair", input: [[1, 2, 3], 7], expected: false },
      { name: "duplicate pair", input: [[3, 3], 6], expected: true },
    ],
    constraints: "nums is a list of ints.",
    hints: [
      "j ranges over ALL indices including i. When is self-pairing legal? Never.",
      "Check complement = target - x against previously SEEN values as you scan.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 15,
    status: "published",
  },
  {
    title: "Max Sum Window of Size K",
    slug: "max-sum-subarray-k",
    description: `The peak-window chart misses the last window and recomputes every sum from scratch: [1, 2, 3, 4, 5] with k=3 reports 9 instead of 12, and [5] with k=1 reports nothing at all.

\`maxSumSubarray(arr, k)\` should return the largest sum of any contiguous length-k window (slide: subtract the leaving element, add the entering one). Right now the loop uses i < arr.length - k (skips the final start) and re-sums slices.

Loop while i + k <= arr.length (or slide in O(n)). Exactly one window exists when arr.length === k.`,
    kind: "logic-error",
    language: "javascript",
    difficulty: "hard",
    category: "performance",
    tags: ["sliding-window", "arrays", "sums"],
    starterFiles: [
      {
        path: "maxsum.js",
        content: `// Largest sum of any contiguous window of exactly k elements.
export function maxSumSubarray(arr, k) {
  let best = -Infinity;
  for (let i = 0; i < arr.length - k; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) sum += arr[j];
    best = Math.max(best, sum);
  }
  return best;
}
`,
      },
    ],
    entryFile: "maxsum.js",
    entryFunction: "maxSumSubarray",
    visibleTests: [
      { name: "last window wins", input: [[1, 2, 3, 4, 5], 3], expected: 12 },
      { name: "single window", input: [[5], 1], expected: 5 },
    ],
    hiddenTests: [
      { name: "tail peak", input: [[1, 1, 1, 10], 2], expected: 11 },
      { name: "all negative", input: [[-1, -2, -3], 2], expected: -3 },
    ],
    constraints: "1 <= k <= arr.length <= 10^5.",
    hints: [
      "How many window starts exist for length n, size k? The loop runs one fewer.",
      "The exit test must include the start at n - k: use <=, then slide the sum.",
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 64,
    estimatedSolveMinutes: 25,
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
