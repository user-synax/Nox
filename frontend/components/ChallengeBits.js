"use client";

/** Shared challenge presentation — difficulty badges + label maps. */

const DIFFICULTY_STYLE = {
  easy: "bg-success/15 text-success",
  medium: "bg-accent-blue/15 text-accent-blue",
  hard: "bg-gradient-orange/15 text-gradient-orange",
  expert: "bg-danger/15 text-danger",
};

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };

export const KIND_LABEL = {
  "bug-fix": "Bug Fix",
  "logic-error": "Logic Error",
  "runtime-error": "Runtime Error",
  "api-bug": "API Bug",
};

export function DifficultyBadge({ level }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium tracking-[-0.12px] ${DIFFICULTY_STYLE[level] ?? "bg-surface-2 text-ink-muted"}`}
    >
      {DIFFICULTY_LABEL[level] ?? level}
    </span>
  );
}

export function formatSuccess(rate) {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}
