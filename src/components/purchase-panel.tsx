"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { isPlan, startCheckout, usePacks } from "@/lib/checkout";
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  formatPrice,
  planPriceLabel,
  pricePerCredit,
  toClientPack,
  toClientPlan,
  type ClientPack,
  type ClientPlan,
} from "@/lib/pricing";
import { SUPPORT_EMAIL } from "@/lib/site";
import type { Account } from "@/lib/types";

import { useSession } from "./session-provider";

/** How long the buttons stay busy after the visitor was sent to the payment page, if the browser never left. */
const REDIRECT_PATIENCE_MS = 20_000;

type Offer = ClientPack | ClientPlan;

/** "Nov 19, 2026" from a Unix time. */
function formatDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function planName(id: string): string {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id)?.name ?? id;
}

function OfferCard({
  offer,
  busy,
  disabled,
  closed,
  current,
  onBuy,
}: {
  offer: Offer;
  busy: boolean;
  disabled: boolean;
  /** Buying is not open yet: the offer is still shown with its price, and its button says so. */
  closed: boolean;
  /** The visitor already has this subscription. */
  current: boolean;
  onBuy: () => void;
}) {
  const plan = isPlan(offer);
  return (
    <li
      className={`relative flex flex-col rounded-2xl border bg-white p-4 ${
        offer.tag ? "border-brand-500 shadow-soft ring-1 ring-brand-500" : "border-ink-200"
      }`}
    >
      {offer.tag && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          {offer.tag}
        </span>
      )}
      <h3 className="text-sm font-semibold text-ink-900">{offer.name}</h3>
      <p className="mt-1 text-2xl font-bold text-ink-950">
        {offer.credits} <span className="text-base font-semibold">credits</span>
      </p>
      <p className="text-sm text-ink-700">
        {plan ? planPriceLabel(offer) : formatPrice(offer.priceCents)}{" "}
        <span className="text-ink-500">· {pricePerCredit(offer)} each</span>
      </p>
      <p className="text-xs text-ink-500">
        {plan
          ? `Renews every ${offer.interval} until cancelled · credits expire after ${offer.interval === "week" ? "7 days" : "a month"}`
          : "One-time payment · credits never expire"}
      </p>
      <button
        type="button"
        onClick={onBuy}
        disabled={disabled || current}
        className={`mt-3 ${offer.tag ? "btn-primary" : "btn-secondary"}`}
      >
        {busy
          ? "Opening checkout…"
          : current
            ? "Your current plan"
            : closed
              ? "Opening soon"
              : plan
                ? `Subscribe · ${planPriceLabel(offer)}`
                : `Buy ${offer.credits} credits`}
      </button>
    </li>
  );
}

/** What the visitor's subscription is doing, and the way to manage it (cancel, change the card, receipts). */
export function SubscriptionStatus({ account }: { account: Account }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sub = account.subscription;
  if (!sub) return null;

  async function manage() {
    setOpening(true);
    setError(null);
    // Opened from a click, in a new tab, so what the visitor was doing stays as it is.
    const popup = window.open("", "_blank");
    try {
      if (popup) popup.opener = null;
    } catch {
      // ignore
    }
    const res = await api.subscriptionPortal();
    setOpening(false);
    if (res.code !== 200 || !res.data?.url) {
      popup?.close();
      setError(res.message || "Couldn't open the subscription page. Please try again.");
      return;
    }
    if (popup && !popup.closed) popup.location.href = res.data.url;
    else window.location.href = res.data.url;
  }

  const name = planName(sub.plan);
  const end = sub.period_end ? formatDay(sub.period_end) : null;
  const text =
    sub.status === "canceling"
      ? `Your ${name} plan has been cancelled${end ? ` and ends on ${end}` : ""}. Nothing more will be charged.`
      : sub.status === "past_due"
        ? `Your last ${name} payment didn't go through. Update your payment method to keep your plan.`
        : `Your ${name} plan is active${end ? ` and renews on ${end}` : ""}.`;
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm text-ink-800">
      <p className="font-medium">{text}</p>
      {account.sub_credits > 0 && account.sub_expires_at && (
        <p className="mt-0.5 text-xs text-ink-700">
          {account.sub_credits} plan credits left, valid until {formatDay(account.sub_expires_at)}.
        </p>
      )}
      <p className="mt-2">
        <button type="button" onClick={() => void manage()} disabled={opening} className="text-xs font-semibold underline">
          {opening ? "Opening…" : "Manage subscription"}
        </button>
        <span className="text-xs text-ink-500"> · cancel any time, change your card, see receipts</span>
      </p>
      {error && <p className="mt-1 text-xs text-brand-700">{error}</p>}
    </div>
  );
}

function RestoreForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    const res = await api.sendRestoreLink(email);
    setSending(false);
    setMessage({ ok: res.code === 200, text: res.message });
    trackEvent("restore_request", { result: res.code === 200 ? "sent" : "error" });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-ink-700 underline">
        Bought credits before? Restore them by email
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="restore-email" className="block text-xs font-medium text-ink-800">
        The email you used at checkout
      </label>
      <div className="flex gap-2">
        <input
          id="restore-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={sending} className="btn-primary shrink-0 px-4 py-2.5">
          {sending ? "Sending…" : "Send link"}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.ok ? "text-ink-700" : "text-brand-700"}`} role="status">
          {message.text}
        </p>
      )}
    </form>
  );
}

/**
 * The credit packs and the subscription plans with their buy buttons. Paying happens on Waffo's page, which this tab
 * is sent to (see startCheckout). The forms on the page keep their settings for the trip (see checkout-draft.ts), the
 * Back button brings the page back with its buttons free, and after "Return to merchant" PurchaseReturn waits for the
 * credits. In `compact` mode (inside a form that ran out of credits) the two kinds sit behind a small switch.
 */
export function PurchasePanel({ returnPath, source, compact = false }: { returnPath?: string; source: string; compact?: boolean }) {
  const { account } = useSession();
  const catalog = usePacks();
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"packs" | "plans">("packs");
  const patience = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (patience.current) clearTimeout(patience.current);
    },
    [],
  );

  async function onBuy(offer: Offer) {
    setError(null);
    setBuying(offer.id);
    try {
      // Without a given path the buyer comes back to the page they are on.
      await startCheckout(offer, returnPath ?? window.location.pathname, source, {
        // The browser brought this page back from the payment page: the buttons are free again.
        onRestore: () => {
          if (patience.current) clearTimeout(patience.current);
          setBuying(null);
        },
      });
      // The page is on its way to Waffo, so the button stays busy. A navigation the browser refuses must not leave the
      // buttons stuck for good.
      patience.current = setTimeout(() => setBuying(null), REDIRECT_PATIENCE_MS);
    } catch (e) {
      setError((e as Error).message);
      setBuying(null);
    }
  }

  // The packs, the plans and their prices are always on the page, also before the catalog has loaded and while buying is
  // not open yet, so what is sold, for how much and on what terms can be read without opening checkout.
  const open = catalog.loaded && catalog.enabled;
  const packs: ClientPack[] = open ? catalog.packs : CREDIT_PACKS.map(toClientPack);
  const plans: ClientPlan[] = open ? catalog.plans : SUBSCRIPTION_PLANS.map(toClientPlan);
  const closed = catalog.loaded && !catalog.enabled;
  const running = account?.subscription && account.subscription.status !== "canceling" ? account.subscription : null;

  const renderOffers = (offers: Offer[]) => (
    <ul className={`grid gap-4 pt-2 ${offers.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          busy={buying === offer.id}
          disabled={!open || buying !== null || (isPlan(offer) && running !== null)}
          closed={closed}
          current={isPlan(offer) && running?.plan === offer.id}
          onBuy={() => void onBuy(offer)}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-5">
      {account?.subscription && <SubscriptionStatus account={account} />}

      {compact && (
        <div role="tablist" aria-label="How to buy credits" className="flex gap-1 rounded-full bg-ink-100 p-1 text-sm font-medium">
          {(
            [
              ["packs", "Credit packs"],
              ["plans", "Subscriptions"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => setKind(id)}
              className={`flex-1 rounded-full px-3 py-1.5 transition ${
                kind === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(!compact || kind === "packs") && (
        <section aria-labelledby={compact ? undefined : "packs-heading"}>
          {!compact && (
            <>
              <h2 id="packs-heading" className="text-lg font-semibold text-ink-950">
                Credit packs
              </h2>
              <p className="mt-0.5 text-sm text-ink-700">One-time payment. Credits never expire.</p>
            </>
          )}
          {renderOffers(packs)}
        </section>
      )}

      {(!compact || kind === "plans") && (
        <section aria-labelledby={compact ? undefined : "plans-heading"}>
          {!compact && (
            <>
              <h2 id="plans-heading" className="text-lg font-semibold text-ink-950">
                Subscriptions
              </h2>
              <p className="mt-0.5 text-sm text-ink-700">
                Renews automatically every week or month until you cancel. The credits of each period expire with it and
                do not roll over; spending uses them first.
              </p>
            </>
          )}
          {renderOffers(plans)}
        </section>
      )}

      {closed && (
        <p className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700">
          Credit packs and subscriptions open very soon. Email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=PiCraft%20credits`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          and we&apos;ll tell you the day they open.
        </p>
      )}

      {error && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

      <p className="text-xs text-ink-500">
        Prices are in USD. A subscription renews on its own every week or month until you cancel it in{" "}
        <strong className="font-medium text-ink-700">Manage subscription</strong> (one click, effective at the end of the
        period you paid for); credits that come with it are valid for that period only. Credit packs are single payments
        and never expire. Payments are handled by Waffo, our merchant of record, and refunds follow Waffo&apos;s refund policy; see{" "}
        <Link href="/terms#purchases" className="underline">
          the terms
        </Link>
        .
      </p>
      {catalog.canRestore && <RestoreForm />}
    </div>
  );
}
