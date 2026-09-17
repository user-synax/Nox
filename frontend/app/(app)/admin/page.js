"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  Flag,
  Gavel,
  LoaderCircle,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useAppSession } from "../../../components/SessionScope";
import { Avatar } from "../../../components/Avatar";
import { StatNumber } from "../../../components/Stat";
import { auth, isAdminRole, isStaff } from "../../../lib/auth";

const HOVER =
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]";
const PRESS =
  "transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97]";

const PAGE_SIZE = 20;

const REASON_LABELS = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate speech",
  plagiarism: "Plagiarism",
  explicit: "Explicit",
  other: "Other",
};

const TARGET_LABELS = { solution: "Solution", comment: "Comment", user: "User" };

const ACTION_LABELS = {
  "report.upheld": "Report upheld",
  "report.dismissed": "Report dismissed",
  "solution.hide": "Solution hidden",
  "solution.unhide": "Solution restored",
  "comment.hide": "Comment hidden",
  "comment.unhide": "Comment restored",
  "user.suspend": "User suspended",
  "user.unsuspend": "User restored",
  "user.roles": "Roles changed",
};

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Deep link to the reported thing (best effort from the snapshot). */
function targetHref(report) {
  const snap = report?.snapshot ?? {};
  if (report?.targetType === "solution" && report.targetId) {
    return `/solutions/${report.targetId}`;
  }
  if (report?.targetType === "comment" && snap.solutionId) {
    return `/solutions/${snap.solutionId}#comments`;
  }
  if (report?.targetType === "user" && snap.username) {
    return `/u/${snap.username}`;
  }
  return null;
}

function Chip({ tone = "muted", children }) {
  const tones = {
    muted: "bg-surface-2 text-ink-muted",
    danger: "bg-danger/15 text-danger",
    warn: "bg-gradient-orange/15 text-gradient-orange",
    ok: "bg-success/15 text-success",
    info: "bg-accent-blue/15 text-accent-blue",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${tones[tone] ?? tones.muted}`}
    >
      {children}
    </span>
  );
}

function OverviewCard({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-surface-1 px-4 py-4">
      <p className="text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </p>
      <StatNumber
        value={value}
        className="mt-2.5 block text-[28px] leading-none font-medium tracking-[-0.5px] text-ink"
      />
      {tone ? <p className="mt-1.5 text-[12px] text-ink-muted">{tone}</p> : null}
    </div>
  );
}

/** Inline suspend form — reason + duration, used on reports and user rows. */
function SuspendForm({ busy, error, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm({ reason: reason.trim(), days: days === "never" ? undefined : Number(days) });
      }}
      className="mt-3 rounded-md bg-canvas p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Suspension reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the user)…"
            maxLength={200}
            required
            minLength={3}
            className="Nox-focus w-full rounded-md border border-hairline-soft bg-surface-1 px-3 py-2 text-[13px] text-ink placeholder:text-ink-muted/60"
          />
        </label>
        <label>
          <span className="sr-only">Duration</span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="Nox-focus w-full cursor-pointer rounded-md border border-hairline-soft bg-surface-1 px-3 py-2 text-[13px] text-ink sm:w-auto"
          >
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="never">Indefinite</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-pill border-0 bg-danger/15 px-4 text-[13px] font-medium text-danger disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
        >
          {busy ? <LoaderCircle size={13} aria-hidden="true" className="animate-spin" /> : null}
          {busy ? "Suspending…" : "Confirm suspension"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center rounded-pill border-0 bg-surface-2 px-4 text-[13px] font-medium text-ink ${HOVER}`}
        >
          Cancel
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-[1.5] text-ink-muted">
        Logs the user out everywhere immediately. They&apos;re told the reason and expiry.
      </p>
    </form>
  );
}

