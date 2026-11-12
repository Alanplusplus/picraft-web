import { callBackend, getSessionToken } from "@/lib/backend";
import { reply } from "@/lib/route-helpers";
import { rateLimited } from "@/lib/server-rate-limit";
import type { Account } from "@/lib/types";
import { createPortalUrl, waffoConfigured } from "@/lib/waffo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * "Manage my subscription": a one-time address of Waffo's customer portal for the account of the session cookie, where
 * the customer cancels, changes the card or finds receipts. Only the account's own subscription can be reached, because
 * the identity comes from the session and never from the request. The address carries a bearer token, so it is
 * handed to the browser once and never logged.
 */
export async function POST() {
  if (!waffoConfigured()) return reply(503, "Subscriptions are not available yet.");

  const token = await getSessionToken();
  const me = token ? await callBackend<Account>("/v1/me", { token }) : null;
  if (!me || me.code !== 200 || !me.data) return reply(401, "Your session expired. Please refresh the page.");
  if (rateLimited(`portal:${me.data.user_id}`, 10, 10 * 60_000)) return reply(429, "Too many attempts. Please wait a moment.");
  if (!me.data.subscription) return reply(404, "There is no subscription on this account.");

  try {
    return reply(200, "success", { url: await createPortalUrl(me.data.user_id) });
  } catch (e) {
    console.error("[portal] could not open the customer portal:", e instanceof Error ? e.message : e);
    return reply(502, "Couldn't open the subscription page. Please try again, or email support.");
  }
}
