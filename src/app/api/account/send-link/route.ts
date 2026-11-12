import { NextRequest } from "next/server";

import { EMAIL_RE, createAccountToken, emailEnabled, restoreLink, sendRestoreEmail } from "@/lib/account-token";
import { callBackend } from "@/lib/backend";
import { clientIp, reply, siteOrigin } from "@/lib/route-helpers";
import { rateLimited } from "@/lib/server-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC = "If that email address was used to buy credits, a link is on its way. It works for 30 minutes.";

/**
 * Emails a restore link to an address that paid for credits before. The answer is the same whether or not the
 * address is known, so the form cannot be used to find out who is a customer.
 */
export async function POST(request: NextRequest) {
  if (!emailEnabled()) return reply(503, "Restoring by email isn't available. Please contact support@picraft.ai.");

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return reply(400, "Please enter a valid email address.");

  if (rateLimited(`restore-ip:${clientIp(request)}`, 5, 10 * 60_000) || rateLimited(`restore-mail:${email}`, 3, 60 * 60_000)) {
    return reply(429, "Too many requests. Please try again later.");
  }

  const known = await callBackend<{ known?: boolean }>("/v1/internal/accounts/known", { method: "POST", body: { email } });
  if (known.code === 200 && known.data?.known) {
    try {
      await sendRestoreEmail(email, restoreLink(createAccountToken(email), siteOrigin(request)));
    } catch (e) {
      console.error("[account] could not send the restore email:", e instanceof Error ? e.message : e);
      return reply(502, "We couldn't send the email right now. Please try again later.");
    }
  }
  return reply(200, GENERIC);
}
