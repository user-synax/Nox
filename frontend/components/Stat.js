"use client";

/**
 * Number with digit pop-in entrance (transitions-dev 02).
 * Content mounts when data arrives, so the entrance plays naturally —
 * no re-trigger bookkeeping needed for static profile stats.
 */
export function StatNumber({ value, className = "" }) {
  const chars = String(value ?? 0).split("");
  return (
    <span
      className={`t-digit-group is-animating Nox-mono ${className}`}
      aria-label={String(value ?? 0)}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="t-digit"
          data-stagger={
            i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
