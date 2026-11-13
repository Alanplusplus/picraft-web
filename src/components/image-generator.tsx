"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { useCheckoutDraft } from "@/lib/checkout-draft";
import { prepareUpload } from "@/lib/image-file";
import type { PinShare } from "@/lib/pinterest-save";
import type { ClientGenerator, ImageModel, TaskView } from "@/lib/types";

import { CreditsDialog, type PendingTask } from "./credits-dialog";
import { ResultFiles } from "./result-files";
import { Select } from "./select";
import { useSession } from "./session-provider";
import { UploadNotice } from "./upload-notice";
import { type Phase, StageEmpty, StageFailed, StageWorking, Workbench } from "./workbench";

const POLL_INTERVAL_MS = 3000;
// 4K images take longer than the 1K ones the makers produce.
const POLL_TIMEOUT_MS = 8 * 60 * 1000;
const RESOLUTION_ORDER = ["1K", "2K", "4K"];

const SHAPE_NAMES: Record<string, string> = {
  "1:1": "Square",
  "4:5": "Portrait",
  "5:4": "Landscape",
  "3:4": "Portrait",
  "4:3": "Landscape",
  "2:3": "Tall portrait, Pinterest Pin",
  "3:2": "Wide photo",
  "9:16": "Vertical, full screen",
  "16:9": "Widescreen",
  "21:9": "Cinematic",
  "1:4": "Tall strip",
  "4:1": "Wide strip",
  "1:8": "Very tall strip",
  "8:1": "Very wide strip",
};

function shapeLabel(value: string): string {
  return value === "auto" ? "Auto" : `${value} · ${SHAPE_NAMES[value] ?? "Custom"}`;
}

