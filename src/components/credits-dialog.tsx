"use client";

import { useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { usePacks } from "@/lib/checkout";

import { PurchasePanel } from "./purchase-panel";
import { useSession } from "./session-provider";

/** What the visitor was about to make when the credits ran out; the window shows it so paying feels like finishing. */
export interface PendingTask {
  /** The maker or generator. */
  title: string;
  /** The visitor's own photo, when the task has one. */
  image?: string | null;
  /** A few short lines about the settings: what the design is, in the visitor's words. */
  details: string[];
  /** The files that come out. */
  downloads: string[];
  /** Credits this task costs. */
  cost: number;
  /** What the button says once the credits have arrived, such as "Remove background"; "Create" when left out. */
  action?: string;
}

function creditsLabel(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/**
 * The window that opens when someone presses Create without enough credits. It names the design they were about to
 * make and lets them buy. Paying takes the visitor to Waffo in this tab; the form behind keeps its settings and photos
 * for the trip (see checkout-draft.ts), and once the credits are there the window turns into a single "Create now"
 * button, so the next click starts the design.
 */
export function CreditsDialog({
  open,
  onClose,
  source,
  task,
  enough,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  source: string;
  task: PendingTask;
  /** The balance now covers the task (the visitor just bought credits). */
  enough: boolean;
  onCreate: () => void;
}) {
  const { account } = useSession();
  const catalog = usePacks();
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  if (open && !opened) setOpened(true);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    if (!element.open) element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    const element = dialog.current;
    if (element && !open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (open && catalog.loaded) trackEvent("purchase_prompt_view", { source, can_buy: catalog.enabled });
  }, [open, catalog.loaded, catalog.enabled, source]);

  const credits = account?.credits ?? 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="credits-dialog-title"
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      className="m-auto max-h-[94vh] w-[min(100%-1rem,38rem)] overflow-y-auto rounded-2xl border-0 bg-white p-5 shadow-2xl backdrop:bg-ink-950/60 sm:p-6"
    >
      {opened && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{enough ? "Credits added" : "One step left"}</p>
              <h2 id="credits-dialog-title" className="mt-1 text-xl font-bold tracking-tight text-ink-950">
                {enough ? "You're all set" : "Get credits to make this"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-ink-400">
              {task.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={task.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="4" width="18" height="16" rx="2.5" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m4 18 5.5-5.5L13 16l3-3 4 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-950">{task.title}</p>
              <ul className="mt-0.5 space-y-0.5 text-xs text-ink-600">
                {task.details.map((line) => (
                  <li key={line} className="truncate">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <span className="shrink-0 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-900">
              {creditsLabel(task.cost)}
            </span>
          </div>
          {task.downloads.length > 0 && (
            <p className="mt-2 text-xs text-ink-500">You&apos;ll download: {task.downloads.join(" · ")}</p>
          )}

          {enough && (
            <div className="mt-5 space-y-2 text-center">
              <p className="text-sm text-ink-700">
                You have {creditsLabel(credits)}. Everything you entered is still here.
              </p>
              <button type="button" onClick={onCreate} className="btn-primary w-full">
                {task.action ?? "Create"} now · {creditsLabel(task.cost)}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-ink-500 underline">
                Not now
              </button>
            </div>
          )}

          {/* Kept in the page while the credits are there, so it can still notice a payment that is being waited for. */}
          <div className={enough ? "hidden" : "mt-5"}>
            <p className="text-sm text-ink-700">
              You have {creditsLabel(credits)} and this needs {task.cost}. What you entered is kept while you pay, so you
              can start the moment you are back.
            </p>
            <div className="mt-3">
              <PurchasePanel source={source} compact />
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
