"use client";

import Link from "next/link";

import { usePacks } from "@/lib/checkout";
import { FILE_RETENTION_DAYS } from "@/lib/site";

import { Dropdown } from "./dropdown";
import { useSession } from "./session-provider";

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-brand-600">
      <path d="M8 .75c.3 0 .56.2.64.5l.9 3.1a3.4 3.4 0 0 0 2.3 2.3l3.1.9a.67.67 0 0 1 0 1.28l-3.1.9a3.4 3.4 0 0 0-2.3 2.3l-.9 3.1a.67.67 0 0 1-1.28 0l-.9-3.1a3.4 3.4 0 0 0-2.3-2.3l-3.1-.9a.67.67 0 0 1 0-1.28l3.1-.9a3.4 3.4 0 0 0 2.3-2.3l.9-3.1A.67.67 0 0 1 8 .75Z" />
    </svg>
  );
}

const ITEM = "block rounded-xl px-3 py-2.5 transition hover:bg-ink-50";

/** The credit balance, and under it the two places a visitor goes from there: buying more, and their files. */
export function AccountMenu() {
  const { account, ready } = useSession();
  const { enabled } = usePacks();

  if (!ready || !account) {
    return <div className="h-10 w-28 animate-pulse rounded-full bg-ink-100" aria-hidden />;
  }

  const label = account.credits === 1 ? "credit" : "credits";
  const expiring =
    account.sub_credits > 0 && account.sub_expires_at
      ? `${account.sub_credits} of them come from your plan and expire on ${new Date(account.sub_expires_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
      : null;
  // Once credits can be bought the balance is no longer "free" credits.
  const text = enabled ? `${account.credits} ${label}` : `${account.credits} free ${label}`;

  return (
    <Dropdown
      align="right"
      width="w-72"
      button={
        <>
          <SparkIcon />
          <span>{text}</span>
        </>
      }
      buttonClassName={(open) =>
        `flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold text-ink-900 shadow-sm transition ${
          open ? "border-ink-300 bg-ink-50" : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
        }`
      }
    >
      <ul>
        {expiring && <li className="px-3 pb-1 pt-2 text-xs leading-snug text-ink-500">{expiring}</li>}
        <li>
          <Link href="/pricing" className={ITEM}>
            <span className="block text-sm font-semibold text-ink-950">
              {account.subscription ? "Your plan and credits" : enabled ? "Buy credits" : "Pricing and credits"}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-500">
              {account.subscription
                ? "Manage your subscription, or get more credits"
                : enabled
                  ? "Credit packs, or a weekly or monthly plan"
                  : "What a credit buys, and the prices"}
            </span>
          </Link>
        </li>
        <li>
          <Link href="/history" className={ITEM}>
            <span className="block text-sm font-semibold text-ink-950">My files</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-500">
              Your designs from the last {FILE_RETENTION_DAYS} days
            </span>
          </Link>
        </li>
      </ul>
    </Dropdown>
  );
}
