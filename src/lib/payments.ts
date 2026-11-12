import "server-only";

import { after } from "next/server";

import { callBackend } from "./backend";
import type { GaIds } from "./ga-ids";
import { sendGaPurchase } from "./ga-server";
import { formatPrice, type CreditPack, type SubscriptionPlan } from "./pricing";

/**
 * "A payment succeeded, so the buyer gets credits": the one place that does it, for a credit pack and for one paid
 * period of a subscription.
 *
 * Three paths call it: the Waffo webhook (the main one), the confirmation request when the buyer returns to the
 * site, and the daily reconciliation. The backend keeps the payment id unique, so a payment that arrives by two
 * paths, or twice by one, grants its credits once. The credits come from our own price list (lib/pricing.ts), never
 * from anything in the request. A subscription's credits expire (see lib/pricing.ts), counted from `paidAt`.
 */

export interface PaymentFacts {
  /** Waffo's paymentId, the backend's idempotency key. */
  paymentId: string;
  orderId?: string;
  /** What was bought, as read from our own order number or metadata. Null when it cannot be read. */
  pack: CreditPack | null;
  /** Set instead of `pack` for a subscription payment. */
  plan?: SubscriptionPlan | null;
  /** When it was paid (Unix seconds), so late deliveries of an old payment cannot extend its credits. */
  paidAt?: number;
  /** The account that bought. Null when it cannot be read. */
  userId?: string;
  email?: string;
  /** What was really charged, as Waffo prints it ("2.99"). */
  chargedAmount?: string;
  currency?: string;
  /** Webhooks occasionally carry a status other than "succeeded". */
  paymentStatus?: string;
  /** The GA ids saved at checkout, to credit the revenue to the visit. */
  ga?: GaIds;
}

/** What was bought, as far as the grant is concerned. */
export interface PurchasedItem {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
}

export type GrantResult =
  | {
      /**
       * granted: credits added now; duplicate: this payment was granted before; stale: a subscription payment that a
       * newer payment has already replaced (nothing to give).
       */
      status: "granted" | "duplicate" | "stale";
      item: PurchasedItem;
      chargedCents: number | null;
      balance?: number;
    }
  | { status: "ignored"; reason: "not_succeeded" | "zero_amount" }
  | { status: "unmatched"; reason: "no_metadata" | "unknown_account" }
  | { status: "failed"; message: string };

export function toCents(amount: string | undefined): number | null {
  if (amount === undefined) return null;
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export async function grantPayment(facts: PaymentFacts): Promise<GrantResult> {
  const { userId } = facts;
  const plan = facts.plan ?? null;
  const item: PurchasedItem | null = plan ?? facts.pack;
  if (!item || !userId) return { status: "unmatched", reason: "no_metadata" };
  if (facts.paymentStatus && facts.paymentStatus !== "succeeded") return { status: "ignored", reason: "not_succeeded" };

  const charged = toCents(facts.chargedAmount);
  if (charged !== null && charged <= 0) return { status: "ignored", reason: "zero_amount" };

  const common = {
    payment_id: facts.paymentId,
    order_id: facts.orderId,
    user_id: userId,
    credits: item.credits,
    amount_cents: charged ?? item.priceCents,
    currency: (facts.currency || "USD").toLowerCase(),
    email: facts.email || undefined,
  };
  const res = await callBackend<{ granted?: boolean; duplicate?: boolean; stale?: boolean; balance?: number }>(
    plan ? "/v1/internal/payments/grant-subscription" : "/v1/internal/payments/grant",
    {
      method: "POST",
      body: plan
        ? { ...common, plan_id: plan.id, valid_hours: plan.validHours, paid_at: facts.paidAt }
        : { ...common, pack_id: item.id },
    },
  );
  if (res.code === 404) return { status: "unmatched", reason: "unknown_account" };
  if (res.code !== 200) return { status: "failed", message: `${res.code} ${res.message}`.trim() };

  const granted = res.data?.granted === true;
  if (granted) {
    // Only a newly granted payment is reported to GA, so retries and reconciliations never count revenue twice.
    const report = () =>
      sendGaPurchase({
        transactionId: facts.paymentId,
        value: (charged ?? item.priceCents) / 100,
        currency: facts.currency,
        packId: item.id,
        packName: item.name,
        ga: facts.ga,
      });
    try {
      after(report);
    } catch {
      void report();
    }
    console.info(
      `[waffo] granted ${item.credits} credits (${item.id}, ${formatPrice(charged ?? item.priceCents)}) to ${userId}, payment ${facts.paymentId}`,
    );
  }
  return {
    status: granted ? "granted" : res.data?.stale ? "stale" : "duplicate",
    item,
    chargedCents: charged,
    balance: typeof res.data?.balance === "number" ? res.data.balance : undefined,
  };
}

export type SubscriptionStatus = "active" | "canceling" | "past_due" | "canceled";

/** Tells the backend where a customer's subscription stands, from one of Waffo's subscription events. */
export async function syncSubscription(facts: {
  orderId: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** The current period's end as Waffo prints it (an ISO date or time). */
  periodEnd?: string;
  email?: string;
  /** When Waffo says the event happened (ISO). */
  eventAt?: string;
}): Promise<boolean> {
  const toSeconds = (value?: string) => {
    const ms = value ? Date.parse(value) : NaN;
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
  };
  const res = await callBackend("/v1/internal/subscriptions/sync", {
    method: "POST",
    body: {
      order_id: facts.orderId,
      user_id: facts.userId,
      plan_id: facts.plan.id,
      status: facts.status,
      period_end: toSeconds(facts.periodEnd),
      email: facts.email || undefined,
      event_at: toSeconds(facts.eventAt),
    },
  });
  return res.code === 200;
}

/** A payment was fully refunded: the backend takes back the credits of it that are unused. */
export async function refundPayment(paymentId: string): Promise<{ ok: boolean; refunded?: boolean; unknown?: boolean; clawedBack?: number }> {
  const res = await callBackend<{ refunded?: boolean; unknown?: boolean; clawed_back?: number }>(
    "/v1/internal/payments/refund",
    { method: "POST", body: { payment_id: paymentId } },
  );
  if (res.code !== 200) return { ok: false };
  return { ok: true, refunded: res.data?.refunded, unknown: res.data?.unknown, clawedBack: res.data?.clawed_back };
}
