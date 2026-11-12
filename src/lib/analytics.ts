import { GA_MEASUREMENT_ID } from "./site";

/** Parameters of a Google Analytics event. Values must be short strings, numbers or booleans. */
export type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a custom event to Google Analytics. It does nothing on the server, in development, when the
 * measurement ID is switched off, or when the tag was blocked, so callers never need to check.
 * Event and parameter names are lowercase snake_case, as Google Analytics expects.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
  try {
    window.gtag("event", name, cleaned);
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * The visitor's Google Analytics ids, read from GA's own cookies. They are sent with the checkout so that the
 * server can report the purchase against this visit. Empty when GA is blocked or has not set its cookies yet.
 */
export function readGaIds(): { clientId?: string; sessionId?: string } {
  if (typeof document === "undefined") return {};
  const cookies = new Map<string, string>();
  for (const part of document.cookie.split("; ")) {
    const i = part.indexOf("=");
    if (i > 0) cookies.set(part.slice(0, i), part.slice(i + 1));
  }
  const clientId = cookies.get("_ga")?.match(/^GA\d+\.\d+\.(\d+\.\d+)$/)?.[1];
  const container = cookies.get(`_ga_${GA_MEASUREMENT_ID.replace(/^G-/, "")}`);
  // GS1.1.<session id>.<count>... or GS2.1.s<session id>$o...
  const sessionId = container?.match(/^GS1\.\d+\.(\d+)\./)?.[1] ?? container?.match(/^GS2\.\d+\.s(\d+)\$/)?.[1];
  return { clientId, sessionId };
}
