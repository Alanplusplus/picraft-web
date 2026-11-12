"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { FILE_RETENTION_DAYS, SUPPORT_EMAIL } from "@/lib/site";
import type { TaskView } from "@/lib/types";

import { ResultFiles } from "./result-files";
import { useSession } from "./session-provider";

type SceneInfo = { name: string; summary: string; path: string };

/** A list this old has links that may have run out; coming back to the tab loads it again. */
const REFRESH_AFTER_MS = 30 * 60 * 1000;
/** A picture that fails to load right after a fresh load is gone for good; asking again would change nothing. */
const STALE_REFETCH_MS = 5 * 60 * 1000;
const POLL_MS = 5000;
/** Show how long a file has left only when it is getting close. */
const SHOW_DAYS_LEFT = 14;
const DAY_S = 24 * 60 * 60;
/** The site is in English, so dates are too, whatever the browser's language is. */
const LOCALE = "en-US";

export function HistoryNotice() {
  const { account } = useSession();
  return (
    <div className="mt-10 rounded-2xl bg-ink-50 p-5 text-sm leading-relaxed text-ink-700">
      <p>
        Files are kept for {FILE_RETENTION_DAYS} days and then deleted automatically, so download the ones you want to
        keep.
      </p>
      {account && (
        <p className="mt-2">
          Reference ID: <code className="rounded bg-white px-1.5 py-0.5 text-xs text-ink-950">{account.user_id}</code>.
          Include it when you email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          about your files or to ask us to delete them.
        </p>
      )}
    </div>
  );
}

/** Keep what is already on screen for finished designs, so a refresh doesn't make every picture load again. */
function mergeItems(previous: TaskView[], fresh: TaskView[]): TaskView[] {
  const known = new Map(previous.map((item) => [item.task_id, item]));
  return fresh.map((item) => {
    const old = known.get(item.task_id);
    return old && old.status === "done" && item.status === "done" ? old : item;
  });
}

function daysLeft(item: TaskView, nowMs: number): number {
  return Math.max(0, FILE_RETENTION_DAYS - Math.floor((nowMs / 1000 - item.created_at) / DAY_S));
}

function dayLabel(seconds: number, nowMs: number): string {
  const date = new Date(seconds * 1000);
  const today = new Date(nowMs);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  const yesterday = new Date(nowMs - DAY_S * 1000);
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The small picture of one design. It tries the thumbnail, then the full preview; when both fail the link has either
 * run out (the list is asked for again, at most now and then) or the file is gone, and a placeholder says so.
 */
function Thumb({ item, onDead }: { item: TaskView; onDead: () => void }) {
  const sources = [item.thumb_url, item.preview_url].filter((url): url is string => Boolean(url));
  const key = sources.join("|");
  // Which sources failed is remembered against the links it was learned for, so fresh links start over.
  const [failed, setFailed] = useState({ key: "", count: 0 });
  const count = failed.key === key ? failed.count : 0;
  const transparent = item.files.some((file) => file.format === "png");

  if (count >= sources.length) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-ink-100 px-3 text-center text-xs text-ink-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="m4 18 5.5-5.5L13 16l3-3 4 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Preview unavailable
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={sources[count]}
      src={sources[count]}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed({ key, count: count + 1 });
        if (count + 1 >= sources.length) onDead();
      }}
      className={`h-full w-full object-cover ${transparent ? "checkerboard" : "bg-ink-100"}`}
    />
  );
}

function Viewer({
  item,
  scene,
  position,
  total,
  nowMs,
  onStep,
  onClose,
  onNewVersion,
}: {
  item: TaskView;
  scene: SceneInfo | undefined;
  position: number;
  total: number;
  nowMs: number;
  onStep: (delta: -1 | 1) => void;
  onClose: () => void;
  /** An enlarged or cut-out copy was made in the window: it is a new design in the list. */
  onNewVersion: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const left = daysLeft(item, nowMs);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (element.open) element.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={scene?.name ?? "Design"}
      onClose={() => {
        // A close that was queued before the window was opened again (React's double run in development) is stale.
        if (!dialog.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onStep(-1);
        if (event.key === "ArrowRight") onStep(1);
      }}
      className="m-auto max-h-[94vh] w-[min(100%-1rem,48rem)] overflow-y-auto rounded-2xl border-0 bg-white p-4 shadow-2xl backdrop:bg-ink-950/60 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {scene ? (
            <Link href={scene.path} className="block truncate font-semibold text-ink-950 hover:text-brand-700">
              {scene.name}
            </Link>
          ) : (
            <p className="truncate font-semibold text-ink-950">{item.scene}</p>
          )}
          <p className="text-xs text-ink-500">
            {new Date(item.created_at * 1000).toLocaleString(LOCALE)} · deleted automatically in {left}{" "}
            {left === 1 ? "day" : "days"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        >
          ×
        </button>
      </div>

      <ResultFiles
        key={item.task_id}
        task={item}
        source="history"
        layout="dialog"
        onNewVersion={onNewVersion}
        share={scene ? { sceneName: scene.name, summary: scene.summary, path: scene.path } : undefined}
      />

      {total > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => onStep(-1)}
            disabled={position === 0}
            className="rounded-lg px-3 py-1.5 font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ← Newer
          </button>
          <span className="text-xs text-ink-500">
            {position + 1} of {total}
          </span>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={position === total - 1}
            className="rounded-lg px-3 py-1.5 font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Older →
          </button>
        </div>
      )}
    </dialog>
  );
}

