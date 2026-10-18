"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { prepareUpload } from "@/lib/image-file";
import type { ClientScene, SceneField, TaskView } from "@/lib/types";

import { ResultFiles } from "./result-files";
import { useSession } from "./session-provider";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

interface ImageState {
  preview: string;
  url: string | null;
  uploading: boolean;
}

type Phase = "idle" | "submitting" | "processing" | "done" | "failed";

function initialValues(scene: ClientScene): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of scene.fields) {
    if (field.type === "select") values[field.key] = field.default ?? field.options?.[0]?.value ?? "";
    else if (field.type !== "image") values[field.key] = "";
  }
  return values;
}

function matches(when: Record<string, string | string[]> | undefined, values: Record<string, string>) {
  if (!when) return true;
  return Object.entries(when).every(([key, expected]) =>
    (Array.isArray(expected) ? expected : [expected]).includes(values[key]),
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900";

export function SceneGenerator({ scene }: { scene: ClientScene }) {
  const { account, ready, setAccount, refresh } = useSession();
  const [values, setValues] = useState(() => initialValues(scene));
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskView | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "processing") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const outputs = useMemo(() => scene.outputs.filter((o) => matches(o.when, values)), [scene.outputs, values]);
  const uploading = Object.values(images).some((img) => img.uploading);
  const outOfCredits = ready && account !== null && account.credits < scene.cost;
  const busy = phase === "submitting" || phase === "processing";

  // The free credits are used up: the visitor can no longer create anything.
  useEffect(() => {
    if (outOfCredits) trackEvent("credits_exhausted", { scene: scene.slug });
  }, [outOfCredits, scene.slug]);

  /** Parameters shared by the events of one generation. `style` is only set for makers that have a style field. */
  function eventParams(extra: Record<string, string | number> = {}) {
    return { scene: scene.slug, style: values.style || undefined, ...extra };
  }

  async function onPickImage(field: SceneField, file: File | undefined) {
    if (!file) return;
    setError(null);
    let dataUrl: string;
    try {
      dataUrl = await prepareUpload(file);
    } catch (e) {
      setError((e as Error).message);
      trackEvent("image_upload", { scene: scene.slug, result: "invalid_file" });
      return;
    }
    setImages((prev) => ({ ...prev, [field.key]: { preview: dataUrl, url: null, uploading: true } }));
    // The session starts when the browser is idle; make sure it exists before the first upload.
    if (!ready) await refresh();
    const res = await api.upload(dataUrl);
    setImages((prev) => ({
      ...prev,
      [field.key]: { preview: dataUrl, url: res.code === 200 && res.data ? res.data.url : null, uploading: false },
    }));
    if (res.code !== 200) setError(res.message);
    trackEvent("image_upload", { scene: scene.slug, result: res.code === 200 ? "success" : "error" });
  }

  async function poll(taskId: string, startedAt: number) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (!cancelled.current && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await api.task(taskId);
      if (res.code !== 200 || !res.data) continue;
      if (res.data.status === "done") {
        setTask(res.data);
        setPhase("done");
        trackEvent(
          "generate_success",
          eventParams({ duration_s: Math.round((Date.now() - startedAt) / 1000), file_count: res.data.files.length }),
        );
        return;
      }
      if (res.data.status === "failed") {
        setError(res.data.error);
        setPhase("failed");
        trackEvent("generate_fail", eventParams({ reason: "task_failed" }));
        await refresh();
        return;
      }
    }
    if (!cancelled.current) {
      setError("This is taking longer than usual. Your file will appear in My files when it's ready.");
      setPhase("failed");
      trackEvent("generate_fail", eventParams({ reason: "timeout" }));
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setTask(null);

    const imageUrls: Record<string, string> = {};
    for (const field of scene.fields) {
      if (field.type !== "image") continue;
      const img = images[field.key];
      if (img?.url) imageUrls[field.key] = img.url;
      else if (field.required) {
        setError(`Please add "${field.label}".`);
        return;
      }
    }

    setPhase("submitting");
    trackEvent("generate_submit", eventParams({ cost: scene.cost }));
    const startedAt = Date.now();
    const res = await api.generate(scene.slug, values, imageUrls);
    if (res.code !== 200 || !res.data) {
      setError(res.message);
      setPhase("idle");
      const reason = res.code === 402 ? "no_credits" : res.code === 0 ? "network" : "rejected";
      trackEvent("generate_fail", eventParams({ reason }));
      if (res.code === 402) await refresh();
      return;
    }
    setAccount(res.data.account);
    setElapsed(0);
    setPhase("processing");
    await poll(res.data.task_id, startedAt);
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {scene.fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={`f-${field.key}`} className="mb-1 block text-sm font-medium text-ink-900">
              {field.label}
              {field.required && field.type !== "select" && <span className="text-brand-700"> *</span>}
            </label>
            {field.type === "image" ? (
              <label
                htmlFor={`f-${field.key}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-3 hover:border-ink-500"
              >
                {images[field.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[field.key].preview} alt="" className="h-16 w-16 rounded-md object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md bg-white text-2xl text-ink-500">
                    +
                  </span>
                )}
                <span className="text-sm text-ink-700">
                  {images[field.key]?.uploading
                    ? "Uploading…"
                    : images[field.key]
                      ? "Tap to replace"
                      : "Upload a JPG, PNG or WebP photo"}
                </span>
                <input
                  id={`f-${field.key}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => onPickImage(field, e.target.files?.[0])}
                />
              </label>
            ) : field.type === "select" ? (
              <select
                id={`f-${field.key}`}
                className={inputClass}
                value={values[field.key]}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={`f-${field.key}`}
                className={inputClass}
                rows={field.rows ?? 3}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.key]}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            ) : (
              <input
                id={`f-${field.key}`}
                className={inputClass}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.key]}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            )}
            {field.help && <p className="mt-1 text-xs text-ink-500">{field.help}</p>}
          </div>
        ))}

        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">You&apos;ll download</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-800">
            {outputs.map((o) => (
              <li key={o.id}>{o.label}</li>
            ))}
          </ul>
        </div>

        {error && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

        {outOfCredits && !busy ? (
          <div className="space-y-2 rounded-lg border border-ink-200 p-3">
            <p className="text-sm text-ink-800">
              You&apos;ve used your free credits. Please check back later.
            </p>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!ready || busy || uploading}
            className="w-full rounded-xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "submitting"
              ? "Starting…"
              : phase === "processing"
                ? `Designing… ${elapsed}s`
                : `Create · ${scene.cost} ${scene.cost === 1 ? "credit" : "credits"}`}
          </button>
        )}
        {phase === "processing" && (
          <p className="text-center text-xs text-ink-500">Most designs take 30–90 seconds. You can keep this tab open.</p>
        )}
      </form>

      {phase === "done" && task && (
        <div className="mt-6 border-t border-ink-200 pt-6">
          <ResultFiles task={task} source="generator" />
        </div>
      )}
    </div>
  );
}
