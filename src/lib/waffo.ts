import "server-only";

import crypto from "node:crypto";

import { WaffoPancake, verifyWebhook, type WebhookEvent, type WebhookEventData } from "@waffo/pancake-ts";

import { gaIdsToMetadata, type GaIds } from "./ga-ids";
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  findPack,
  findPlan,
  toClientPack,
  toClientPlan,
  type ClientPack,
  type ClientPlan,
  type CreditPack,
  type PackId,
  type PlanId,
  type SubscriptionPlan,
} from "./pricing";

/**
 * Waffo Pancake (merchant of record). Server only: the private key and the product ids come from the environment.
 *
 *   WAFFO_MERCHANT_ID           merchant id (MER_xxx)
 *   WAFFO_PRIVATE_KEY           the API key's RSA private key (PEM; newlines may be written as \n)
 *   WAFFO_STORE_ID              store id (STO_xxx); the webhook is only accepted for this store
 *   WAFFO_ENVIRONMENT           test | prod (default prod); decides which public key verifies webhooks
 *   WAFFO_PRODUCT_PACK_<ID>     the one-time product of a pack, e.g. WAFFO_PRODUCT_PACK_STARTER
 *   WAFFO_PRODUCT_PLAN_<ID>     the subscription product of a plan, e.g. WAFFO_PRODUCT_PLAN_WEEKLY (billing period
 *                               weekly) and WAFFO_PRODUCT_PLAN_MONTHLY (billing period monthly)
 *
 * A pack or plan without a product is not offered. With nothing configured payments are off: the site shows no way
 * to buy, /pricing stays out of the index and the sitemap.
 */

function privateKey(): string | undefined {
  const raw = process.env.WAFFO_PRIVATE_KEY;
  return raw ? raw.replace(/\\n/g, "\n") : undefined;
}

/**
 * Prompt Sift (the prompt check before a generation) only needs the API key, not a store, so it can run before the
 * store is approved, and Waffo can see the calls arriving.
 */
export function siftConfigured(): boolean {
  return Boolean(process.env.WAFFO_MERCHANT_ID && privateKey());
}

export function waffoConfigured(): boolean {
  return Boolean(process.env.WAFFO_MERCHANT_ID && privateKey() && process.env.WAFFO_STORE_ID);
}

function storeId(): string {
  return process.env.WAFFO_STORE_ID || "";
}

function environment(): "test" | "prod" {
  return process.env.WAFFO_ENVIRONMENT === "test" ? "test" : "prod";
}

let client: WaffoPancake | null = null;
export function getClient(): WaffoPancake {
  if (!client) {
    client = new WaffoPancake({ merchantId: process.env.WAFFO_MERCHANT_ID || "", privateKey: privateKey() || "" });
  }
  return client;
}

export function productIdFor(packId: PackId): string | undefined {
  return process.env[`WAFFO_PRODUCT_PACK_${packId.toUpperCase()}`] || undefined;
}

/** Waffo product id to our pack. The reconciliation cannot read order metadata, so the product tells what was bought. */
export function packForProductId(productId: string | undefined | null): CreditPack | null {
  if (!productId) return null;
  return CREDIT_PACKS.find((pack) => productIdFor(pack.id) === productId) ?? null;
}

export function productIdForPlan(planId: PlanId): string | undefined {
  return process.env[`WAFFO_PRODUCT_PLAN_${planId.toUpperCase()}`] || undefined;
}

/** Waffo subscription product id to our plan (the reconciliation reads the product of the order). */
export function planForProductId(productId: string | undefined | null): SubscriptionPlan | null {
  if (!productId) return null;
  return SUBSCRIPTION_PLANS.find((plan) => productIdForPlan(plan.id) === productId) ?? null;
}

/** The packs that can be bought right now, as the browser needs them. */
export function availablePacks(): ClientPack[] {
  if (!waffoConfigured()) return [];
  return CREDIT_PACKS.filter((pack) => productIdFor(pack.id)).map(toClientPack);
}

/** The subscription plans that can be bought right now. */
export function availablePlans(): ClientPlan[] {
  if (!waffoConfigured()) return [];
  return SUBSCRIPTION_PLANS.filter((plan) => productIdForPlan(plan.id)).map(toClientPlan);
}