export function HistoryList({ scenes }: { scenes: Record<string, SceneInfo> }) {
  const { ready, account } = useSession();
  const userId = account?.user_id;
  const [state, setState] = useState<{ items: TaskView[]; loadedAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const lastLoad = useRef(0);

  // `replace` swaps every link for the fresh ones; otherwise what is already shown is kept.
  const load = useCallback((replace: boolean) => {
    return api.history().then((res) => {
      if (res.code !== 200 || !res.data) {
        setError(res.message);
        return;
      }
      const fresh = res.data.items;
      const now = Date.now();
      lastLoad.current = now;
      setError(null);
      setState((prev) => ({ items: replace || !prev ? fresh : mergeItems(prev.items, fresh), loadedAt: now }));
    });
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    void load(true);
  }, [ready, userId, load]);

  // A design that is still being made turns into a picture here without a reload.
  const waiting = state?.items.some((item) => item.status === "processing") ?? false;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => void load(false), POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, state, load]);

  // Links last days, so a tab left open for long gets new ones when it is looked at again.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > REFRESH_AFTER_MS) void load(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const onDead = useCallback(() => {
    if (Date.now() - lastLoad.current > STALE_REFETCH_MS) void load(true);
  }, [load]);

  if (!state) {
    if (error) return <p className="text-sm text-brand-700">{error}</p>;
    return (
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        aria-label="Loading your files"
      >
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} className="aspect-square animate-pulse rounded-xl bg-ink-100" />
        ))}
      </ul>
    );
  }

  const { items, loadedAt } = state;
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-700">
        Nothing here yet.{" "}
        <Link href="/create" className="font-medium text-brand-700 hover:underline">
          Make something
        </Link>
        .
      </p>
    );
  }

  const shown = items.filter((item) => item.status !== "failed");
  const failed = items.filter((item) => item.status === "failed");
  const counts = new Map<string, number>();
  for (const item of shown) counts.set(item.scene, (counts.get(item.scene) ?? 0) + 1);
  const activeFilter = filter !== "all" && counts.has(filter) ? filter : "all";
  const visible = activeFilter === "all" ? shown : shown.filter((item) => item.scene === activeFilter);
  const viewable = visible.filter((item) => item.status === "done");
  const openIndex = openId ? viewable.findIndex((item) => item.task_id === openId) : -1;

  const groups: { label: string; items: TaskView[] }[] = [];
  for (const item of visible) {
    const label = dayLabel(item.created_at, loadedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div>
      {counts.size > 1 && (
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group"
          aria-label="Filter by maker"
        >
          {[["all", shown.length] as const, ...[...counts.entries()].sort((a, b) => b[1] - a[1])].map(
            ([scene, count]) => (
              <button
                key={scene}
                type="button"
                aria-pressed={activeFilter === scene}
                onClick={() => setFilter(scene)}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${
                  activeFilter === scene
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                }`}
              >
                {scene === "all" ? "All" : (scenes[scene]?.name ?? scene)} <span className="opacity-60">{count}</span>
              </button>
            ),
          )}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="mt-6 first:mt-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-700">
            {group.label} <span className="font-normal text-ink-400">· {group.items.length}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.items.map((item) => {
              const scene = scenes[item.scene];
              const left = daysLeft(item, loadedAt);
              const first = item.files[0];
              if (item.status !== "done") {
                return (
                  <li
                    key={item.task_id}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 text-center text-xs text-ink-500"
                  >
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    Still designing…
                  </li>
                );
              }
              return (
                <li
                  key={item.task_id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-ink-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(item.task_id)}
                    aria-label={`Open ${scene?.name ?? item.scene}, ${new Date(item.created_at * 1000).toLocaleString(LOCALE)}`}
                    className="absolute inset-0 block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Thumb item={item} onDead={onDead} />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent px-2.5 pb-2 pt-8 text-left text-white">
                      <span className="block truncate text-xs font-semibold">{scene?.name ?? item.scene}</span>
                      <span className="block text-[11px] opacity-80">
                        {new Date(item.created_at * 1000).toLocaleTimeString(LOCALE, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </button>
                  {left <= SHOW_DAYS_LEFT && (
                    <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      {left} {left === 1 ? "day" : "days"} left
                    </span>
                  )}
                  {first && (
                    <a
                      href={first.url}
                      download
                      aria-label={`Download ${first.label}`}
                      title={`Download ${first.label}`}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-sm backdrop-blur transition hover:bg-white hover:text-brand-700"
                    >
                      <DownloadIcon />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {failed.length > 0 && (
        <details className="mt-8 text-sm text-ink-500">
          <summary className="cursor-pointer select-none hover:text-ink-800">
            {failed.length} {failed.length === 1 ? "attempt" : "attempts"} that didn&apos;t finish
          </summary>
          <ul className="mt-2 space-y-1.5">
            {failed.map((item) => (
              <li key={item.task_id}>
                <span className="font-medium text-ink-700">{scenes[item.scene]?.name ?? item.scene}</span>
                {" · "}
                {new Date(item.created_at * 1000).toLocaleString(LOCALE)}
                {item.error ? ` · ${item.error}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {openIndex >= 0 && (
        <Viewer
          item={viewable[openIndex]}
          scene={scenes[viewable[openIndex].scene]}
          position={openIndex}
          total={viewable.length}
          nowMs={loadedAt}
          onStep={(delta) => {
            const next = viewable[openIndex + delta];
            if (next) setOpenId(next.task_id);
          }}
          onClose={() => setOpenId(null)}
          onNewVersion={() => void load(false)}
        />
      )}
    </div>
  );
}
