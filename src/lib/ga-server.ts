import "server-only";

import type { GaIds } from "./ga-ids";
import { GA_MEASUREMENT_ID } from "./site";

/**
 * Reports a purchase to GA4 from the server (Measurement Protocol), once the credits have really been granted.
 *
 * A browser event on the "thank you" page would count a reload twice and miss a buyer who closes the tab, and it
 * would not mean the credits arrived. Here the event carries the GA ids saved at checkout, so the revenue is
 * credited to the visit that brought the buyer (for example a Pinterest click).
 *
 * Needs GA4_API_SECRET (GA admin > data stream > Measurement Protocol API secrets). Without it, or without a
 * browser id (the visitor blocked GA), nothing is sent; no other id is made up.
 */
const ENDPOINT = "https://www.google-analytics.com/mp/collect";

export interface GaPurchase {
  transactionId: string;
  /** USD. */
  value: number;
  currency?: string;
  packId: string;
  packName: string;
  ga?: GaIds;
}

export async function sendGaPurchase(p: GaPurchase): Promise<void> {
  const secret = process.env.GA4_API_SECRET;
  const clientId = p.ga?.clientId;
  if (!secret || !clientId || !GA_MEASUREMENT_ID) return;

  const params: Record<string, unknown> = {
    transaction_id: p.transactionId,
    value: p.value,
    currency: (p.currency || "USD").toUpperCase(),
    items: [{ item_id: p.packId, item_name: p.packName, price: p.value, quantity: 1 }],
    engagement_time_msec: 1,
  };
  if (p.ga?.sessionId) params.session_id = p.ga.sessionId;

  try {
    const res = await fetch(
      `${ENDPOINT}?measurement_id=${encodeURIComponent(GA_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: clientId, events: [{ name: "purchase", params }] }),
        signal: AbortSignal.timeout(5000),
      },
    );
    // The Measurement Protocol answers 2xx even for bad data; check new setups in GA DebugView.
    if (!res.ok) console.error("[ga] measurement protocol rejected:", res.status);
  } catch (e) {
    console.error("[ga] measurement protocol failed:", e instanceof Error ? e.message : e);
  }
}