export function paymentsEnabled(): boolean {
  return availablePacks().length > 0 || availablePlans().length > 0;
}

const EXTERNAL_ID_PREFIX = "pc|";

/**
 * Our order number: `pc|<account id>|<pack or plan id>|<random>` (at most 128 characters, Waffo's limit). Waffo
 * returns it in the webhook and in the GraphQL payments, which is how the reconciliation finds whose payment it is.
 * The random part makes every checkout unique. A subscription keeps its number for every renewal.
 */
export function buildOrderExternalId(userId: string, itemId: PackId | PlanId): string {
  return `${EXTERNAL_ID_PREFIX}${userId}|${itemId}|${crypto.randomBytes(3).toString("hex")}`.slice(0, 128);
}

/** Who bought what: exactly one of `pack` and `plan` is set. */
export function parseOrderExternalId(
  value: string | undefined | null,
): { userId: string; pack: CreditPack | null; plan: SubscriptionPlan | null } | null {
  if (!value || !value.startsWith(EXTERNAL_ID_PREFIX)) return null;
  const [userId, itemId] = value.slice(EXTERNAL_ID_PREFIX.length).split("|");
  const pack = findPack(itemId);
  const plan = pack ? null : findPlan(itemId);
  return userId && (pack || plan) ? { userId, pack, plan } : null;
}

export async function createCheckout(params: {
  pack: CreditPack;
  userId: string;
  /** Where "Return to merchant" goes after paying. Must be an absolute https URL; leave out on local http. */
  successUrl?: string;
  ga?: GaIds;
}): Promise<{ url: string }> {
  const productId = productIdFor(params.pack.id);
  if (!productId) throw new Error(`No Waffo product configured for ${params.pack.id}`);

  const session = await getClient().checkout.anonymous.create({
    productId,
    currency: "USD",
    language: "en",
    successUrl: params.successUrl,
    // Shows up as orderMetadata in every webhook for this order; the GraphQL API cannot read it.
    metadata: { user_id: params.userId, pack: params.pack.id, ...gaIdsToMetadata(params.ga) },
    orderMerchantExternalId: buildOrderExternalId(params.userId, params.pack.id),
  });
  return { url: session.checkoutUrl };
}

/**
 * Starts a subscription checkout. Unlike a pack, a subscription is bound to our account id (`buyerIdentity`): that is
 * what lets the customer open Waffo's customer portal later to cancel, change the card or see receipts, and it keeps the
 * subscription tied to the account even if the customer types another email at checkout.
 */
export async function createSubscriptionCheckout(params: {
  plan: SubscriptionPlan;
  userId: string;
  successUrl?: string;
  ga?: GaIds;
}): Promise<{ url: string }> {
  const productId = productIdForPlan(params.plan.id);
  if (!productId) throw new Error(`No Waffo product configured for ${params.plan.id}`);

  const session = await getClient().checkout.authenticated.create({
    productId,
    currency: "USD",
    language: "en",
    buyerIdentity: params.userId,
    successUrl: params.successUrl,
    metadata: { user_id: params.userId, plan: params.plan.id, ...gaIdsToMetadata(params.ga) },
    orderMerchantExternalId: buildOrderExternalId(params.userId, params.plan.id),
  });
  return { url: session.checkoutUrl };
}

/** A one-time address of Waffo's customer portal for this account (cancel, payment method, receipts). It carries a bearer token. */
export async function createPortalUrl(userId: string): Promise<string> {
  const { portalUrl } = await getClient().auth.createCustomerPortalLink({ storeId: storeId(), buyerIdentity: userId });
  return portalUrl;
}

/** Checks a webhook's signature (RSA-SHA256, public key built into the SDK) and that it is for our store. */
export function verifyWaffoWebhook(rawBody: string, signature: string | null): WebhookEvent<WebhookEventData> {
  const event = verifyWebhook<WebhookEventData>(rawBody, signature, { environment: environment() });
  if (event.storeId !== storeId()) throw new Error(`Webhook for unexpected store ${event.storeId}`);
  return event;
}

export { storeId as waffoStoreId, environment as waffoEnvironment };
