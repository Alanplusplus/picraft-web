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
