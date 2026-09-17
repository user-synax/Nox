"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/auth";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "./ui/contribution-graph";

/** LeetCode-style intensity ramp from solves-per-day. */
function levelFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function formatTooltipDate(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SolveTooltip({ count, date }) {
  const when = formatTooltipDate(date);
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[11px] leading-none">
      <span className="font-semibold">
        {count === 0 ? "No solves" : `${count} solve${count === 1 ? "" : "s"}`}
      </span>
      <span className="text-zinc-400 dark:text-zinc-600">on {when}</span>
    </div>
  );
}

/**
 * Daily-solves contribution graph (GitHub/LeetCode style).
 *
 *   <SolveActivityGraph />                  → signed-in user's own activity (dashboard)
 *   <SolveActivityGraph username="ada" />   → public activity (profile page)
 *
 * Hovering a cell shows "N solves on <date>". Data comes from
 * GET /users/me/activity and GET /users/:username/activity
 * (accepted submissions grouped by UTC day).
 */
export function SolveActivityGraph({ username = null, days = 365 }) {
  const [payload, setPayload] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    const fetchActivity = username
      ? auth.userActivity(username, days)
      : auth.myActivity(days);
    fetchActivity
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [username, days]);

  const data = useMemo(() => {
    if (!payload?.days) return [];
    return payload.days.map((d) => ({
      date: d.date,
      count: d.count,
      level: levelFor(d.count),
    }));
  }, [payload]);

  if (state === "loading") {
    return (
      <div aria-label="Loading solve activity">
        <div className="h-[18px] w-40 animate-pulse rounded bg-surface-2" />
        <div className="mt-3 flex gap-[4px]" aria-hidden="true">
          {Array.from({ length: 26 }).map((_, w) => (
            <div key={w} className="flex flex-col gap-[4px]">
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={d} className="h-3 w-3 animate-pulse rounded-[2px] bg-surface-2" />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 h-[14px] w-56 max-w-full animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="text-[14px] leading-[1.45] text-ink-muted">
        Couldn&apos;t load solve activity right now.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-[14px] leading-[1.45] text-ink-muted">
        No solves yet — accept a challenge and it will show up here.
      </p>
    );
  }

  return (
    <ContributionGraph
      data={data}
      labels={{ totalCount: "{{count}} solves in the last year" }}
    >
      <ContributionGraphCalendar>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            key={`${weekIndex}-${dayIndex}`}
            activity={activity}
            dayIndex={dayIndex}
            weekIndex={weekIndex}
          >
            <SolveTooltip count={activity.count} date={activity.date} />
          </ContributionGraphBlock>
        )}
      </ContributionGraphCalendar>
      <ContributionGraphFooter>
        <ContributionGraphTotalCount />
        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
  );
}
