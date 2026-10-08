"use client";

import { useSession } from "./session-provider";

export function AccountMenu() {
  const { account, ready } = useSession();

  if (!ready || !account) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-ink-100" aria-hidden />;
  }

  return (
    <span className="whitespace-nowrap rounded-full bg-ink-100 px-3 py-1 text-sm font-medium text-ink-800">
      {account.credits} <span className="max-[400px]:hidden">free </span>
      {account.credits === 1 ? "credit" : "credits"}
    </span>
  );
}
