"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { auth } from "../lib/auth";
import { Avatar } from "./Avatar";

export const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX = 2 * 1024 * 1024;

/**
 * Avatar picker — circular button, instant upload on select, inline status.
 * value: { avatarUrl, displayName, username } · onChange(url) on success.
 */
export function AvatarPicker({ value, onChange, size = 88, hint = true }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const onFile = async (file) => {
    if (!file || busy) return;
    setError(null);
    if (!AVATAR_MIMES.includes(file.type)) {
      setError("Avatar must be a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX) {
      setError("Avatar must be under 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const { avatarUrl } = await auth.uploadAvatar(file);
      onChange(avatarUrl);
    } catch (err) {
      setError(
        err.status === 503
          ? "Avatar uploads aren't available yet — you can add one later."
          : err.message
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label={value?.avatarUrl ? "Change avatar" : "Upload avatar"}
          className="Nox-focus group relative cursor-pointer rounded-full disabled:cursor-wait"
        >
          <Avatar user={value} size={size} />
          <span
            aria-hidden="true"
            className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white transition-opacity duration-[var(--duration-fast)] ${
              busy
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            }`}
          >
            {busy ? (
              <LoaderCircle size={22} className="animate-spin" />
            ) : (
              <Camera size={22} />
            )}
          </span>
        </button>
        {hint ? (
          <div className="text-[13px] leading-[1.4] text-ink-muted">
            <p className="font-medium text-ink">
              {busy ? "Uploading…" : value?.avatarUrl ? "Looking sharp." : "Add an avatar"}
            </p>
            <p className="mt-1">JPEG, PNG or WebP · under 2 MB.</p>
          </div>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_MIMES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[13px] leading-[1.4] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
