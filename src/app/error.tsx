"use client";

import Link from "next/link";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest matches the server log entry; in production the message of a server error is hidden by Next.js.
    trackEvent("exception", { description: (error.digest ? `digest:${error.digest}` : error.message).slice(0, 100), fatal: true });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Something went wrong</h1>
      <p className="mt-3 text-ink-700">This page could not be loaded. Please try again in a moment.</p>
      {error.digest && <p className="mt-2 text-sm text-ink-500">Reference ID: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800"
        >
          Try again
        </button>
        <Link
          href="/create"
          className="rounded-xl border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-900 hover:border-ink-500"
        >
          See all makers
        </Link>
      </div>
    </div>
  );
}
