"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";
import { CREDIT_PACKS, formatPrice } from "@/lib/pricing";

/**
 * Tells a visitor who has too few credits left that more can be bought, where they are looking: above the form when they
 * come back with nothing left, and under the finished image when that image used the last credit. The credits window
 * only opened when Create was pressed, and in production 8 of the 13 visitors who ran out never pressed it again.
 *
 * It names the smallest pack and its price, and says that what they typed stays where it is. The button opens the
 * same credits window as Create does; `placement` and `source` tell the two places apart in analytics.
 */
export function CreditsNudge({
  placement,
  source,
  credits,
  onOpen,
}: {
  placement: "form" | "result";
  source: string;
  /** What is left on the account; zero reads "out of credits", one that is too few reads "not enough". */
  credits: number;
  onOpen: () => void;
}) {
  const pack = CREDIT_PACKS[0];

  useEffect(() => {
    trackEvent("credits_nudge_view", { source, placement });
  }, [source, placement]);

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-ink-800" role="status">
      <p className="font-medium text-ink-950">
        {credits > 0
          ? `You have ${credits} ${credits === 1 ? "credit" : "credits"} left, which isn't enough ${placement === "result" ? "for another" : "for this"}.`
          : placement === "result"
            ? "That was your last credit."
            : "You're out of credits."}
      </p>
      <p className="mt-0.5 text-ink-700">
        {pack.credits} credits are {formatPrice(pack.priceCents)}: one payment, they never expire.{" "}
        {placement === "form" ? "What you entered stays here." : "Your image above stays yours to download."}
      </p>
      <button
        type="button"
        onClick={() => {
          trackEvent("credits_nudge_click", { source, placement });
          onOpen();
        }}
        className="btn-primary mt-2.5 w-full sm:w-auto"
      >
        Get credits
      </button>
    </div>
  );
}
