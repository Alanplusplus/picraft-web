"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { EDITS, type EditOp, primaryImage, whyNot } from "@/lib/edits";
import type { TaskView } from "@/lib/types";

import { CreditsDialog, type PendingTask } from "./credits-dialog";
import { ImageEditor } from "./image-editor";
import { useSession } from "./session-provider";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

const OPS: EditOp[] = ["upscale2", "upscale4", "cutout"];

function creditsLabel(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/** Waits for an edit to finish: the finished task, or the reason it did not. */
async function pollTask(taskId: string, stopped: () => boolean): Promise<{ task: TaskView } | { error: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (!stopped() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await api.task(taskId);
    if (res.code !== 200 || !res.data) continue;
    if (res.data.status === "done") return { task: res.data };
    if (res.data.status === "failed") return { error: res.data.error ?? "That didn't work. Please try again." };
  }
  return { error: "This is taking longer than usual. The result will appear in My files when it's ready." };
}

const button =
  "inline-flex items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 shadow-sm transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-300 disabled:hover:bg-white";

/**
 * What can be done with a finished picture: edit it with AI (image to image), enlarge it, cut the subject out, or open
 * the free editor. Enlarging and cutting out run on the server and come back as a new design of their own, which is
 * handed to `onResult` and also appears in My files; the free editor never leaves the browser.
 */
export function ImageActions({
  task,
  source,
  onResult,
  onBusyChange,
}: {
  task: TaskView;
  source: "generator" | "history";
  onResult: (task: TaskView) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { account, ready, setAccount, refresh } = useSession();
  const [job, setJob] = useState<{ op: EditOp; phase: "submitting" | "processing" } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The edit that waits for credits, while the window that sells them is open.
  const [payOp, setPayOp] = useState<EditOp | null>(null);
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);

  const picture = primaryImage(task);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (!job) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [job]);

  if (!picture) return null;
  const file = picture;

  async function run(op: EditOp) {
    setError(null);
    setElapsed(0);
    setJob({ op, phase: "submitting" });
    onBusyChange(true);
    const params = { op, scene: task.scene, source };
    trackEvent("edit_submit", { ...params, cost: EDITS[op].cost });

    const res = await api.processTask(task.task_id, op, file.id);
    if (res.code !== 200 || !res.data) {
      setJob(null);
      onBusyChange(false);
      setError(res.message);
      trackEvent("edit_fail", { ...params, reason: res.code === 402 ? "no_credits" : "rejected" });
      if (res.code === 402) await refresh();
      return;
    }
    setAccount(res.data.account);
    setJob({ op, phase: "processing" });

    const outcome = await pollTask(res.data.task_id, () => cancelled.current);
    if (cancelled.current) return;
    setJob(null);
    onBusyChange(false);
    if (!("task" in outcome)) {
      setError(outcome.error);
      trackEvent("edit_fail", { ...params, reason: "failed" });
      await refresh();
      return;
    }
    trackEvent("edit_success", params);
    onResult(outcome.task);
  }

  function choose(op: EditOp) {
    if (account && account.credits < EDITS[op].cost) {
      setPayOp(op);
      trackEvent("edit_needs_credits", { op, scene: task.scene, source });
      return;
    }
    void run(op);
  }

  const shownOp = payOp ?? "cutout";
  const pending: PendingTask = {
    title: EDITS[shownOp].doing,
    image: task.preview_url,
    details: [`${file.width}×${file.height} px`],
    downloads: [EDITS[shownOp].result],
    cost: EDITS[shownOp].cost,
    action: EDITS[shownOp].label,
  };
  const busy = job !== null;

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">Edit this image</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={`/image-to-image?from=${encodeURIComponent(task.task_id)}&file=${encodeURIComponent(file.id)}`}
          onClick={() => trackEvent("edit_with_ai", { scene: task.scene, source })}
          className={button}
        >
          Edit with AI
        </Link>
        {OPS.map((op) => {
          const reason = whyNot(op, file);
          return (
            <button
              key={op}
              type="button"
              disabled={!ready || busy || reason !== null}
              title={reason ?? undefined}
              onClick={() => choose(op)}
              className={button}
            >
              {EDITS[op].label}
              <span className="text-xs font-normal text-ink-500">{creditsLabel(EDITS[op].cost)}</span>
            </button>
          );
        })}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEditing(true);
            trackEvent("editor_open", { scene: task.scene, source });
          }}
          className={button}
        >
          Free editor
          <span className="text-xs font-normal text-ink-500">crop, resize, adjust…</span>
        </button>
      </div>

      {job && (
        <div role="status" className="mt-3 flex items-start gap-2.5">
          <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <div className="text-sm text-ink-800">
            {EDITS[job.op].doing}… {elapsed}s
            <p className="text-xs text-ink-500">
              {job.op === "upscale4" ? "Can take up to a minute. " : "Usually under half a minute. "}Your current picture
              stays as it is.
            </p>
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

      {editing && (
        <ImageEditor
          src={`/api/task/${encodeURIComponent(task.task_id)}/file?file=${encodeURIComponent(file.id)}`}
          scene={task.scene}
          startFormat={file.format === "pdf" ? "png" : file.format}
          onClose={() => setEditing(false)}
        />
      )}
      <CreditsDialog
        open={payOp !== null}
        onClose={() => setPayOp(null)}
        source={`edit_${source}`}
        task={pending}
        enough={account !== null && account.credits >= EDITS[shownOp].cost}
        onCreate={() => {
          setPayOp(null);
          void run(shownOp);
        }}
      />
    </div>
  );
}
