import { callBackend, getSessionToken } from "@/lib/backend";
import { reply } from "@/lib/route-helpers";
import { rateLimited } from "@/lib/server-rate-limit";
import type { Account, ConfirmResult } from "@/lib/types";
import { waffoConfigured } from "@/lib/waffo";
import { logReconcile, reconcilePayments } from "@/lib/waffo-reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * "Did my payment arrive?" Called when the buyer returns from the payment page, or while the buyer waits for the
 * credits. The credits normally come from Waffo's webhook; this asks Waffo for this account's succeeded payments
 * of the last 6 hours and grants any that are missing (idempotent, so it cannot double a webhook).
 *
 * It only ever looks at the account of the session cookie; nothing in the request names an account or a payment.
 *
 * status: granted (credits added just now), settled (found a payment whose credits were already there),
 * none (no recent payment: still processing, or none was made), error (the check failed; try again).
 */
export async function POST() {
  if (!waffoConfigured()) return reply<ConfirmResult>(200, "success", { status: "disabled" });

  const token = await getSessionToken();
  const me = token ? await callBackend<Account>("/v1/me", { token }) : null;
  if (!me || me.code !== 200 || !me.data) return reply(401, "Your session expired. Please refresh the page.");
  const userId = me.data.user_id;

  if (rateLimited(`confirm:${userId}`, 20, 10 * 60_000)) return reply(429, "Too many checks. Please wait a moment.");

  try {
    const report = await reconcilePayments({ lookbackHours: 6, userId });
    logReconcile(report, "buyer");
    const status: ConfirmResult["status"] = report.granted.length
      ? "granted"
      : report.settled > 0
        ? "settled"
        : report.failed.length
          ? "error"
          : "none";
    return reply<ConfirmResult>(200, "success", { status });
  } catch (e) {
    // Needs a look: the Waffo credentials do not belong together (merchant, key, store, environment).
    console.error("[checkout/confirm] could not ask Waffo for payments:", e instanceof Error ? e.message : e);
    return reply(502, "Couldn't check your payment right now. Please try again in a moment.");
  }
}
