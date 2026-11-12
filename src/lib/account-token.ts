import "server-only";

import crypto from "node:crypto";

import { SITE_URL } from "./site";

/**
 * "Restore my credits" by email. Credits belong to an anonymous account tied to one browser, so a buyer who clears
 * their cookies or changes device would lose them. Waffo gives us the buyer's email at payment time; the backend
 * keeps it with the payment; this proves a visitor can read that mailbox.
 *
 * The link carries `base64url({e: email, x: expiry, n: nonce}).HMAC`, valid for 30 minutes, signed with a key derived
 * from SERVICE_SECRET. It is not tied to the device that asked: opening it somewhere else restores the account there.
 *
 * Needs RESEND_API_KEY and ACCOUNT_FROM_EMAIL (a sender on a domain verified in Resend). Without them the feature is
 * off and the site does not mention it.
 */
const TTL_MS = 30 * 60 * 1000;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ACCOUNT_FROM_EMAIL && process.env.SERVICE_SECRET);
}

function key(): Buffer {
  return crypto.createHmac("sha256", process.env.SERVICE_SECRET ?? "").update("picraft-restore-link-v1").digest();
}

function mac(body: string): string {
  return crypto.createHmac("sha256", key()).update(body).digest("base64url");
}

export function createAccountToken(email: string): string {
  const payload = { e: email, x: Date.now() + TTL_MS, n: crypto.randomBytes(6).toString("hex") };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body)}`;
}

/** The email the token was issued for, or null when it is forged, malformed or expired. */
export function verifyAccountToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(body));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { e?: string; x?: number };
    if (!parsed.e || !parsed.x || Date.now() > parsed.x) return null;
    return parsed.e;
  } catch {
    return null;
  }
}

export function restoreLink(token: string, origin: string = SITE_URL): string {
  return `${origin}/api/account/restore?token=${encodeURIComponent(token)}`;
}

/** One plain-text email with the restore link and nothing a visitor can write into, so it cannot be used to send spam. */
export async function sendRestoreEmail(to: string, link: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ACCOUNT_FROM_EMAIL,
      to,
      subject: "Restore your PiCraft credits",
      text: [
        "Hi,",
        "",
        "Use the link below to get your PiCraft credits and your files back on this device. It works for 30 minutes.",
        "",
        link,
        "",
        "If you didn't ask for this, ignore this email. Nothing changes unless the link is opened.",
        "",
        "PiCraft",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}`);
}
