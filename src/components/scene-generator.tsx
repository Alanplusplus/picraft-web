"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { useCheckoutDraft } from "@/lib/checkout-draft";
import { prepareUpload } from "@/lib/image-file";
import type { PinShare } from "@/lib/pinterest-save";
import type { ClientScene, SceneField, TaskView } from "@/lib/types";

import { CreditsDialog, type PendingTask } from "./credits-dialog";
import { ResultFiles } from "./result-files";
import { Select } from "./select";
import { useSession } from "./session-provider";
import { UploadNotice } from "./upload-notice";
import { type Phase, StageEmpty, StageFailed, StageWorking, Workbench } from "./workbench";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

interface ImageState {
  preview: string;
  url: string | null;
  uploading: boolean;
}

/** What the form keeps while the visitor is on the payment page (see checkout-draft.ts). */
interface SceneDraft {
  values: Record<string, string>;
  madeWith?: string;
  /** The links of the photos that were already uploaded, by field. The server holds the photos. */
  images: Record<string, string>;
  /** The finished design that was on screen. */
  taskId?: string;
}

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

const inputClass = "field";

/** Pages of the maker's looks, by option value, so a pin saved from a result can link to the page of its look. */
export interface StyleLinks {
  field: string;
  paths: Record<string, string>;
}

