"use client";

import { useState } from "react";

/** Deterministic muted hue from a string (avatar fallback identity). */
function hueFor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Avatar with initial-letter fallback. Falls back gracefully when the
 * remote image 404s (stale URL) — no broken-image icon, ever.
 */
export function Avatar({ user, size = 40, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? (user?.avatarUrl ?? null) : null;
  const name = user?.displayName || user?.username || "?";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hue = hueFor(user?.username ?? "?");

  if (src) {
    return (
      <img
        src={src}
        alt={`${name}'s avatar`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `hsl(${hue} 35% 20%)`,
        color: `hsl(${hue} 70% 75%)`,
        border: `1px solid hsl(${hue} 35% 32%)`,
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${className}`}
    >
      {initial}
    </span>
  );
}
