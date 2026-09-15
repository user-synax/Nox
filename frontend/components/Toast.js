"use client";

/**
 * Bottom toast (transitions-dev 22). Pure CSS open/close — the parent
 * owns timing: showToast sets { id, message }, auto-clears after 2.8s.
 */
export function Toast({ toast }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-5"
    >
      <div
        className={`t-toast ${toast ? "is-open" : ""} pointer-events-auto flex max-w-full items-center gap-2.5 rounded-pill bg-surface-2 px-[15px] py-[10px] text-[14px] font-medium tracking-[-0.14px] text-ink`}
        style={{ boxShadow: "var(--shadow-floating)" }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"
        />
        <span className="truncate">{toast?.message ?? ""}</span>
      </div>
    </div>
  );
}
