import "server-only";

import { grantPayment, type GrantResult } from "./payments";
import { getClient, packForProductId, parseOrderExternalId, planForProductId, waffoConfigured, waffoStoreId } from "./waffo";

/**
 * Asks Waffo for the payments that succeeded and checks that each one has its credits here; a missing one is
 * granted now. This is what keeps a mistake in the webhook (not set up, wrong URL, a failed delivery) from leaving a
 * buyer without credits and without anyone noticing.
 *
 * Two callers:
 * - the buyer's browser, after paying (only that account's payments), through /api/checkout/confirm;
 * - the daily job (/api/cron/waffo-reconcile), which skips payments younger than a few minutes so it does not race
 *   the webhook.
 * Granting is idempotent in the backend, so asking twice, or at the same time as the webhook, does no harm.
 *
 * Waffo's GraphQL API does not return order metadata, so the account and the pack or plan come from the order number
 * (`pc|<account>|<pack or plan>|…`, the same for every renewal of a subscription) and from the product id. A
 * subscription payment's credits count from the time it was paid, so a payment found late is not given extra time.
 */

const PAGE_SIZE = 100;
const MAX_PAGES = 3;

interface RawOrder {
  id: string;
  buyerEmail?: string;
  orderMerchantExternalId?: string | null;
  onetimeProduct?: { id: string } | null;
}

interface RawSubscriptionOrder {
  id: string;
  buyerEmail?: string;
  subscriptionProduct?: { id: string } | null;
}

interface RawPayment {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  orderMerchantExternalId?: string | null;
  isFullyRefunded?: boolean;
  refundedAmount?: { display?: string } | null;
  amount?: { display?: string; currency?: string } | null;
  onetimeOrder?: RawOrder | null;
  subscriptionOrder?: RawSubscriptionOrder | null;
}

const PAYMENTS_QUERY = `query ($storeId: String, $limit: Int, $offset: Int, $filter: PaymentFilter) {
  payments(storeId: $storeId, limit: $limit, offset: $offset, filter: $filter) {
    id orderId status createdAt isFullyRefunded orderMerchantExternalId
    refundedAmount { display }
    amount { display currency }
    onetimeOrder { id buyerEmail orderMerchantExternalId onetimeProduct { id } }
    subscriptionOrder { id buyerEmail subscriptionProduct { id } }
  }
}`;

async function fetchSucceededPayments(sinceMs: number): Promise<RawPayment[]> {
  const since = new Date(sinceMs).toISOString();
  const rows: RawPayment[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await getClient().graphql.query<{ payments?: RawPayment[] }>({
      query: PAYMENTS_QUERY,
      variables: {
        storeId: waffoStoreId(),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        filter: { createdAt: { gte: since }, status: { eq: "succeeded" } },
      },
    });
    if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
    const batch = res.data?.payments ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export interface ReconcileEntry {
  paymentId: string;
  orderId: string;
  createdAt: string;
  /** The pack or plan id. */
  pack?: string;
  userId?: string;
  amount?: string;
  result: GrantResult;
}

export interface ReconcileReport {
  /** Succeeded payments looked at (only the account's own when one is given). */
  checked: number;
  /** Granted just now: the webhook did not handle them. */
  granted: ReconcileEntry[];
  /** Had their credits already. */
  settled: number;
  /** Cannot be tied to an account or a pack: someone has to look. */
  unmatched: ReconcileEntry[];
  failed: ReconcileEntry[];
}

export async function reconcilePayments(options: {
  lookbackHours: number;
  /** Skip payments younger than this, so the job does not race a webhook that is still arriving. */
  minAgeMinutes?: number;
  /** Only this account's payments (the buyer asking for a check). */
  userId?: string;
}): Promise<ReconcileReport> {
  const report: ReconcileReport = { checked: 0, granted: [], settled: 0, unmatched: [], failed: [] };
  if (!waffoConfigured()) return report;

  const now = Date.now();
  const rows = await fetchSucceededPayments(now - options.lookbackHours * 3600_000);
  const youngest = options.minAgeMinutes ? now - options.minAgeMinutes * 60_000 : Infinity;

  for (const row of rows) {
    if (Date.parse(row.createdAt) > youngest) continue;
    // A fully refunded payment gets no credits back.
    if (row.isFullyRefunded || Number(row.refundedAmount?.display ?? 0) > 0) continue;

    const order = row.onetimeOrder ?? row.subscriptionOrder;
    if (!order) continue;
    const external = parseOrderExternalId(row.orderMerchantExternalId ?? row.onetimeOrder?.orderMerchantExternalId);
    if (options.userId && external?.userId !== options.userId) continue;

    // What was bought: from our order number, or else from the Waffo product of the order.
    const pack = external ? external.pack : packForProductId(row.onetimeOrder?.onetimeProduct?.id);
    const plan = external ? external.plan : planForProductId(row.subscriptionOrder?.subscriptionProduct?.id);
    const bought = plan ?? pack;
    report.checked += 1;

    let result: GrantResult;
    try {
      result = await grantPayment({
        paymentId: row.id,
        orderId: row.orderId,
        pack,
        plan,
        paidAt: Number.isFinite(Date.parse(row.createdAt)) ? Math.floor(Date.parse(row.createdAt) / 1000) : undefined,
        userId: external?.userId,
        email: order.buyerEmail || undefined,
        chargedAmount: row.amount?.display,
        currency: row.amount?.currency,
      });
    } catch (e) {
      result = { status: "failed", message: e instanceof Error ? e.message : String(e) };
    }
    const entry: ReconcileEntry = {
      paymentId: row.id,
      orderId: row.orderId,
      createdAt: row.createdAt,
      pack: bought?.id,
      userId: external?.userId,
      amount: row.amount?.display ? `${row.amount.display} ${(row.amount.currency || "USD").toUpperCase()}` : undefined,
      result,
    };

    if (result.status === "granted") report.granted.push(entry);
    else if (result.status === "duplicate" || result.status === "stale") report.settled += 1;
    else if (result.status === "unmatched") report.unmatched.push(entry);
    else if (result.status === "failed") report.failed.push(entry);
  }
  return report;
}

/** Writes what the reconciliation found to the log, loudly when someone has to act. */
export function logReconcile(report: ReconcileReport, source: "cron" | "buyer"): void {
  const who = source === "buyer" ? "the buyer's confirmation check" : "the daily reconciliation";
  for (const e of report.granted) {
    console.warn(
      `[waffo] ${who} granted a payment the webhook missed: ${e.paymentId} (${e.pack}, ${e.amount}). ` +
        "Check Waffo > Webhooks: the URL, the subscribed events, and the delivery log.",
    );
  }
  for (const e of report.unmatched) {
    console.error(
      `[waffo] PAYMENT WITHOUT AN ACCOUNT: ${e.paymentId} (${e.amount}), order ${e.orderId}, ` +
        `reason ${e.result.status === "unmatched" ? e.result.reason : "?"}. Credits were NOT granted: grant them by hand or refund.`,
    );
  }
  for (const e of report.failed) {
    console.error(
      `[waffo] GRANT FAILED: ${e.paymentId} (${e.pack}, ${e.amount}): ${e.result.status === "failed" ? e.result.message : "?"}. ` +
        "Is the backend up, and is SERVICE_SECRET the same on both sides?",
    );
  }
}
