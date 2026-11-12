"use client";

import { useEffect, useState } from "react";

import { api } from "./api-client";
import { readGaIds, trackEvent } from "./analytics";
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

/**
 * Creates a Waffo checkout for a pack or a subscription plan and sends the visitor to the hosted payment page. With `newTab` the page stays as it is
 * (a form with photos in it, a result on screen) and the payment opens beside it; browsers only allow that inside a
 * click handler, so call this before any await, and it falls back to leaving the page when the tab is blocked.
 * Throws an Error with a message fit to show.
 */
export async function startCheckout(
  item: ClientPack | ClientPlan,
  returnPath: string,
  source: string,
  options: { newTab?: boolean } = {},
): Promise<"new-tab" | "redirect"> {
  const kind = isPlan(item) ? "plan" : "pack";
  trackEvent("checkout_start", { pack: item.id, kind, value: item.priceCents / 100, currency: "USD", source });

  let popup: Window | null = null;
  if (options.newTab) {
    popup = window.open("", "_blank");
    if (popup) {
      try {
        popup.opener = null; // the payment page must not be able to reach this one
      } catch {
        // ignore
      }
    }
  }

  const res = await api.checkout(isPlan(item) ? { plan: item.id } : { pack: item.id }, returnPath, readGaIds());
  if (res.code !== 200 || !res.data?.url) {
    popup?.close();
    trackEvent("checkout_error", { pack: item.id, kind, status: res.code, source });
    throw new Error(res.message || "Couldn't start checkout. Please try again.");
  }
  if (popup && !popup.closed) {
    popup.location.href = res.data.url;
    return "new-tab";
  }
  window.location.href = res.data.url;
  return "redirect";
}
