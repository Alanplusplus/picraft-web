"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Phase = "idle" | "submitting" | "processing" | "done" | "failed";

/**
 * The working area of a maker or generator: what goes in on the left, what comes out on the right.
 *
 * On a desktop both sit side by side from the start, and the result stays in view while the form is used.
 * On a phone only one of them is shown at a time. The form comes first; as soon as a design is started the result
 * area takes over the screen (waiting, then the finished file), the form folds away, and one button brings it back
 * to change something and go again.
 *
 * `run` counts the designs started. Whether the form was reopened belongs to one run, so starting the next run
 * closes it again without anything having to reset it.
 */
export function Workbench({
  phase,
  run,
  input,
  output,
}: {
  phase: Phase;
  run: number;
  input: ReactNode;
  output: ReactNode;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [editingRun, setEditingRun] = useState<number | null>(null);
  const focusOutput = phase === "submitting" || phase === "processing" || phase === "done";
  const editing = editingRun === run;
  const outputFirst = focusOutput && !editing;

  // On a phone, bring the result area to the top of the screen when a design is started.
  useEffect(() => {
    if (phase !== "submitting") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  function reopenForm() {
    setEditingRun(run);
    requestAnimationFrame(() => inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div ref={inputRef} className={`scroll-mt-20 lg:order-1 ${outputFirst ? "hidden lg:block" : "order-1"}`}>
        {editing && focusOutput && (
          <button
            type="button"
            onClick={() => setEditingRun(null)}
            className="mb-3 text-sm font-medium text-brand-700 hover:underline lg:hidden"
          >
            ← Back to the result
          </button>
        )}
        {input}
      </div>
      <div
        ref={outputRef}
        className={`scroll-mt-20 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-1 ${
          focusOutput ? (editing ? "order-2" : "order-1") : "hidden lg:block"
        }`}
      >
        {output}
        {phase === "done" && !editing && (
          <button type="button" onClick={reopenForm} className="btn-secondary mt-3 w-full lg:hidden">
            Change something and create again
          </button>
        )}
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 18 5.5-5.5L13 16l3-3 4 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Before anything is made: a quiet frame where the result will appear, and what the visitor will get. */
export function StageEmpty({ ratio, downloads }: { ratio: string; downloads: string[] }) {
  return (
    <div className="panel p-5">
      <div
        className="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 px-4 text-center text-ink-400"
        style={{ aspectRatio: ratio, maxHeight: "50vh" }}
      >
        <ImageIcon />
        <p className="mt-3 text-sm font-medium text-ink-700">Your design will appear here</p>
        <p className="mt-0.5 text-xs text-ink-500">Fill in the form and press Create.</p>
      </div>
      {downloads.length > 0 && (
        <div className="mx-auto mt-4 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">You&apos;ll download</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-800">
            {downloads.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** While the model works: the frame the result will fill, the time so far and a bar that only ever moves forward. */
export function StageWorking({
  ratio,
  elapsed,
  label,
  hint,
  backdrop,
  expectedSeconds = 75,
}: {
  ratio: string;
  elapsed: number;
  label: string;
  hint: string;
  /** The visitor's own photo, shown faint behind the spinner. */
  backdrop?: string | null;
  expectedSeconds?: number;
}) {
  const percent = Math.min(95, Math.max(4, Math.round((elapsed / expectedSeconds) * 100)));
  return (
    <div className="panel p-5" aria-live="polite">
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-ink-100"
        style={{ aspectRatio: ratio, maxHeight: "50vh" }}
      >
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-md"
          />
        )}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/60 to-white/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <p className="text-base font-semibold text-ink-900">
            {label} <span className="tabular-nums text-ink-500">{elapsed}s</span>
          </p>
        </div>
      </div>
      <div className="mx-auto mt-4 max-w-md">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-ink-100"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-1000"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-ink-500">{hint}</p>
      </div>
    </div>
  );
}

/** After a failed run. The reason is shown next to the Create button; this only says what happened to the credits. */
export function StageFailed({ refunded }: { refunded: boolean }) {
  return (
    <div className="panel p-5 text-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-xl bg-ink-50 px-4 py-14">
        <p className="text-sm font-semibold text-ink-900">Nothing was made this time</p>
        <p className="mt-1 text-sm text-ink-500">
          {refunded
            ? "Your credits are back. Change something and try again."
            : "If it finishes, the file will be waiting in My files."}
        </p>
      </div>
    </div>
  );
}
