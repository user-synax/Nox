import { Resend } from "resend";
import { env } from "../env.js";

/**
 * Outbound email — Resend in any env with a key, dev-outbox fallback local.
 *
 *   - RESEND_API_KEY set → sends via Resend (prod and dev alike).
 *   - No key + non-prod → logs + persists to `devOutbox` (smoke/frontend dev).
 *   - No key + prod → throws; env.js also fails fast at boot so this is
 *     unreachable unless the key is removed at runtime.
 *
 * In dev the outbox is ALWAYS written (even when Resend sends) so the
 * smoke suite and frontend devs have a deterministic link source.
 * `kind`/`url` mirror the old recordDevOutbox rows ({ email, kind, url }).
 */

let resend = null;
function client() {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(db, { to, subject, html, text, kind, url }) {
  const email = String(to ?? "").toLowerCase();
  const api = client();

  if (api) {
    try {
      const { error } = await api.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject,
        html,
        ...(text ? { text } : {}),
      });
      if (error) throw new Error(error.message ?? "Resend send failed");
    } catch (err) {
      // Better Auth swallows email-callback failures (signup still 200s),
      // so a broken key/unverified domain would silently eat every link.
      // Prod throws loud; dev falls back to the outbox so local work
      // never blocks on provider state.
      console.error(`[email] Resend send failed (${kind}):`, err?.message ?? err);
      if (env.NODE_ENV === "production") {
        throw new Error("Could not send email. Try again shortly.");
      }
      console.error(`[email] dev fallback to outbox for ${email}`);
    }
  } else if (env.NODE_ENV === "production") {
    // Boot guard in env.js should prevent this; loud failure beats a
    // silent drop if the key disappears at runtime.
    console.error(`[email] no RESEND_API_KEY in production (${kind} to ${email})`);
    throw new Error("Could not send email. Try again shortly.");
  } else {
    console.log(`[email] dev stub (${kind}) for ${email}: ${url}`);
  }

  // Dev observability: smoke + frontend devs finish flows without SMTP.
  if (env.NODE_ENV !== "production" && db && kind && url) {
    try {
      await db.collection("devOutbox").updateOne(
        { email, kind },
        { $set: { email, kind, url, createdAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[email] devOutbox write failed (${kind}):`, err?.message ?? err);
    }
  }
}

/**
 * Production boot guard — call once before listening. Fails fast when the
 * sender domain isn't verified, instead of silently dropping every
 * verification/reset link (the failure mode that motivated this).
 * Skipped outside production so local dev never depends on provider state.
 */
export async function assertEmailReady() {
  if (env.NODE_ENV !== "production") return;
  const domain = /@([^>\s]+)>?$/.exec(env.EMAIL_FROM)?.[1] ?? null;
  if (!domain) {
    console.error(`[email] cannot parse a domain from EMAIL_FROM=${env.EMAIL_FROM}`);
    process.exit(1);
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    const body = await res.json().catch(() => ({}));
    const found = (body.data ?? []).find(
      (d) => String(d.name ?? "").toLowerCase() === domain.toLowerCase()
    );
    if (!found || found.status !== "verified") {
      console.error(
        `[email] sender domain ${domain} is ${found ? found.status : "missing"} in Resend — verify it at https://resend.com/domains`
      );
      process.exit(1);
    }
    console.log(`[email] sender domain ${domain} verified`);
  } catch (err) {
    console.error("[email] could not verify sender domain:", err?.message ?? err);
    process.exit(1);
  }
}

function shell(title, body, cta, href) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#080B0F;color:#F5F7FA;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#11161C;border:1px solid #222A33;border-radius:12px;padding:32px">
    <p style="font-size:22px;font-weight:700;margin:0 0 8px">Nox</p>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="font-size:15px;line-height:1.5;color:#98A2B3;margin:0 0 24px">${body}</p>
    <a href="${href}" style="display:inline-block;background:#fff;color:#000;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:100px">${cta}</a>
    <p style="font-size:12px;color:#98A2B3;margin:24px 0 0">If the button doesn't work, paste this link:<br>${href}</p>
  </div>
</div>`;
}

export function verifyEmailHtml(url) {
  return shell(
    "Verify your email",
    "One click confirms this address belongs to you. Then you can log in and start Noxing.",
    "Verify email",
    url
  );
}

export function resetPasswordHtml(url) {
  return shell(
    "Reset your password",
    "Someone requested a password reset for this account. If that was you, set a new password with the button below.",
    "Reset password",
    url
  );
}
