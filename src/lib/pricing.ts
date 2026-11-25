/**
 * What PiCraft sells. This file is the one source of truth: the checkout takes the credits and the price from
 * here, never from the browser. The Waffo product behind each pack and plan must be created with exactly
 * `priceCents` (USD); the webhook warns when a payment differs.
 *
 * Two ways to buy credits:
 *   - credit packs: a one-time payment, the credits never expire;
 *   - subscriptions, weekly or monthly: the credits of each paid period are valid for that period only. They do not
 *     roll over, the next payment replaces what is left, and spending takes the expiring credits first.
 *
 * How the prices were set. A credit costs what the image model charges for one image: about $0.03 to $0.05 on average,
 * up to about $0.07 for a 2K Nano Banana design, plus roughly $0.002 of super-resolution, so $0.055 is used as the
 * cost of a credit and $0.07 as the bad case. Waffo Pancake (merchant of record) keeps 3.9% + $0.50 of every card
 * payment and 1% of what is paid out, and the listed price includes sales tax or VAT (up to about 20% for buyers in
 * the EU). The fixed $0.50 is why small payments are poor, and why a margin counted on the model cost alone would
 * be misleading: 30 credits cost $1.65 to make, but $1.65 is not what is left of $2.99 after tax and fees.
 *
 * Re-priced on 2026-11-12 at the owner's request ("too expensive"): the prices stayed, the credits per payment went up
 * (packs 20/85/250 became 30/100/400, plans 45/100 became 60/150: the Monthly plan was 200 for a moment, but it lost
 * money at any credit cost above $0.04, so the owner took it down to 150). Net margin = (price - VAT - Waffo fee - payout fee
 * - credits x cost) / price, for an EU buyer (20% VAT) who uses every credit. Raw margin is price against the model
 * cost only. At a credit cost of $0.055:
 *
 *   Starter   30 credits  $2.99   $0.100 a credit   net  7%   raw 45%
 *   Creator  100 credits  $8.99   $0.090 a credit   net 12%   raw 39%
 *   Studio   400 credits $24.99   $0.062 a credit   net -11%  raw 12%
 *   Weekly    60 credits  $4.99   $0.083 a credit   net  3%   raw 34%   (every week)
 *   Monthly  150 credits  $9.99   $0.067 a credit   net -9%   raw 17%   (every month)
 *
 * Net margin by cost of a credit ($0.03 / $0.04 / $0.05 / $0.055 / $0.07), in %:
 *   Starter 32 / 22 / 12 / 7 / -8, Creator 40 / 29 / 18 / 12 / -5, Studio 29 / 13 / -3 / -11 / -35,
 *   Weekly 33 / 21 / 9 / 3 / -15, Monthly 29 / 14 / -1 / -9 / -31.
 * Without VAT the net margin is 16 points higher. So at the owner's own estimate of $0.03 to $0.05 a
 * credit the packs and the plans still earn something (the Studio pack and the Monthly plan reach break even at
 * about $0.05), and they lose money only above that when every credit is used: the Monthly plan is sound at the
 * usual cost, and better still because some of its credits expire unused at the end of the month. 2K and 4K cost 2 and 3
 * credits and an animated GIF 2 or 3 (backend/generators/models.json). Measured through OpenRouter in November 2026: a square 6-frame GIF at
 * low quality cost $0.04 to $0.05 and a 12-frame one about $0.06 (a 16:9 one was only measured at medium quality, $0.12);
 * a GPT Image 2K image at medium quality cost $0.03 to $0.10. An edit costs 1 or 2 (backend/app/services/edits.py). Re-do this
 * table when the model prices or the Waffo fees change, and when the Waffo products' descriptions are updated, keep
 * the credit counts there in step with this file.
 */
export type PackId = "starter" | "creator" | "studio";
export type PlanId = "weekly" | "monthly";

export interface CreditPack {
  id: PackId;
  name: string;
  credits: number;
  /** USD cents. */
  priceCents: number;
  /** A short label on the card, such as "Most popular". */
  tag?: string;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  /** Credits granted with every payment. */
  credits: number;
  /** USD cents per period. */
  priceCents: number;
  interval: "week" | "month";
  /**
   * How long the credits of one payment stay valid: the period plus a short buffer, so a renewal that is a few hours
   * late does not leave a gap. A renewal replaces whatever is left.
   */
  validHours: number;
  tag?: string;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 30,
    priceCents: 299,
  },
  {
    id: "creator",
    name: "Creator",
    credits: 100,
    priceCents: 899,
    tag: "Most popular",
  },
  {
    id: "studio",
    name: "Studio",
    credits: 400,
    priceCents: 2499,
  },
];

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  {
    id: "weekly",
    name: "Weekly",
    credits: 60,
    priceCents: 499,
    interval: "week",
    validHours: 7 * 24 + 12,
  },
  {
    id: "monthly",
    name: "Monthly",
    credits: 150,
    priceCents: 999,
    interval: "month",
    // A month is 28 to 31 days; the next renewal replaces what is left, so this only matters after a cancellation.
    validHours: 31 * 24 + 12,
    tag: "Best value",
  },
];

export function findPack(id: unknown): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

export function findPlan(id: unknown): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) ?? null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "$0.30" per credit, for the pricing cards. */
export function pricePerCredit(item: { priceCents: number; credits: number }): string {
  return `$${(item.priceCents / 100 / item.credits).toFixed(2)}`;
}

/** "$4.99 / week". */
export function planPriceLabel(plan: Pick<SubscriptionPlan, "priceCents" | "interval">): string {
  return `${formatPrice(plan.priceCents)} / ${plan.interval}`;
}

/** What the browser needs to draw a pack or a plan. */
export type ClientPack = Pick<CreditPack, "id" | "name" | "credits" | "priceCents" | "tag">;
export type ClientPlan = Pick<SubscriptionPlan, "id" | "name" | "credits" | "priceCents" | "interval" | "tag">;

export function toClientPack({ id, name, credits, priceCents, tag }: CreditPack): ClientPack {
  return { id, name, credits, priceCents, tag };
}

export function toClientPlan({ id, name, credits, priceCents, interval, tag }: SubscriptionPlan): ClientPlan {
  return { id, name, credits, priceCents, interval, tag };
}
