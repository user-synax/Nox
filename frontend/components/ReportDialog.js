"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flag, LoaderCircle } from "lucide-react";
import { auth } from "../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const REASONS = [
  { value: "spam", label: "Spam or scam", hint: "Ads, scams, or mass-posted noise" },
  { value: "harassment", label: "Harassment", hint: "Targeted abuse toward a person" },
  { value: "hate", label: "Hate speech", hint: "Attacks based on identity" },
  { value: "plagiarism", label: "Plagiarism", hint: "Copied without credit" },
  { value: "explicit", label: "Explicit content", hint: "Not safe for a dev community" },
  { value: "other", label: "Something else", hint: "Tell us what's wrong below" },
];

/**
 * Flag button + report dialog for any reportable target
 * (solution | comment | user). Self-contained: files POST /reports,
 * surfaces the 409 already-reported state, and thanks on success.
 *
 * Render next to likes/actions — it stays quiet (icon-only) until used.
 */
export function ReportButton({ targetType, targetId, label = "Report" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector("input")?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  const close = () => {
    if (sending) return;
    setOpen(false);
    setError(null);
    // Keep the thank-you if they reopen mid-session — no, reset for reuse.
    setDone(false);
    setDetails("");
    setReason("spam");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending || done) return;
    if (reason === "other" && details.trim().length < 3) {
      setError("Add a few words so the team knows what to look at.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await auth.createReport({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      // 409 = already reported (or already hidden) — show it plainly.
      setError(err?.message ?? "Could not file this report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={`Nox-focus inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink ${HOVER}`}
      >
        <Flag size={13} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <button
            type="button"
            aria-label="Close report dialog"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 cursor-default border-0 bg-black/60 p-0"
          />
          <div
            ref={dialogRef}
            style={{ boxShadow: "var(--shadow-floating)" }}
            className="relative w-full max-w-[440px] rounded-xl border border-hairline bg-surface-1 p-5"
          >
            {done ? (
              <div className="py-4 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success"
                >
                  <Check size={18} strokeWidth={2.5} />
                </span>
                <p className="mt-3 text-[15px] font-medium text-ink">Report received</p>
                <p className="mx-auto mt-1 max-w-[36ch] text-[14px] leading-[1.5] text-ink-muted">
                  Thanks — a moderator will review it shortly.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className={`Nox-focus mt-4 inline-flex min-h-[40px] cursor-pointer items-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink ${HOVER}`}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-[15px] font-medium tracking-[-0.15px] text-ink">
                  {label}
                </h2>
                <p className="mt-1 text-[13px] leading-[1.5] text-ink-muted">
                  Flagged for the moderation team — the author isn&apos;t told who reported.
                </p>
                <div className="mt-3 flex flex-col gap-1" role="radiogroup" aria-label="Reason">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 ${HOVER} ${
                        reason === r.value ? "bg-surface-2" : "hover:bg-surface-2/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="mt-1 shrink-0 accent-[#4ba9e1]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-ink">{r.label}</span>
                        <span className="block text-[12px] text-ink-muted">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="mt-2 block">
                  <span className="mb-1 block text-[13px] font-medium text-ink-muted">
                    Details {reason === "other" ? "(required)" : "(optional)"}
                  </span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Anything that helps a moderator decide…"
                    className="Nox-focus w-full resize-y rounded-md border border-hairline-soft bg-canvas px-3 py-2.5 text-[14px] leading-[1.55] text-ink placeholder:text-ink-muted/60"
                  />
                </label>
                {error ? (
                  <p role="alert" className="mt-2 text-[13px] leading-[1.5] text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className={`Nox-focus inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-white px-5 text-[14px] font-medium text-black disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
                  >
                    {sending ? (
                      <>
                        <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send report"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className={`Nox-focus inline-flex min-h-[40px] cursor-pointer items-center rounded-pill border-0 bg-surface-2 px-5 text-[14px] font-medium text-ink ${HOVER}`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
