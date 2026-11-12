"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const WAIT_LIMIT_MS = 10 * 60 * 1000;

type Offer = ClientPack | ClientPlan;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "Nov 19, 2026" from a Unix time. */
function formatDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function planName(id: string): string {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id)?.name ?? id;
}

function OfferCard({
  offer,
  compact,
  busy,
  disabled,
  closed,
  current,
  onBuy,
}: {
  offer: Offer;
  compact: boolean;
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
      {!compact && <p className="mt-2 flex-1 text-xs text-ink-700">{offer.blurb}</p>}
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
 * The credit packs and the subscription plans with their buy buttons. Paying happens on Waffo's page, in a new tab so
 * the form or result the visitor was working on stays as it is; this tab then waits for the credits and picks them up
 * by itself. In `compact` mode (inside a form that ran out of credits) the two kinds sit behind a small switch.
 */
export function PurchasePanel({ returnPath, source, compact = false }: { returnPath?: string; source: string; compact?: boolean }) {
  const { account, refresh } = useSession();
  const catalog = usePacks();
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<{ baseline: number; offer: Offer } | null>(null);
  const [checks, setChecks] = useState(0);
  const [arrived, setArrived] = useState<{ offer: Offer; balance: number; until: number | null } | null>(null);
  const [kind, setKind] = useState<"packs" | "plans">("packs");

  useEffect(() => {
    if (!waiting) return;
    let stop = false;
    const started = Date.now();
    void (async () => {
      let delay = 0;
      while (!stop && Date.now() - started < WAIT_LIMIT_MS) {
        if (delay) await sleep(delay);
        if (stop) return;
        // The credits normally come from Waffo's webhook; this also asks Waffo directly in case that did not arrive.
        await api.confirmPayment();
        const current = await refresh();
        if (stop) return;
        if (current && current.credits > waiting.baseline) {
          setArrived({ offer: waiting.offer, balance: current.credits, until: current.sub_expires_at });
          setWaiting(null);
          trackEvent("purchase_confirmed", { pack: waiting.offer.id, kind: isPlan(waiting.offer) ? "plan" : "pack", source });
          return;
        }
        delay = Date.now() - started < 120_000 ? 5000 : 15000;
      }
    })();
    return () => {
      stop = true;
    };
  }, [waiting, checks, refresh, source]);

  async function onBuy(offer: Offer) {
    setError(null);
    setArrived(null);
    setBuying(offer.id);
    const baseline = account?.credits ?? 0;
    try {
      // Without a given path the buyer comes back to the page they are on.
      const how = await startCheckout(offer, returnPath ?? window.location.pathname, source, { newTab: true });
      if (how === "new-tab") setWaiting({ baseline, offer });
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
          compact={compact}
          busy={buying === offer.id}
          disabled={!open || buying !== null || waiting !== null || (isPlan(offer) && running !== null)}
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

      {waiting && (
        <div className="space-y-1 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-800" role="status">
          <p className="font-medium">Waiting for your payment…</p>
          <p className="text-xs text-ink-700">
            The checkout opened in a new tab. Your {waiting.offer.credits} credits appear here as soon as the payment
            goes through; you don&apos;t need to do anything.
          </p>
          <p className="flex gap-4 text-xs">
            <button type="button" onClick={() => setChecks((n) => n + 1)} className="font-medium underline">
              I&apos;ve paid, check now
            </button>
            <button type="button" onClick={() => setWaiting(null)} className="text-ink-700 underline">
              Cancel
            </button>
          </p>
        </div>
      )}

      {arrived && (
        <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm font-medium text-ink-900" role="status">
          Thank you! {arrived.offer.credits} credits were added
          {isPlan(arrived.offer) && arrived.until ? `, valid until ${formatDay(arrived.until)}` : ""}. You now have{" "}
          {arrived.balance}.
        </p>
      )}

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
