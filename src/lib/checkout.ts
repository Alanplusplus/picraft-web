"use client";

import { useEffect, useState } from "react";

import { api } from "./api-client";
import { readGaIds, trackEvent } from "./analytics";
import { clearDrafts, saveDrafts } from "./checkout-draft";
import type { ClientPack, ClientPlan } from "./pricing";

export interface PackCatalog {
  loaded: boolean;
  enabled: boolean;
  packs: ClientPack[];
  /** The subscription plans (weekly, monthly) that can be bought now. */
  plans: ClientPlan[];
  /** True when the restore-by-email form can work (the server can send mail). */
  canRestore: boolean;
}

const EMPTY: PackCatalog = { loaded: false, enabled: false, packs: [], plans: [], canRestore: false };

let cached: PackCatalog | null = null;
let inflight: Promise<PackCatalog> | null = null;

function loadCatalog(): Promise<PackCatalog> {
  if (cached) return Promise.resolve(cached);
  inflight ??= api
    .packs()
    .then((res) => {
      cached = {
        loaded: true,
        enabled: Boolean(res.data?.enabled),
        packs: res.data?.packs ?? [],
        plans: res.data?.plans ?? [],
        canRestore: Boolean(res.data?.canRestore),
      };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The packs and plans that can be bought now. `enabled` is false until payments are set up; the page then shows no buy buttons. */
export function usePacks(): PackCatalog {
  const [catalog, setCatalog] = useState<PackCatalog>(cached ?? EMPTY);

  useEffect(() => {
    let alive = true;
    void loadCatalog().then((value) => {
      if (alive) setCatalog(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return catalog;
}

export function isPlan(item: ClientPack | ClientPlan): item is ClientPlan {
  return "interval" in item;
}

const CONTEXT_KEY = "picraft_checkout_ctx";
const CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;

/** What was being bought when the visitor left for the payment page; read again when they come back. */
export interface CheckoutContext {
  pack: string;
  kind: "pack" | "plan";
  credits: number;
  source: string;
  ts: number;
}

function saveContext(context: CheckoutContext): void {
  try {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Storage is switched off: the payment does not depend on it.
  }
}

/** Reads and forgets the context of the last checkout of this tab. Anything older than two hours counts as gone. */
export function consumeCheckoutContext(): CheckoutContext | null {
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CONTEXT_KEY);
    const context = JSON.parse(raw) as CheckoutContext;
    if (!context?.pack || Date.now() - context.ts > CONTEXT_TTL_MS) return null;
    return context;
  } catch {
    return null;
  }
}

/**
 * Creates a Waffo checkout for a pack or a subscription plan and takes the visitor to the hosted payment page in this
 * same tab. A new tab is not used: browsers (Safari and phones above all) block one that is opened after a network
 * call, and Waffo's own way is a plain redirect.
 *
 * What the page holds is kept first (see checkout-draft.ts). If the visitor leaves the payment page with the Back
 * button, the browser usually brings this page back exactly as it was, with its buttons still busy; `onRestore` is
 * called then so the caller can free them. Coming back through "Return to merchant" loads the page fresh with
 * `?purchase=success`, which PurchaseReturn picks up.
 *
 * Resolves as soon as the redirect has been started, and the page is then on its way out: keep the buttons busy.
 * Throws an Error with a message fit to show, when the checkout could not be created.
 */
export async function startCheckout(
  item: ClientPack | ClientPlan,
  returnPath: string,
  source: string,
  options: { onRestore?: () => void } = {},
): Promise<void> {
  const kind = isPlan(item) ? "plan" : "pack";
  trackEvent("checkout_start", { pack: item.id, kind, value: item.priceCents / 100, currency: "USD", source });

  const res = await api.checkout(isPlan(item) ? { plan: item.id } : { pack: item.id }, returnPath, readGaIds());
  if (res.code !== 200 || !res.data?.url) {
    trackEvent("checkout_error", { pack: item.id, kind, status: res.code, source });
    throw new Error(res.message || "Couldn't start checkout. Please try again.");
  }

  saveDrafts();
  saveContext({ pack: item.id, kind, credits: item.credits, source, ts: Date.now() });
  trackEvent("checkout_opened", { pack: item.id, kind, source });

  // Back from the payment page, with the page kept by the browser: nothing to restore, so the saved copy goes, and the
  // caller frees its buttons. Waffo has no cancel address to send the visitor to, so this is also how an abandoned
  // payment page is counted.
  const onShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    window.removeEventListener("pageshow", onShow);
    clearDrafts();
    consumeCheckoutContext();
    trackEvent("checkout_returned", { pack: item.id, kind, source });
    options.onRestore?.();
  };
  window.addEventListener("pageshow", onShow);

  window.location.assign(res.data.url);
}
