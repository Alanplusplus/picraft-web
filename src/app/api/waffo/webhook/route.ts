import { after, NextRequest, NextResponse } from "next/server";
import type { WebhookEvent, WebhookEventData } from "@waffo/pancake-ts";

import { readGaIds } from "@/lib/ga-ids";
import { grantPayment, refundPayment, syncSubscription, toCents, type SubscriptionStatus } from "@/lib/payments";
import { findPack, findPlan, formatPrice } from "@/lib/pricing";
import { parseOrderExternalId, verifyWaffoWebhook } from "@/lib/waffo";
import { logReconcile, reconcilePayments } from "@/lib/waffo-reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Who bought what, from the order number (always present) or the metadata written at checkout. */
function readOrder(data: WebhookEventData) {
  const external = parseOrderExternalId(data.orderMerchantExternalId);
  const userId = external?.userId ?? data.orderMetadata?.user_id;
  const pack = external ? external.pack : findPack(data.orderMetadata?.pack);
  const plan = external ? external.plan : pack ? null : findPlan(data.orderMetadata?.plan);
  return { userId, pack, plan };
}

/** Subscription events that only change where the subscription stands. */
const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  "subscription.activated": "active",
  "subscription.renewed": "active",
  "subscription.recovered": "active",
  "subscription.uncanceled": "active",
  "subscription.plan_changed": "active",
  "subscription.canceling": "canceling",
  "subscription.past_due": "past_due",
  "subscription.canceled": "canceled",
};

/**
 * Waffo's one callback address. It checks the signature and the store, then:
 *   order.completed                  a pack was paid: grant the credits
 *   subscription.payment_succeeded   one period of a subscription was paid (the first, or a renewal): grant that
 *                                    period's credits, which expire and replace what is left of the last period
 *   subscription.*                   activated, renewed, canceling, canceled, past due...: remember where the
 *                                    subscription stands, for the account page
 *   refund.succeeded                 a full refund: take back the credits of that payment that are still unused
 * Everything downstream is idempotent. A temporary failure answers 500 so Waffo retries; an event that no retry can
 * fix (not our order, an event we do not use) answers 200.
 */
export async function POST(request: NextRequest) {
  if (!process.env.WAFFO_STORE_ID) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

  const rawBody = await request.text();
  let event: WebhookEvent<WebhookEventData>;
  try {
    event = verifyWaffoWebhook(rawBody, request.headers.get("x-waffo-signature"));
  } catch (e) {
    // Right after going live this usually means WAFFO_ENVIRONMENT does not match the API key's, or a wrong store id.
    console.error("[waffo] webhook rejected:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { data, eventType } = event;
  try {
    if (eventType === "order.completed") return await onPayment(data);
    if (eventType === "subscription.payment_succeeded") return await onPayment(data, event.timestamp);
    if (eventType in SUBSCRIPTION_STATUS) return await onSubscriptionEvent(data, eventType, event.timestamp);
    if (eventType === "refund.succeeded") return await onRefund(data);
    if (eventType === "refund.failed") {
      console.error("[waffo] a refund failed:", data.orderId, data.paymentId, data.paymentFailureReason ?? "");
    }
  } catch (e) {
    console.error("[waffo] handler error:", eventType, event.eventId, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

/** `paidAtIso` is given for a subscription payment, whose credits are counted from the time of payment. */
async function onPayment(data: WebhookEventData, paidAtIso?: string) {
  const { userId, pack, plan } = readOrder(data);
  const paymentId = data.paymentId || "";
  if (!paymentId) {
    console.error("[waffo] payment event without a payment id:", data.orderId);
    return NextResponse.json({ received: true });
  }

  const paidAtMs = paidAtIso ? Date.parse(paidAtIso) : NaN;
  const result = await grantPayment({
    paymentId,
    orderId: data.orderId,
    pack,
    plan,
    paidAt: Number.isFinite(paidAtMs) ? Math.floor(paidAtMs / 1000) : undefined,
    userId,
    email: data.buyerEmail || undefined,
    chargedAmount: data.chargedAmount,
    currency: data.currency,
    paymentStatus: data.paymentStatus,
    ga: readGaIds(data.orderMetadata),
  });

  switch (result.status) {
    case "unmatched":
      // Money was taken but there is nobody to give credits to (an order we did not create, or a deleted account).
      console.error(
        `[waffo] PAYMENT WITHOUT AN ACCOUNT (${result.reason}): ${paymentId}, order ${data.orderId}, ` +
          `${data.chargedAmount ?? "?"} ${data.currency}. Credits were NOT granted: grant by hand or refund.`,
      );
      return NextResponse.json({ received: true }); // retrying would not change anything
    case "failed":
      console.error("[waffo] grant rejected:", paymentId, result.message);
      return NextResponse.json({ error: "Grant failed" }, { status: 500 }); // Waffo retries; the grant is idempotent
    case "granted": {
      const charged = result.chargedCents;
      if (charged !== null && charged !== result.item.priceCents) {
        console.warn(
          `[waffo] charged ${formatPrice(charged)} but the price list says ${formatPrice(result.item.priceCents)} for ` +
            `${result.item.id} (payment ${paymentId}). Credits follow the price list; check the product price in Waffo.`,
        );
      }
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ received: true });
}

async function onSubscriptionEvent(data: WebhookEventData, eventType: string, eventAt: string) {
  const { userId, plan } = readOrder(data);
  if (!userId || !plan) {
    // A subscription this site did not create (or one that predates the order number); nothing to keep.
    console.warn("[waffo] subscription event for an order this site cannot match:", eventType, data.orderId);
    return NextResponse.json({ received: true });
  }

  const stored = await syncSubscription({
    orderId: data.orderId,
    userId,
    plan,
    status: SUBSCRIPTION_STATUS[eventType],
    periodEnd: data.currentPeriodEnd,
    email: data.buyerEmail || undefined,
    eventAt,
  });
  if (!stored) {
    console.error("[waffo] could not store the subscription state:", eventType, data.orderId);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  // The first payment of a subscription, and a renewal, normally arrive as their own payment event; asking Waffo for
  // this account's recent payments as well means a payment event that goes missing still gives the credits now.
  if (eventType === "subscription.activated" || eventType === "subscription.renewed") {
    const check = async () => {
      try {
        logReconcile(await reconcilePayments({ lookbackHours: 6, userId }), "buyer");
      } catch (e) {
        console.error("[waffo] check after", eventType, "failed:", e instanceof Error ? e.message : e);
      }
    };
    try {
      after(check);
    } catch {
      void check();
    }
  }
  return NextResponse.json({ received: true });
}

async function onRefund(data: WebhookEventData) {
  if (!data.paymentId) return NextResponse.json({ received: true });

  // Only a full refund takes credits back; a partial one is left for a person to decide.
  const refunded = toCents(data.refundedAmount);
  const original = toCents(data.originalChargedAmount);
  if (refunded !== null && original !== null && refunded < original) {
    console.warn(
      `[waffo] partial refund of ${data.refundedAmount} on ${data.originalChargedAmount} for payment ${data.paymentId}; credits left as they are.`,
    );
    return NextResponse.json({ received: true });
  }

  const result = await refundPayment(data.paymentId);
  if (!result.ok) {
    console.error("[waffo] refund could not be applied:", data.paymentId);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
  if (result.unknown) {
    console.warn("[waffo] refund for a payment this site has no record of:", data.paymentId, data.orderId);
  } else if (result.refunded) {
    console.info(`[waffo] refunded ${data.paymentId}: took back ${result.clawedBack ?? 0} unused credits`);
  }
  return NextResponse.json({ received: true });
}