function creditsLabel(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

interface RefImage {
  id: number;
  preview: string;
  url: string | null;
  uploading: boolean;
}

/** What the generator keeps while the visitor is on the payment page (see checkout-draft.ts). */
interface GeneratorDraft {
  modelId: string;
  prompt: string;
  ratio: string;
  resolution: string;
  /** The links of the reference photos that were already uploaded. The server holds the photos. */
  refs: string[];
  /** The finished design that was on screen. */
  taskId?: string;
}

const fieldClass = "field";

function ModelCard({ model, selected, onSelect }: { model: ImageModel; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        selected ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-ink-300 bg-white hover:border-ink-400"
      }`}
    >
      <span className="block text-sm font-semibold text-ink-950">{model.name}</span>
      <span className="block text-xs text-ink-500">
        {model.version} · {model.maker}
      </span>
    </button>
  );
}

/**
 * "Edit with AI" on a finished design opens this page as `?from=<task>&file=<file>`. The address is read through the
 * router, not from window.location once: the generator stays mounted when the link is followed from a design shown on
 * this very page, and then only the address changes. It is handled once and cleaned up, so a reload does not add the
 * design again. It sits in its own Suspense boundary so that the page itself can still be prerendered.
 */
function EditSource({ ready, onSource }: { ready: boolean; onSource: (taskId: string, file: string | null) => void }) {
  const params = useSearchParams();
  const from = params.get("from");
  const file = params.get("file");
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!from) {
      handled.current = null;
      return;
    }
    // Not before the visitor's session is there: the copy is made for that visitor.
    if (!ready || handled.current === from) return;
    handled.current = from;
    window.history.replaceState(null, "", window.location.pathname);
    onSource(from, file);
  }, [from, file, ready, onSource]);

  return null;
}

export function ImageGenerator({ generator }: { generator: ClientGenerator }) {
  const { account, ready, setAccount, refresh } = useSession();
  const imageMode = generator.mode === "image";

  const [modelId, setModelId] = useState(generator.defaultModel);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("auto");
  const [resolution, setResolution] = useState("1K");
  const [refs, setRefs] = useState<RefImage[]>([]);
  // Finished designs being copied into reference images (see addFromTask), and why one could not be.
  const [fetching, setFetching] = useState(0);
  const [refError, setRefError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // How many images were started; the workbench uses it to know when a new one begins.
  const [run, setRun] = useState(0);
  // The window that sells credits when Create is pressed without enough of them.
  const [payOpen, setPayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskView | null>(null);
  // The last attempt failed and its credits came back, so trying again is safe.
  const [refunded, setRefunded] = useState(false);
  // The first reference photo of the design on screen, for the before / after viewer.
  const [before, setBefore] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // A finished design becomes a reference image by its own link, with no download, upload or copy in between (see
  // EditSource): the server accepts a picture of the visitor's own designs as a reference. The design is looked up
  // first, which is quick, so a placeholder only shows for a moment; a failure is told next to the list.
  const addFromTask = useCallback((taskId: string, fileId: string | null) => {
    const id = nextId.current++;
    setFetching((count) => count + 1);
    setRefError(null);
    document.getElementById("l-refs")?.scrollIntoView({ block: "center", behavior: "smooth" });
    void api.task(taskId).then((res) => {
      if (cancelled.current) return;
      setFetching((count) => Math.max(0, count - 1));
      const design = res.data;
      if (res.code !== 200 || !design) {
        setRefError(res.code === 404 ? "Design not found." : res.message);
        return;
      }
      const pictures = design.files.filter((item) => item.format !== "pdf");
      const file = fileId ? pictures.find((item) => item.id === fileId) : pictures[0];
      if (design.status !== "done" || !file) {
        setRefError("This design has no picture that can be used as a reference.");
        return;
      }
      setRefs((prev) => [...prev, { id, preview: design.preview_url ?? file.url, url: file.url, uploading: false }]);
      document.getElementById("f-prompt")?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (phase !== "processing") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Paying happens on Waffo's page in this tab. The choices, the prompt, the reference images and the finished design go
  // with the visitor and come back if the page is loaded again; when the browser keeps the page, nothing is needed.
  useCheckoutDraft<GeneratorDraft>(
    "generator",
    () => ({
      modelId,
      prompt,
      ratio,
      resolution,
      refs: refs.flatMap((ref) => (ref.url ? [ref.url] : [])),
      taskId: phase === "done" && task ? task.task_id : undefined,
    }),
    (draft) => {
      if (generator.models.some((item) => item.id === draft.modelId)) setModelId(draft.modelId);
      if (typeof draft.prompt === "string") setPrompt(draft.prompt.slice(0, generator.maxPromptLength));
      if (typeof draft.ratio === "string") setRatio(draft.ratio);
      if (typeof draft.resolution === "string") setResolution(draft.resolution);
      const links = imageMode && Array.isArray(draft.refs) ? draft.refs.filter((url) => typeof url === "string") : [];
      const restored = links.map((url) => ({ id: nextId.current++, preview: url, url, uploading: false }));
      setRefs(restored);
      if (draft.taskId) {
        void api.task(draft.taskId).then((res) => {
          if (cancelled.current || res.code !== 200 || res.data?.status !== "done") return;
          setTask(res.data);
          setBefore(imageMode ? (restored[0]?.preview ?? null) : null);
          setRun((n) => n + 1);
          setPhase("done");
        });
      }
    },
  );

  const model = generator.models.find((item) => item.id === modelId) ?? generator.models[0];
  // The shape and the resolution the visitor picked may not exist for another model; fall back to what does.
  const shape = model.aspectRatios.find((item) => item.value === ratio) ?? model.aspectRatios[0];
  const wanted = RESOLUTION_ORDER.indexOf(resolution);
  const effectiveResolution = shape.resolutions.includes(resolution)
    ? resolution
    : ([...shape.resolutions].reverse().find((item) => RESOLUTION_ORDER.indexOf(item) <= wanted) ??
      shape.resolutions[0]);
  const cost = model.credits[effectiveResolution] ?? 1;
  const minCost = Math.min(...Object.values(model.credits));

  const uploading = fetching > 0 || refs.some((ref) => ref.uploading);
  const tooMany = imageMode && refs.length > model.maxImages;
  // Not enough for this image. With some credits left a cheaper resolution may still fit, so the visitor is told.
  const short = ready && account !== null && account.credits < cost;
  const outOfCredits = ready && account !== null && account.credits < minCost;
  const busy = phase === "submitting" || phase === "processing";

  useEffect(() => {
    if (outOfCredits) trackEvent("credits_exhausted", { scene: generator.slug });
  }, [outOfCredits, generator.slug]);

  function eventParams(extra: Record<string, string | number | boolean> = {}) {
    return {
      scene: generator.slug,
      model: model.id,
      shape: shape.value,
      resolution: effectiveResolution,
      refs: imageMode ? refs.length : undefined,
      ...extra,
    };
  }

  async function onPickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setRefError(null);
    const room = model.maxImages - refs.length;
    if (room <= 0) {
      setError(`${model.name} takes up to ${model.maxImages} reference images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room)
      setError(`${model.name} takes up to ${model.maxImages} reference images; the rest were skipped.`);

    // The session starts when the browser is idle; make sure it exists before the first upload.
    if (!ready) await refresh();
    for (const file of picked) {
      let dataUrl: string;
      try {
        dataUrl = await prepareUpload(file);
      } catch (e) {
        setError((e as Error).message);
        trackEvent("image_upload", { scene: generator.slug, result: "invalid_file" });
        continue;
      }
      const id = nextId.current++;
      setRefs((prev) => [...prev, { id, preview: dataUrl, url: null, uploading: true }]);
      const res = await api.upload(dataUrl);
      if (res.code === 200 && res.data) {
        const url = res.data.url;
        setRefs((prev) => prev.map((ref) => (ref.id === id ? { ...ref, url, uploading: false } : ref)));
      } else {
        setRefs((prev) => prev.filter((ref) => ref.id !== id));
        setError(res.message);
      }
      trackEvent("image_upload", { scene: generator.slug, result: res.code === 200 ? "success" : "error" });
    }
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
      setError("This is taking longer than usual. Your image will appear in My files when it's ready.");
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

    if (imageMode && refs.length === 0) {
      setError("Add at least one reference image.");
      return;
    }
    if (tooMany) {
      setError(
        `${model.name} takes up to ${model.maxImages} reference images. Remove ${refs.length - model.maxImages}.`,
      );
      return;
    }

    // Not enough credits: the form stays exactly as it is and the credits window opens on top of it.
    if (short) {
      setPayOpen(true);
      return;
    }

    setTask(null);
    setRefunded(false);
    setBefore(null);

    setRun((n) => n + 1);
    setPhase("submitting");
    setBefore(imageMode ? (refs[0]?.preview ?? null) : null);
    trackEvent("generate_submit", eventParams({ cost, retry: refunded }));
    const startedAt = Date.now();
    const res = await api.generateImage({
      mode: generator.mode,
      prompt,
      model: model.id,
      aspect_ratio: shape.value,
      resolution: effectiveResolution,
      images: imageMode ? refs.flatMap((ref) => (ref.url ? [ref.url] : [])) : [],
    });
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

  const share: PinShare = {
    sceneName: generator.name,
    summary: generator.summary,
    path: `/${generator.slug}`,
  };

  const downloads = [`The original file, exactly as ${model.name} makes it`, "A smaller JPG copy for sharing"];
  // The stage is drawn in the shape that was asked for; Auto is shown square because the model decides.
  const stageRatio = /^\d+:\d+$/.test(shape.value) ? shape.value.replace(":", " / ") : "1 / 1";

  const pending: PendingTask = {
    title: generator.name,
    image: imageMode ? refs[0]?.preview : null,
    details: [
      `${model.name} · ${shape.value === "auto" ? "Auto shape" : shape.value} · ${effectiveResolution}`,
      prompt.trim() ? `“${prompt.trim().replace(/\s+/g, " ").slice(0, 80)}”` : "",
      imageMode && refs.length > 1 ? `${refs.length} reference images` : "",
    ].filter(Boolean),
    downloads,
    cost,
  };

  return (
    <>
      {imageMode && (
        <Suspense fallback={null}>
          <EditSource ready={ready} onSource={addFromTask} />
        </Suspense>
      )}
      <Workbench
        phase={phase}
        run={run}
        input={
          <div className="panel p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <p id="l-model" className="mb-1 block text-sm font-medium text-ink-900">
                  Model
                </p>
                <div role="radiogroup" aria-labelledby="l-model" className="grid grid-cols-2 gap-2">
                  {generator.models.map((item) => (
                    <ModelCard
                      key={item.id}
                      model={item}
                      selected={item.id === model.id}
                      onSelect={() => setModelId(item.id)}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  {model.blurb}
                  {imageMode && ` Takes up to ${model.maxImages} reference images.`}
                </p>
              </div>

              {imageMode && (
                <div>
                  <p id="l-refs" className="mb-1 block text-sm font-medium text-ink-900">
                    Reference images <span className="text-brand-700">*</span>
                  </p>
                  <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-labelledby="l-refs">
                    {refs.map((ref, index) => (
                      <li
                        key={ref.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-ink-200 bg-ink-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ref.preview}
                          alt={`Reference image ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {ref.uploading && (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-ink-700">
                            Uploading…
                          </span>
                        )}
                        <span className="absolute left-1 top-1 rounded bg-ink-950/70 px-1.5 text-xs font-medium text-white">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove reference image ${index + 1}`}
                          onClick={() => setRefs((prev) => prev.filter((item) => item.id !== ref.id))}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-950/70 text-xs leading-none text-white hover:bg-ink-950"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                    {Array.from({ length: fetching }, (_, index) => (
                      <li
                        key={`fetching-${index}`}
                        role="status"
                        className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-brand-500 bg-brand-50 p-1 text-center text-xs font-medium text-brand-700"
                      >
                        <span className="animate-pulse">Loading your design…</span>
                      </li>
                    ))}
                    {refs.length + fetching < model.maxImages && (
                      <li>
                        <label
                          htmlFor="f-refs"
                          className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-300 bg-ink-50 text-ink-500 hover:border-ink-500"
                        >
                          <span className="text-2xl leading-none">+</span>
                          <span className="mt-1 text-xs">{refs.length === 0 ? "Add" : "Add more"}</span>
                          <input
                            id="f-refs"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              void onPickImages(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </li>
                    )}
                  </ul>
                  {refError && (
                    <p role="alert" className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                      {refError}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-ink-500">
                    JPG, PNG or WebP, up to {model.maxImages} images for {model.name}.
                  </p>
                  <UploadNotice />
                </div>
              )}

              <div>
                <label htmlFor="f-prompt" className="mb-1 block text-sm font-medium text-ink-900">
                  {imageMode ? "What should change?" : "Describe the image"} <span className="text-brand-700">*</span>
                </label>
                <textarea
                  id="f-prompt"
                  className={fieldClass}
                  rows={5}
                  maxLength={generator.maxPromptLength}
                  placeholder={generator.placeholder}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <p className="mt-1 flex justify-between gap-3 text-xs text-ink-500">
                  <span>{generator.help}</span>
                  <span className="shrink-0">
                    {prompt.length} / {generator.maxPromptLength}
                  </span>
                </p>
              </div>

              {/* A model with one resolution has nothing to choose, so it gets a line of text instead of a menu. */}
              <div className={`grid gap-4 ${shape.resolutions.length > 1 ? "sm:grid-cols-2" : ""}`}>
                <div>
                  <label id="l-shape" className="mb-1 block text-sm font-medium text-ink-900">
                    Shape
                  </label>
                  <Select
                    id="f-shape"
                    labelledBy="l-shape"
                    options={model.aspectRatios.map((item) => ({ value: item.value, label: shapeLabel(item.value) }))}
                    value={shape.value}
                    onChange={setRatio}
                  />
                  {shape.resolutions.length === 1 && (
                    <p className="mt-1.5 text-xs text-ink-500">
                      {model.name} makes this at {effectiveResolution} · {creditsLabel(cost)} per image.
                    </p>
                  )}
                </div>
                {shape.resolutions.length > 1 && (
                  <div>
                    <label id="l-resolution" className="mb-1 block text-sm font-medium text-ink-900">
                      Resolution
                    </label>
                    <Select
                      id="f-resolution"
                      labelledBy="l-resolution"
                      options={shape.resolutions.map((item) => ({
                        value: item,
                        label: `${item} · ${creditsLabel(model.credits[item] ?? 1)}`,
                      }))}
                      value={effectiveResolution}
                      onChange={setResolution}
                    />
                  </div>
                )}
              </div>
              {shape.value === "auto" && (
                <p className="-mt-2 text-xs text-ink-500">
                  Auto lets {model.name} choose the shape.
                  {shape.resolutions.length === 1 &&
                    (model.aspectRatios.some((item) => item.resolutions.length > 1)
                      ? ` It makes Auto images at ${shape.resolutions[0]} only, so pick a shape to unlock more resolutions.`
                      : ` ${model.name} makes every shape at ${shape.resolutions[0]}.`)}
                </p>
              )}

              {tooMany && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                  {model.name} takes up to {model.maxImages} reference images. Remove {refs.length - model.maxImages} to
                  continue.
                </p>
              )}
              {error && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}

              {short && !busy && (
                <p className="text-center text-xs text-ink-500">
                  You have {creditsLabel(account?.credits ?? 0)} and this needs {cost}.{" "}
                  {cost > minCost
                    ? "Pick a lower resolution, or press Create to add credits; what you entered stays here."
                    : "Press Create to add credits; what you entered stays here."}
                </p>
              )}
              <button
                type="submit"
                disabled={!ready || busy || uploading || tooMany}
                className={`${phase === "done" ? "btn-secondary" : "btn-primary"} w-full`}
              >
                {phase === "submitting"
                  ? "Starting…"
                  : phase === "processing"
                    ? `Creating… ${elapsed}s`
                    : `${refunded && phase === "failed" ? "Try again" : phase === "done" ? "Create another" : "Create"} · ${creditsLabel(cost)}`}
              </button>
              {/* On a phone the result area is hidden until something is made, so the files are named here. */}
              {!busy && (
                <p className="text-xs leading-relaxed text-ink-500 lg:hidden">
                  You&apos;ll download: {downloads.join(" · ")}
                </p>
              )}
            </form>
          </div>
        }
        output={
          phase === "done" && task ? (
            <ResultFiles key={task.task_id} task={task} source="generator" share={share} before={before} />
          ) : phase === "submitting" || phase === "processing" ? (
            <StageWorking
              ratio={stageRatio}
              elapsed={elapsed}
              label="Creating…"
              hint="Most images take 30–90 seconds, 4K a little longer. You can keep this tab open."
              backdrop={before}
              expectedSeconds={effectiveResolution === "4K" ? 120 : 75}
            />
          ) : phase === "failed" ? (
            <StageFailed refunded={refunded} />
          ) : (
            <StageEmpty ratio={stageRatio} downloads={downloads} />
          )
        }
      />
      <CreditsDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        source="generator"
        task={pending}
        enough={!short}
        onCreate={() => {
          setPayOpen(false);
          void start();
        }}
      />
    </>
  );
}