function ReportCard({ report, busy, actionError, suspending, suspendError, onHide, onDismiss, onSuspendStart, onSuspendConfirm, onSuspendCancel }) {
  const href = targetHref(report);
  const snap = report.snapshot ?? {};
  const preview = snap.title ?? snap.excerpt ?? (snap.username ? `@${snap.username}` : null);
  return (
    <article className="rounded-xl bg-surface-1 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="info">{TARGET_LABELS[report.targetType] ?? report.targetType}</Chip>
        <Chip tone={report.reason === "spam" ? "muted" : "warn"}>
          {REASON_LABELS[report.reason] ?? report.reason}
        </Chip>
        {report.status !== "open" ? (
          <Chip tone={report.status === "upheld" ? "danger" : "ok"}>{report.status}</Chip>
        ) : null}
        <span className="Nox-mono ml-auto text-[12px] text-ink-muted">
          {timeAgo(report.createdAt)}
        </span>
      </div>
      {preview ? (
        <p className="mt-2.5 line-clamp-2 text-[14px] leading-[1.5] text-ink">
          {snap.title ? snap.title : `“${preview}”`}
        </p>
      ) : null}
      {snap.title && snap.excerpt && snap.excerpt !== snap.title ? (
        <p className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-ink-muted">
          {snap.excerpt}
        </p>
      ) : null}
      {report.details ? (
        <p className="mt-2 border-l-2 border-hairline pl-3 text-[13px] leading-[1.5] text-ink-muted">
          Reporter note: {report.details}
        </p>
      ) : null}
      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
        <span>
          Reported by{" "}
          <span className="font-medium text-ink">
            {report.reporter?.displayName ?? report.reporter?.username ?? "…"}
          </span>
          {report.reporter?.username ? ` @${report.reporter.username}` : ""}
        </span>
        {report.targetAuthor?.username ? (
          <span>
            On{" "}
            <span className="font-medium text-ink">
              {report.targetAuthor.displayName ?? report.targetAuthor.username}
            </span>
            {` @${report.targetAuthor.username}`}
          </span>
        ) : snap.username ? (
          <span>
            On <span className="font-medium text-ink">@{snap.username}</span>
          </span>
        ) : null}
        {report.reviewNote ? <span>Note: {report.reviewNote}</span> : null}
      </p>
      {report.status === "open" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {href ? (
            <Link
              href={href}
              className={`Nox-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-surface-2 px-4 text-[13px] font-medium text-ink no-underline hover:text-ink ${HOVER}`}
            >
              <Eye size={13} aria-hidden="true" />
              Inspect
            </Link>
          ) : null}
          {report.targetType !== "user" ? (
            <button
              type="button"
              onClick={onHide}
              disabled={!!busy}
              className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-danger/15 px-4 text-[13px] font-medium text-danger disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
            >
              {busy === "hide" ? (
                <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
              ) : (
                <EyeOff size={13} aria-hidden="true" />
              )}
              Hide + uphold
            </button>
          ) : (
            <button
              type="button"
              onClick={onSuspendStart}
              disabled={!!busy}
              className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-danger/15 px-4 text-[13px] font-medium text-danger disabled:cursor-wait disabled:opacity-70 ${HOVER} ${PRESS}`}
            >
              <UserX size={13} aria-hidden="true" />
              Suspend user
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            disabled={!!busy}
            className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-surface-2 px-4 text-[13px] font-medium text-ink disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
          >
            {busy === "dismiss" ? (
              <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
            ) : (
              <Check size={13} aria-hidden="true" />
            )}
            Dismiss
          </button>
        </div>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {actionError}
        </p>
      ) : null}
      {suspending ? (
        <SuspendForm
          busy={busy === "suspend"}
          error={suspendError}
          onConfirm={onSuspendConfirm}
          onCancel={onSuspendCancel}
        />
      ) : null}
    </article>
  );
}

function UserRow({ user, canGovern, busy, actionError, suspending, suspendError, onSuspendStart, onSuspendConfirm, onSuspendCancel, onUnsuspend, onRoles }) {
  const roles = user.roles ?? ["USER"];
  const founder = roles.includes("FOUNDER");
  return (
    <article className="rounded-xl bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        <Avatar user={user} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {user.displayName ?? user.username}
            <span className="ml-1.5 font-normal text-ink-muted">@{user.username}</span>
          </p>
          <p className="Nox-mono mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
            {roles.map((r) => (
              <span
                key={r}
                className={`rounded-pill px-2 py-0.5 font-medium ${
                  r === "FOUNDER"
                    ? "bg-gradient-violet/20 text-ink"
                    : r === "ADMIN"
                      ? "bg-accent-blue/15 text-accent-blue"
                      : r === "MODERATOR"
                        ? "bg-success/15 text-success"
                        : "bg-surface-2 text-ink-muted"
                }`}
              >
                {r}
              </span>
            ))}
            {user.suspended ? (
              <span className="rounded-pill bg-danger/15 px-2 py-0.5 font-medium text-danger">
                suspended{user.suspendedUntil ? ` till ${new Date(user.suspendedUntil).toLocaleDateString()}` : ""}
              </span>
            ) : null}
          </p>
          {user.suspended && user.suspendedReason ? (
            <p className="mt-1 text-[12px] text-ink-muted">Reason: {user.suspendedReason}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {user.username ? (
          <Link
            href={`/u/${user.username}`}
            className={`Nox-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-surface-2 px-4 text-[13px] font-medium text-ink no-underline ${HOVER}`}
          >
            <Eye size={13} aria-hidden="true" />
            Profile
          </Link>
        ) : null}
        {user.suspended ? (
          <button
            type="button"
            onClick={onUnsuspend}
            disabled={!!busy}
            className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-success/15 px-4 text-[13px] font-medium text-success disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
          >
            {busy === "unsuspend" ? (
              <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
            ) : (
              <ShieldCheck size={13} aria-hidden="true" />
            )}
            Restore
          </button>
        ) : (
          <button
            type="button"
            onClick={onSuspendStart}
            disabled={!!busy}
            className={`Nox-focus inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-danger/15 px-4 text-[13px] font-medium text-danger disabled:cursor-wait disabled:opacity-70 ${HOVER}`}
          >
            <UserX size={13} aria-hidden="true" />
            Suspend
          </button>
        )}
        {canGovern && !founder ? (
          <label className="inline-flex min-h-[36px] items-center gap-2 rounded-pill bg-surface-2 px-4 text-[13px] text-ink-muted">
            Role
            <select
              value={roles.includes("ADMIN") ? "ADMIN" : roles.includes("MODERATOR") ? "MODERATOR" : "USER"}
              disabled={!!busy}
              onChange={(e) => onRoles([e.target.value])}
              aria-label={`Role for @${user.username}`}
              className="cursor-pointer border-0 bg-transparent text-[13px] font-medium text-ink outline-none"
            >
              <option value="USER">User</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>
            {busy === "roles" ? (
              <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
            ) : null}
          </label>
        ) : founder ? (
          <span className="Nox-mono text-[12px] text-ink-muted">founder · script-only</span>
        ) : null}
      </div>
      {actionError ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {actionError}
        </p>
      ) : null}
      {suspending ? (
        <SuspendForm
          busy={busy === "suspend"}
          error={suspendError}
          onConfirm={onSuspendConfirm}
          onCancel={onSuspendCancel}
        />
      ) : null}
    </article>
  );
}

const TABS = ["Reports", "Users", "Audit"];

export default function AdminPage() {
  const { session } = useAppSession();
  const me = session?.user ?? null;
  const staff = isStaff(me);
  const governor = isAdminRole(me);

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState(null);

  const [reportFilter, setReportFilter] = useState("open");
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  const [reportBusy, setReportBusy] = useState({});
  const [reportErrors, setReportErrors] = useState({});
  const [suspendingReport, setSuspendingReport] = useState(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userBusy, setUserBusy] = useState({});
  const [userErrors, setUserErrors] = useState({});
  const [suspendingUser, setSuspendingUser] = useState(null);

  const [audit, setAudit] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);

  const pillRef = useRef(null);
  const tabRefs = useRef([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const refreshOverview = useCallback(() => {
    if (!staff) return;
    auth
      .adminOverview()
      .then(setOverview)
      .catch(() => {});
  }, [staff]);

  useEffect(() => {
    refreshOverview();
  }, [refreshOverview]);

  /* Reports queue */
  useEffect(() => {
    if (!staff) return;
    let alive = true;
    setReportsLoading(true);
    setReportsError(null);
    auth
      .adminReports(reportFilter, 1, PAGE_SIZE)
      .then((data) => {
        if (!alive) return;
        setReports(data.items ?? []);
        setReportsTotal(data.total ?? 0);
        setReportsLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setReportsError(err?.message ?? "Could not load reports.");
        setReportsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [staff, reportFilter]);

  /* User search (debounced) */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!staff) return;
    let alive = true;
    setUsersLoading(true);
    setUsersError(null);
    auth
      .adminUsers(debouncedQuery, 1, PAGE_SIZE)
      .then((data) => {
        if (!alive) return;
        setUsers(data.items ?? []);
        setUsersTotal(data.total ?? 0);
        setUsersLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setUsersError(err?.message ?? "Could not search users.");
        setUsersLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [staff, debouncedQuery]);

  /* Audit trail */
  useEffect(() => {
    if (!staff) return;
    let alive = true;
    setAuditLoading(true);
    setAuditError(null);
    auth
      .adminAudit(auditPage, PAGE_SIZE)
      .then((data) => {
        if (!alive) return;
        setAudit((prev) => {
          if (auditPage === 1) return data.items ?? [];
          const ids = new Set(prev.map((a) => a.id));
          return [...prev, ...(data.items ?? []).filter((a) => !ids.has(a.id))];
        });
        setAuditTotal(data.total ?? 0);
        setAuditLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setAuditError(err?.message ?? "Could not load audit trail.");
        setAuditLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [staff, auditPage]);

  useEffect(() => {
    const pill = pillRef.current;
    const el = tabRefs.current[tab];
    if (!pill || !el) return;
    const prev = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.style.width = `${el.offsetWidth}px`;
    void pill.offsetWidth;
    pill.style.transition = prev;
  }, [tab, mounted]);

  const movePill = (index, animate) => {
    const pill = pillRef.current;
    const el = tabRefs.current[index];
    if (!pill || !el) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
    }
  };

  if (!staff) {
    return (
      <div data-open={mounted} className="t-panel-slide Nox-auth-enter mx-auto w-full max-w-[760px]">
        <div className="rounded-xl bg-surface-1 p-8 text-center">
          <p className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger/15 text-danger">
            <ShieldAlert size={18} aria-hidden="true" />
          </p>
          <h1 className="Nox-display mt-3 text-[24px] font-medium tracking-[-0.5px]">
            Staff only
          </h1>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-[1.5] text-ink-muted">
            Moderation lives here. If you&apos;re on the team and see this, your account needs
            the Moderator role first.
          </p>
          <Link
            href="/dashboard"
            className={`Nox-focus mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill bg-white px-6 py-[10px] text-[14px] font-medium text-black no-underline ${HOVER} ${PRESS}`}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const runReportAction = async (report, kind, fn) => {
    setReportBusy((m) => ({ ...m, [report.id]: kind }));
    setReportErrors((m) => ({ ...m, [report.id]: null }));
    try {
      await fn();
      // Hiding/suspending auto-resolves; dismissing closes — either way the
      // card leaves the open queue. Other filters refresh on next switch.
      if (reportFilter === "open") {
        setReports((rows) => rows.filter((r) => r.id !== report.id));
        setReportsTotal((t) => Math.max(0, t - 1));
      }
      setSuspendingReport(null);
      refreshOverview();
    } catch (err) {
      setReportErrors((m) => ({ ...m, [report.id]: err?.message ?? "Action failed." }));
    } finally {
      setReportBusy((m) => ({ ...m, [report.id]: null }));
    }
  };

  const hideReasonFor = (report) =>
    `Reported as ${REASON_LABELS[report.reason] ?? report.reason}${
      report.details ? ` — ${report.details.slice(0, 120)}` : ""
    }`;

  const runUserAction = async (user, kind, fn) => {
    setUserBusy((m) => ({ ...m, [user.id]: kind }));
    setUserErrors((m) => ({ ...m, [user.id]: null }));
    try {
      const { user: fresh } = await fn();
      if (fresh) {
        setUsers((rows) => rows.map((u) => (u.id === user.id ? { ...u, ...fresh } : u)));
      }
      setSuspendingUser(null);
      refreshOverview();
    } catch (err) {
      setUserErrors((m) => ({ ...m, [user.id]: err?.message ?? "Action failed." }));
    } finally {
      setUserBusy((m) => ({ ...m, [user.id]: null }));
    }
  };

  return (
    <div data-open={mounted} className="t-panel-slide Nox-auth-enter mx-auto w-full max-w-[760px]">
      <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.08em] text-ink-muted">
        <Gavel size={13} aria-hidden="true" />
        MODERATION
      </p>
      <h1 className="Nox-display mt-2 text-[30px] leading-[1.1] font-medium tracking-[-1px]">
        Keep Nox honest.
      </h1>
      <p className="mt-2 text-[15px] tracking-[-0.15px] text-ink-muted">
        Review reports, hide what violates the rules, and suspend repeat offenders.
        Every action is reversible and written to the audit trail.
      </p>

      {/* Overview */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OverviewCard
          label="Open reports"
          value={overview?.openReports ?? "…"}
          tone={(overview?.openReports ?? 0) > 0 ? "Needs eyes" : "Queue clear"}
        />
        <OverviewCard label="Hidden posts" value={(overview?.hiddenSolutions ?? 0) + (overview?.hiddenComments ?? 0)} />
        <OverviewCard label="Suspended" value={overview?.suspendedUsers ?? "…"} />
        <OverviewCard label="Users" value={overview?.totalUsers ?? "…"} />
      </div>

      {/* Tabs */}
      <div className="t-tabs Nox-tabs-scroll mt-6" role="tablist" aria-label="Moderation sections">
        <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
        {TABS.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={tab === i ? "true" : "false"}
            onClick={() => {
              setTab(i);
              movePill(i, true);
            }}
            className="t-tab Nox-focus px-4 text-[14px] font-medium"
          >
            {label}
            {i === 0 && (overview?.openReports ?? 0) > 0 ? (
              <span className="Nox-mono ml-1.5 rounded-pill bg-danger/15 px-1.5 py-0.5 text-[11px] text-danger">
                {overview.openReports}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 0 ? (
          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Report status">
              {["open", "all"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReportFilter(s)}
                  aria-pressed={reportFilter === s}
                  className={`Nox-focus min-h-[36px] cursor-pointer rounded-pill border-0 px-3.5 py-1.5 text-[13px] font-medium ${HOVER} ${
                    reportFilter === s ? "bg-white text-black" : "bg-surface-2 text-ink-muted hover:text-ink"
                  }`}
                >
                  {s === "open" ? "Open" : "All"}
                </button>
              ))}
              <span className="Nox-mono ml-auto self-center text-[12px] text-ink-muted">
                {reportsTotal} report{reportsTotal === 1 ? "" : "s"}
              </span>
            </div>
            {reportsLoading ? (
              <div className="mt-3 flex flex-col gap-2" aria-label="Loading reports">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[120px] animate-pulse rounded-xl bg-surface-1" />
                ))}
              </div>
            ) : reportsError ? (
              <p role="alert" className="mt-3 rounded-xl bg-surface-1 p-5 text-[14px] text-danger">
                {reportsError}
              </p>
            ) : reports.length === 0 ? (
              <div className="mt-3 rounded-xl bg-surface-1 p-8 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success"
                >
                  <ShieldCheck size={18} />
                </span>
                <p className="mt-3 text-[15px] font-medium text-ink">Queue clear</p>
                <p className="mx-auto mt-1 max-w-[40ch] text-[14px] text-ink-muted">
                  {reportFilter === "open"
                    ? "Nothing waiting — new reports will land here."
                    : "No reports in this view yet."}
                </p>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {reports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    busy={reportBusy[r.id]}
                    actionError={reportErrors[r.id]}
                    suspending={suspendingReport === r.id}
                    suspendError={reportErrors[`${r.id}:suspend`]}
                    onHide={() =>
                      runReportAction(r, "hide", () =>
                        r.targetType === "comment"
                          ? auth.hideComment(r.targetId, hideReasonFor(r))
                          : auth.hideSolution(r.targetId, hideReasonFor(r))
                      )
                    }
                    onDismiss={() =>
                      runReportAction(r, "dismiss", () =>
                        auth.reviewReport(r.id, { status: "dismissed" })
                      )
                    }
                    onSuspendStart={() => setSuspendingReport(r.id)}
                    onSuspendConfirm={({ reason, days }) =>
                      runReportAction(r, "suspend", () =>
                        auth
                          .suspendUser(r.snapshot?.authorId ?? r.targetId, { reason, days })
                          .catch((err) => {
                            setReportErrors((m) => ({
                              ...m,
                              [`${r.id}:suspend`]: err?.message ?? "Suspend failed.",
                            }));
                            throw err;
                          })
                      )
                    }
                    onSuspendCancel={() => {
                      setSuspendingReport(null);
                      setReportErrors((m) => ({ ...m, [`${r.id}:suspend`]: null }));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : tab === 1 ? (
          <div>
            <label className="block">
              <span className="sr-only">Search users</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search username, email, or name…"
                maxLength={80}
                className="Nox-focus w-full rounded-xl border border-hairline-soft bg-surface-1 px-4 py-3 text-[14px] text-ink placeholder:text-ink-muted/60"
              />
            </label>
            {usersLoading ? (
              <div className="mt-3 flex flex-col gap-2" aria-label="Loading users">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[110px] animate-pulse rounded-xl bg-surface-1" />
                ))}
              </div>
            ) : usersError ? (
              <p role="alert" className="mt-3 rounded-xl bg-surface-1 p-5 text-[14px] text-danger">
                {usersError}
              </p>
            ) : users.length === 0 ? (
              <p className="mt-3 rounded-xl bg-surface-1 p-5 text-center text-[14px] text-ink-muted">
                {debouncedQuery ? `No users match “${debouncedQuery}”.` : "No users yet."}
              </p>
            ) : (
              <>
                <p className="Nox-mono mt-3 text-[12px] text-ink-muted">
                  {usersTotal} match{usersTotal === 1 ? "" : "es"}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {users.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      canGovern={governor}
                      busy={userBusy[u.id]}
                      actionError={userErrors[u.id]}
                      suspending={suspendingUser === u.id}
                      suspendError={userErrors[`${u.id}:suspend`]}
                      onSuspendStart={() => setSuspendingUser(u.id)}
                      onSuspendConfirm={({ reason, days }) =>
                        runUserAction(u, "suspend", () =>
                          auth.suspendUser(u.id, { reason, days }).catch((err) => {
                            setUserErrors((m) => ({
                              ...m,
                              [`${u.id}:suspend`]: err?.message ?? "Suspend failed.",
                            }));
                            throw err;
                          })
                        )
                      }
                      onSuspendCancel={() => {
                        setSuspendingUser(null);
                        setUserErrors((m) => ({ ...m, [`${u.id}:suspend`]: null }));
                      }}
                      onUnsuspend={() => runUserAction(u, "unsuspend", () => auth.unsuspendUser(u.id))}
                      onRoles={(roles) => runUserAction(u, "roles", () => auth.updateUserRoles(u.id, roles))}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            {auditError ? (
              <p role="alert" className="rounded-xl bg-surface-1 p-5 text-[14px] text-danger">
                {auditError}
              </p>
            ) : audit.length === 0 && !auditLoading ? (
              <div className="rounded-xl bg-surface-1 p-8 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-muted"
                >
                  <ScrollText size={18} />
                </span>
                <p className="mt-3 text-[15px] font-medium text-ink">No actions yet</p>
                <p className="mx-auto mt-1 max-w-[40ch] text-[14px] text-ink-muted">
                  Every hide, suspension, and role change lands here with who did it.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {audit.map((a) => (
                  <li key={a.id} className="rounded-xl bg-surface-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="muted">{ACTION_LABELS[a.action] ?? a.action}</Chip>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
                        by{" "}
                        <span className="font-medium text-ink">
                          {a.actor?.displayName ?? a.actor?.username ?? "system"}
                        </span>
                        {a.targetType ? (
                          <span className="Nox-mono"> · {a.targetType} {String(a.targetId ?? "").slice(0, 8)}</span>
                        ) : null}
                      </span>
                      <span className="Nox-mono shrink-0 text-[12px] text-ink-muted">
                        {timeAgo(a.createdAt)}
                      </span>
                    </div>
                    {a.metadata?.reason ? (
                      <p className="mt-1 text-[13px] text-ink-muted">
                        Reason: {a.metadata.reason}
                        {a.metadata?.days ? ` · ${a.metadata.days}d` : ""}
                        {a.metadata?.after ? ` · → ${a.metadata.after.join(", ")}` : ""}
                        {a.metadata?.reportsResolved ? ` · ${a.metadata.reportsResolved} report(s) settled` : ""}
                      </p>
                    ) : a.metadata?.after ? (
                      <p className="Nox-mono mt-1 text-[12px] text-ink-muted">
                        → {a.metadata.after.join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {auditLoading ? (
              <div className="mt-2 flex flex-col gap-2" aria-label="Loading audit trail">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[64px] animate-pulse rounded-xl bg-surface-1" />
                ))}
              </div>
            ) : null}
            {!auditLoading && audit.length < auditTotal ? (
              <button
                type="button"
                onClick={() => setAuditPage((p) => p + 1)}
                className={`Nox-focus mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-1 px-5 text-[14px] font-medium text-ink ${HOVER} ${PRESS}`}
              >
                Show more ({audit.length} of {auditTotal})
              </button>
            ) : null}
          </div>
        )}
      </div>

      <p className="mt-6 flex items-start gap-2 text-[12px] leading-[1.6] text-ink-muted">
        <Flag size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        Moderators review and hide — role grants stay with admins, founders are managed
        outside the API, and peers can never action each other.
      </p>
    </div>
  );
}
