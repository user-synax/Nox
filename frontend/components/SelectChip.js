"use client";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

/**
 * Multi-select pill with an inline checkbox check
 * (transitions-dev 25, box + stroke-draw).
 */
export function SelectChip({ selected, onToggle, label, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={label ?? (typeof children === "string" ? children : undefined)}
      onClick={onToggle}
      className={`Nox-focus inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-pill border px-[14px] py-2 text-[14px] font-medium tracking-[-0.14px] ${HOVER} ${PRESS} ${
        selected
          ? "border-accent-blue bg-surface-2 text-ink"
          : "border-hairline-soft bg-surface-1 text-ink-muted hover:text-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`t-check inline-flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border ${
          selected ? "border-accent-blue bg-accent-blue" : "border-hairline bg-transparent"
        }`}
        role="presentation"
      >
        <svg viewBox="0 0 10.1668 10.1668" width="11" height="11" fill="none">
          <path
            d="M1 5.52L3.92 9.17L9.17 1"
            stroke={selected ? "#090909" : "transparent"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </button>
  );
}