export function SceneGenerator({ scene, styleLinks }: { scene: ClientScene; styleLinks?: StyleLinks }) {
  const { account, ready, setAccount, refresh } = useSession();
  const [values, setValues] = useState(() => initialValues(scene));
  // The look that was chosen when the design was started; the form may change while the result is on screen.
  const [madeWith, setMadeWith] = useState<string | undefined>();
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  // How many designs were started; the workbench uses it to know when a new one begins.
  const [run, setRun] = useState(0);
  // The window that sells credits when Create is pressed without enough of them.
  const [payOpen, setPayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskView | null>(null);
  // The last attempt failed and its credits came back, so trying again is safe.
  const [refunded, setRefunded] = useState(false);
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

  // Paying happens on Waffo's page in this tab. The settings, the uploaded photos and the finished design go with the
  // visitor and come back if the page is loaded again; when the browser keeps the page, nothing is needed.
  useCheckoutDraft<SceneDraft>(
    "scene",
    () => {
      const kept: Record<string, string> = {};
      for (const [key, image] of Object.entries(images)) if (image.url) kept[key] = image.url;
      return { values, madeWith, images: kept, taskId: phase === "done" && task ? task.task_id : undefined };
    },
    (draft) => {
      setValues((current) => {
        const next = { ...current };
        for (const field of scene.fields) {
          const saved = draft.values?.[field.key];
          if (typeof saved !== "string" || field.type === "image") continue;
          // A saved choice that is no longer on offer is dropped.
          if (field.type === "select" && !field.options?.some((option) => option.value === saved)) continue;
          next[field.key] = saved;
        }
        return next;
      });
      const restored: Record<string, ImageState> = {};
      for (const field of scene.fields) {
        const url = draft.images?.[field.key];
        if (field.type === "image" && typeof url === "string") restored[field.key] = { preview: url, url, uploading: false };
      }
      setImages(restored);
      if (draft.madeWith) setMadeWith(draft.madeWith);
      if (draft.taskId) {
        void api.task(draft.taskId).then((res) => {
          if (cancelled.current || res.code !== 200 || res.data?.status !== "done") return;
          setTask(res.data);
          setRun((n) => n + 1);
          setPhase("done");
        });
      }
    },
  );

  const outputs = useMemo(() => scene.outputs.filter((o) => matches(o.when, values)), [scene.outputs, values]);
  const uploading = Object.values(images).some((img) => img.uploading);
  const outOfCredits = ready && account !== null && account.credits < scene.cost;
  const busy = phase === "submitting" || phase === "processing";

  // The free credits are used up: the visitor can no longer create anything.
  useEffect(() => {
    if (outOfCredits) trackEvent("credits_exhausted", { scene: scene.slug });
  }, [outOfCredits, scene.slug]);

  /** Parameters shared by the events of one generation. `style` is only set for makers that have a style field. */
  function eventParams(extra: Record<string, string | number | boolean> = {}) {
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
        setRefunded(true);
        setPhase("failed");
        trackEvent("generate_fail", eventParams({ reason: res.data.error_code ?? "task_failed" }));
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

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void start();
  }

  async function start() {
    setError(null);

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

    // Not enough credits: the form stays exactly as it is and the credits window opens on top of it.
    if (outOfCredits) {
      setPayOpen(true);
      return;
    }

    setTask(null);
    setRefunded(false);
    setMadeWith(styleLinks ? values[styleLinks.field] : undefined);
    setRun((n) => n + 1);
    setPhase("submitting");
    trackEvent("generate_submit", eventParams({ cost: scene.cost, retry: refunded }));
    const startedAt = Date.now();
    const res = await api.generate(scene.slug, values, imageUrls);
    if (res.code !== 200 || !res.data) {
      setError(res.message);
      setPhase("idle");
      const reason =
        res.code === 402
          ? "no_credits"
          : res.code === 0
            ? "network"
            : res.code === 422
              ? "moderation"
              : res.code === 429
                ? "rate_limited"
                : "rejected";
      trackEvent("generate_fail", eventParams({ reason }));
      if (res.code === 402) await refresh();
      return;
    }
    setAccount(res.data.account);
    setElapsed(0);
    setPhase("processing");
    await poll(res.data.task_id, startedAt);
  }

  const madeWithOption = madeWith
    ? scene.fields.find((f) => f.key === styleLinks?.field)?.options?.find((o) => o.value === madeWith)
    : undefined;
  const share: PinShare = {
    sceneName: scene.name,
    summary: scene.summary,
    path: (madeWith && styleLinks?.paths[madeWith]) || `/create/${scene.slug}`,
    styleLabel: madeWithOption?.label,
  };

  const downloads = outputs.map((o) => o.label);

  const pending: PendingTask = {
    title: scene.name,
    image: Object.values(images).find((img) => img.preview)?.preview,
    details: scene.fields
      .filter((field) => field.type !== "image" && values[field.key])
      .map((field) => {
        // A choice reads as its name, what the visitor typed as a quote.
        const chosen = field.options?.find((option) => option.value === values[field.key])?.label;
        return chosen ?? `“${values[field.key].replace(/\s+/g, " ").slice(0, 70)}”`;
      })
      .slice(0, 3),
    downloads,
    cost: scene.cost,
  };

  return (
    <>
      <Workbench
        phase={phase}
        run={run}
        input={
          <div className="panel p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {scene.fields.map((field) => (
                <div key={field.key}>
                  <label
                    id={`l-${field.key}`}
                    htmlFor={field.type === "select" ? undefined : `f-${field.key}`}
                    className="mb-1 block text-sm font-medium text-ink-900"
                  >
                    {field.label}
                    {field.required && field.type !== "select" && <span className="text-brand-700"> *</span>}
                  </label>
                  {field.type === "image" ? (
                    <>
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
                      <UploadNotice />
                    </>
                  ) : field.type === "select" ? (
                    <Select
                      id={`f-${field.key}`}
                      labelledBy={`l-${field.key}`}
                      options={field.options ?? []}
                      value={values[field.key]}
                      onChange={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
                    />
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

              {error && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

              <button
                type="submit"
                disabled={!ready || busy || uploading}
                className={`${phase === "done" ? "btn-secondary" : "btn-primary"} w-full`}
              >
                {phase === "submitting"
                  ? "Starting…"
                  : phase === "processing"
                    ? `Designing… ${elapsed}s`
                    : `${refunded && phase === "failed" ? "Try again" : phase === "done" ? "Create another" : "Create"} · ${scene.cost} ${scene.cost === 1 ? "credit" : "credits"}`}
              </button>
              {outOfCredits && !busy && (
                <p className="text-center text-xs text-ink-500">
                  You have {account?.credits ?? 0} {account?.credits === 1 ? "credit" : "credits"} and this needs{" "}
                  {scene.cost}. Press Create to add credits; what you entered stays here.
                </p>
              )}
              {/* On a phone the result area is hidden until something is made, so the files are named here. */}
              {!busy && outputs.length > 0 && (
                <p className="text-xs leading-relaxed text-ink-500 lg:hidden">
                  You&apos;ll download: {outputs.map((o) => o.label).join(" · ")}
                </p>
              )}
            </form>
          </div>
        }
        output={
          phase === "done" && task ? (
            <ResultFiles key={task.task_id} task={task} source="generator" share={share} />
          ) : phase === "submitting" || phase === "processing" ? (
            <StageWorking
              ratio="4 / 3"
              elapsed={elapsed}
              label="Designing…"
              hint="Most designs take 30–90 seconds. You can keep this tab open."
              backdrop={Object.values(images)[0]?.preview}
            />
          ) : phase === "failed" ? (
            <StageFailed refunded={refunded} />
          ) : (
            <StageEmpty ratio="4 / 3" downloads={downloads} />
          )
        }
      />
      <CreditsDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        source="scene"
        task={pending}
        enough={!outOfCredits}
        onCreate={() => {
          setPayOpen(false);
          void start();
        }}
      />
    </>
  );
}
