"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";

import { useSession } from "./session-provider";

const CHECK_EVERY_MS = 5000;
const MAX_CHECKS = 24;

type Notice = { tone: "ok" | "wait" | "bad"; text: string };
type Arrival = { kind: "purchase" } | { kind: "restore"; outcome: string };

const RESTORE_NOTICES: Record<string, Notice> = {
  ok: { tone: "ok", text: "Your credits and files are back on this device." },
  none: { tone: "bad", text: "We couldn't find credits for that email. Contact support if you think this is a mistake." },
  expired: { tone: "bad", text: "That link has expired. Request a new one and open it within 30 minutes." },
};

/** What the visitor came back with, taken out of the address so a reload does not repeat it. */
function takeArrival(): Arrival | null {
  const params = new URLSearchParams(window.location.search);
  const purchase = params.get("purchase") === "success";
  const restore = params.get("restore");
  if (!purchase && !restore) return null;
  params.delete("purchase");
  params.delete("restore");
  const rest = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
  if (purchase) return { kind: "purchase" };
  return { kind: "restore", outcome: restore && restore in RESTORE_NOTICES ? restore : "expired" };
}

/**
 * Runs on every page and reacts to the two things a visitor can come back with:
 *   ?purchase=success   from Waffo's payment page ("Return to merchant"): make sure the credits are there, asking
 *                       Waffo directly if the webhook has not delivered them yet, and say so.
 *   ?restore=ok|none|expired   from the restore-by-email link: say what happened.
 */
export function PurchaseReturn() {
  const { ready, refresh } = useSession();
  const [notice, setNotice] = useState<Notice | null>(null);
  // Read once: React runs effects twice in development, and the second run must not find the address already clean.
  const arrival = useRef<Arrival | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    if (arrival.current === undefined) arrival.current = takeArrival();
    const current = arrival.current;
    if (!current) return;

    let stop = false;
    void (async () => {
      if (current.kind === "restore") {
        setNotice(RESTORE_NOTICES[current.outcome]);
        trackEvent("restore_return", { result: current.outcome });
        await refresh();
        return;
      }
      setNotice({ tone: "wait", text: "Thank you! We're confirming your payment…" });
      for (let attempt = 0; attempt < MAX_CHECKS && !stop; attempt += 1) {
        const res = await api.confirmPayment();
        if (stop) return;
        const status = res.data?.status;
        if (status === "granted" || status === "settled") {
          await refresh();
          if (stop) return;
          setNotice({ tone: "ok", text: "Payment confirmed. Your credits have been added." });
          trackEvent("purchase_return", { result: status });
          return;
        }
        if (status === "disabled") return;
        await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
      }
      if (!stop) {
        setNotice({
          tone: "wait",
          text: "Your payment is still processing. Credits are added the moment it clears; reload this page in a minute.",
        });
        trackEvent("purchase_return", { result: "pending" });
      }
    })();
    return () => {
      stop = true;
    };
  }, [ready, refresh]);

  if (!notice) return null;
  const tone =
    notice.tone === "ok"
      ? "border-ink-900 bg-white text-ink-900"
      : notice.tone === "bad"
        ? "border-brand-700 bg-brand-50 text-brand-700"
        : "border-ink-300 bg-ink-50 text-ink-800";
  return (
    <div className={`border-b px-4 py-2.5 text-center text-sm font-medium ${tone}`} role="status">
      {notice.text}{" "}
      <button type="button" onClick={() => setNotice(null)} className="ml-2 underline">
        Dismiss
      </button>
    </div>
  );
}
