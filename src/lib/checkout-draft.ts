"use client";

import { useEffect, useRef } from "react";

/**
 * What a form holds, kept for the trip to Waffo's payment page.
 *
 * Paying happens in the same tab, so the page the visitor was working on is left behind. Coming back with the browser's
 * Back button usually restores it as it was (the browser keeps the page), but returning through "Return to merchant"
 * or a browser that did not keep it loads the page fresh. A form that registers here gets its settings back in that
 * case. Only small things are kept: the choices, the text and the links of photos that were already uploaded (the
 * server holds the photos), never the photos themselves.
 *
 * The draft lives in sessionStorage, so it belongs to this tab, it goes with the tab, and it is used once.
 */

const PREFIX = "picraft_draft:";
const TTL_MS = 2 * 60 * 60 * 1000;

const providers = new Map<string, () => unknown>();

/** Drafts are kept per page and per form: the same form on another page never picks up this one. */
function storageKey(key: string): string {
  return `${PREFIX}${window.location.pathname}:${key}`;
}

/** Called just before the visitor leaves for the payment page: stores what every form on this page asked to keep. */
export function saveDrafts(): void {
  for (const [key, get] of providers) {
    try {
      const data = get();
      if (data === null || data === undefined) continue;
      sessionStorage.setItem(storageKey(key), JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // Storage is full or switched off: the payment must not depend on it.
    }
  }
}

/** Forgets the drafts of this page. Used when the browser brought the page back as it was, so nothing needs restoring. */
export function clearDrafts(): void {
  try {
    const prefix = `${PREFIX}${window.location.pathname}:`;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const name = sessionStorage.key(i);
      if (name?.startsWith(prefix)) sessionStorage.removeItem(name);
    }
  } catch {
    // ignore
  }
}

function takeDraft<T>(key: string): T | null {
  try {
    const name = storageKey(key);
    const raw = sessionStorage.getItem(name);
    if (!raw) return null;
    sessionStorage.removeItem(name);
    const parsed = JSON.parse(raw) as { ts?: number; data?: T };
    if (!parsed || typeof parsed.ts !== "number" || Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Lets a form survive a visit to the payment page. `get` returns what to keep (or null when there is nothing worth
 * keeping); `restore` receives it when the page was loaded again. Values are checked by `restore`, because a draft is
 * only a suggestion: the scene or the model may have changed in the meantime.
 */
export function useCheckoutDraft<T>(key: string, get: () => T | null, restore: (draft: T) => void): void {
  const latest = useRef({ get, restore });
  useEffect(() => {
    latest.current = { get, restore };
  });

  useEffect(() => {
    const draft = takeDraft<T>(key);
    if (draft) latest.current.restore(draft);
    const provider = () => latest.current.get();
    providers.set(key, provider);
    return () => {
      if (providers.get(key) === provider) providers.delete(key);
    };
  }, [key]);
}
