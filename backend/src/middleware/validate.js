/**
 * Zod body/query validator — responds 422 with the first friendly issue.
 * Usage: app.post("/x", validate(schema), handler)
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return res.status(422).json({
        error: issues[0]?.message ?? "Invalid input.",
        issues,
      });
    }
    req[source] = parsed.data;
    next();
  };
}
