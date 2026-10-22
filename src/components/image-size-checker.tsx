"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  MAX_TEMPLATE_PIXELS,
  buildTemplateSvg,
  formatBytes,
  presetRules,
  presetTarget,
  presetTargetLabel,
  ratioLabel,
  runChecks,
  type Check,
  type CheckStatus,
  type ImageFormat,
  type ImageInfo,
  type SizePreset,
} from "@/lib/size-presets";

import { Select } from "./select";
import { TrackedLink } from "./tracked-link";

/** Longest side of the reduced copy used to look at the pixels. */
const SAMPLE_SIDE = 400;
const TOOL_ID = "image_size_checker";

interface Loaded {
  url: string;
  name: string;
  info: ImageInfo;
}

function detectFormat(file: File): ImageFormat {
  const type = file.type.toLowerCase();
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (type === "image/jpeg" || (!type && (extension === "jpg" || extension === "jpeg"))) return "jpg";
  if (type === "image/png" || (!type && extension === "png")) return "png";
  if (type === "image/webp" || (!type && extension === "webp")) return "webp";
  if (type === "image/gif" || (!type && extension === "gif")) return "gif";
  if (type === "image/tiff" || (!type && (extension === "tif" || extension === "tiff"))) return "tiff";
  return "other";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The browser could not open this file."));
    image.src = url;
  });
}

/**
 * Looks at a reduced copy of the image: how much of it is transparent, how much of the border is pure
 * white (transparent pixels count as white, as they would on a white page), and how far the non-white
 * content spreads across the frame.
 */
function samplePixels(image: HTMLImageElement, width: number, height: number) {
  const scale = Math.min(1, SAMPLE_SIDE / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { transparentShare: 0, whiteBorderShare: 0, fill: 0 };
  context.drawImage(image, 0, 0, sw, sh);
  const data = context.getImageData(0, 0, sw, sh).data;

  const ring = Math.max(1, Math.round(Math.min(sw, sh) * 0.01));
  let transparent = 0;
  let border = 0;
  let whiteBorder = 0;
  let minX = sw;
  let maxX = -1;
  let minY = sh;
  let maxY = -1;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const alpha = data[i + 3];
      if (alpha < 250) transparent++;
      const mix = (channel: number) => (channel * alpha + 255 * (255 - alpha)) / 255;
      const lowest = Math.min(mix(data[i]), mix(data[i + 1]), mix(data[i + 2]));
      if (lowest < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (x < ring || y < ring || x >= sw - ring || y >= sh - ring) {
        border++;
        if (lowest >= 250) whiteBorder++;
      }
    }
  }

  const fill = maxX < 0 ? 0 : Math.max((maxX - minX + 1) / sw, (maxY - minY + 1) / sh);
  return { transparentShare: transparent / (sw * sh), whiteBorderShare: border === 0 ? 0 : whiteBorder / border, fill };
}

async function readImage(file: File): Promise<Loaded> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new Error("This file has no pixel size, so it cannot be checked.");
    return {
      url,
      name: file.name,
      info: { width, height, bytes: file.size, format: detectFormat(file), ...samplePixels(image, width, height) },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function overall(checks: Check[]): CheckStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

const STATUS_STYLE: Record<CheckStatus, { box: string; badge: string; symbol: string; word: string }> = {
  pass: { box: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-600 text-white", symbol: "✓", word: "Pass" },
  warn: { box: "border-amber-200 bg-amber-50", badge: "bg-amber-500 text-white", symbol: "!", word: "Check" },
  fail: { box: "border-red-200 bg-red-50", badge: "bg-red-600 text-white", symbol: "✕", word: "Fix" },
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadTemplate(preset: SizePreset, kind: "png" | "svg") {
  const svg = buildTemplateSvg(preset);
  const target = presetTarget(preset);
  if (!svg || !target) return;
  const base = `picraft-${preset.id}-${target.width}x${target.height}-guide`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  if (kind === "svg") {
    saveBlob(svgBlob, `${base}.svg`);
    return;
  }
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) saveBlob(blob, `${base}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Guide lines drawn over the preview. Print presets assume the image is the whole file, bleed included. */
function Overlay({ preset }: { preset: SizePreset }) {
  if (preset.print) {
    const { trimWidth, trimHeight, bleed, safe = 0 } = preset.print;
    const totalW = trimWidth + 2 * bleed;
    const totalH = trimHeight + 2 * bleed;
    const bx = (bleed / totalW) * 100;
    const by = (bleed / totalH) * 100;
    const sx = ((bleed + safe) / totalW) * 100;
    const sy = ((bleed + safe) / totalH) * 100;
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute border-2 border-black/80"
          style={{ left: `${bx}%`, right: `${bx}%`, top: `${by}%`, bottom: `${by}%`, boxShadow: "0 0 0 9999px rgba(244, 63, 94, 0.22)" }}
        />
        {safe > 0 && (
          <div
            className="absolute border-2 border-dashed border-blue-600"
            style={{ left: `${sx}%`, right: `${sx}%`, top: `${sy}%`, bottom: `${sy}%` }}
          />
        )}
      </div>
    );
  }
  if (!preset.zones?.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {preset.zones.map((zone) => {
        const avoid = zone.kind === "avoid";
        return (
          <div
            key={zone.label}
            className={`absolute flex items-center justify-center border-2 border-dashed text-[10px] font-semibold leading-tight sm:text-xs ${
              avoid ? "border-red-600 bg-red-500/20 text-red-800" : "border-emerald-600 bg-emerald-500/15 text-emerald-800"
            }`}
            style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }}
          >
            <span className="rounded bg-white/80 px-1">{zone.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ preset }: { preset: SizePreset }) {
  const item = "inline-flex items-center gap-1.5";
  if (preset.print) {
    return (
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-700">
        <span className={item}>
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-300" /> Bleed
        </span>
        <span className={item}>
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-black/80" /> Trim (final cut)
        </span>
        {(preset.print.safe ?? 0) > 0 && (
          <span className={item}>
            <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-blue-600" /> Safe area
          </span>
        )}
      </p>
    );
  }
  if (!preset.zones?.length) return null;
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-700">
      {preset.zones.map((zone) => (
        <span key={zone.label} className={item}>
          <span
            className={`h-2.5 w-2.5 rounded-sm border-2 border-dashed ${zone.kind === "avoid" ? "border-red-600" : "border-emerald-600"}`}
          />
          {zone.label}
        </span>
      ))}
    </p>
  );
}

const BUTTON =
  "rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 transition hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 disabled:opacity-50";

export function ImageSizeChecker({
  presets,
  guideNames,
  makerNames,
}: {
  presets: SizePreset[];
  /** Slug to title, for the link to the size guide of the chosen preset. */
  guideNames: Record<string, string>;
  /** Slug to name, for the link to the maker that exports the chosen file. */
  makerNames: Record<string, string>;
}) {
  const labelId = useId();
  const selectId = useId();
  const [presetId, setPresetId] = useState(presets[0].id);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const preset = presets.find((item) => item.id === presetId) ?? presets[0];
  const checks = useMemo(() => (loaded ? runChecks(preset, loaded.info) : []), [preset, loaded]);
  const verdict = overall(checks);
  const target = presetTarget(preset);
  const rules = presetRules(preset);
  const template = target ? buildTemplateSvg(preset) !== null : false;
  const pngAllowed = target ? target.width * target.height <= MAX_TEMPLATE_PIXELS : false;

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const options = useMemo(() => presets.map((item) => ({ value: item.id, label: item.label })), [presets]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type && !file.type.startsWith("image/")) {
      setError("That file is not an image. Choose a JPG, PNG, WebP or GIF file.");
      return;
    }
    setBusy(true);
    try {
      const next = await readImage(file);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = next.url;
      setLoaded(next);
      trackEvent("tool_check", { tool: TOOL_ID, preset: preset.id, result: overall(runChecks(preset, next.info)) });
    } catch {
      setError(
        "This browser could not open that file. JPG, PNG, WebP and GIF files work everywhere; TIFF and HEIC files often do not, so convert them first.",
      );
    } finally {
      setBusy(false);
    }
  }

  function changePreset(id: string) {
    setPresetId(id);
    const next = presets.find((item) => item.id === id);
    if (next && loaded) {
      trackEvent("tool_check", { tool: TOOL_ID, preset: next.id, result: overall(runChecks(next, loaded.info)) });
    }
  }

  function clearImage() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setLoaded(null);
    setError(null);
  }

  async function handleTemplate(kind: "png" | "svg") {
    setDownloading(kind);
    try {
      await downloadTemplate(preset, kind);
      trackEvent("tool_template_download", { tool: TOOL_ID, preset: preset.id, format: kind });
    } catch {
      setError("The template could not be created in this browser. Try the SVG file instead.");
    } finally {
      setDownloading(null);
    }
  }

  const hasOverlay = Boolean(preset.print || preset.zones?.length);

  return (
    <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm sm:p-6">
      <p id={labelId} className="text-sm font-semibold text-ink-950">
        1. Where is the image going?
      </p>
      <div className="mt-2 max-w-md">
        <Select id={selectId} labelledBy={labelId} value={preset.id} options={options} onChange={changePreset} />
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
        <p className="font-semibold text-ink-950">{presetTargetLabel(preset)}</p>
        {rules.length > 0 && <p className="mt-1">{rules.join(" · ")}</p>}
        {preset.notes?.map((note) => (
          <p key={note} className="mt-2">
            {note}
          </p>
        ))}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <TrackedLink
            href={`/sizes/${preset.guide}`}
            event="tool_link_click"
            eventParams={{ tool: TOOL_ID, target: "guide", preset: preset.id }}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            {guideNames[preset.guide] ?? "Size guide"}
          </TrackedLink>
          <TrackedLink
            href={`/create/${preset.maker}`}
            event="tool_link_click"
            eventParams={{ tool: TOOL_ID, target: "maker", preset: preset.id }}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            {makerNames[preset.maker] ?? "Make it with PiCraft"}
          </TrackedLink>
        </p>
      </div>

      <p className="mt-6 text-sm font-semibold text-ink-950">2. Drop your image</p>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
        className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus-within:ring-2 focus-within:ring-ink-900 ${
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-white hover:border-ink-500"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="text-base font-medium text-ink-900">{busy ? "Reading the image…" : "Drop an image here or click to choose one"}</span>
        <span className="mt-1 text-sm text-ink-500">The file stays on your device. Nothing is uploaded.</span>
      </label>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {loaded && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-950" title={loaded.name}>
                    {loaded.name}
                  </p>
                  <p className="text-sm text-ink-500">
                    {loaded.info.width}×{loaded.info.height} px · {ratioLabel(loaded.info.width, loaded.info.height)} ·{" "}
                    {formatBytes(loaded.info.bytes)} · {loaded.info.format === "other" ? "other type" : loaded.info.format.toUpperCase()}
                  </p>
                </div>
                <button type="button" onClick={clearImage} className={BUTTON}>
                  Remove
                </button>
              </div>

              <div className="mt-3 flex justify-center rounded-xl bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3">
                <div className="relative inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loaded.url} alt="Preview of the image you chose" className="block h-auto max-h-[420px] w-auto max-w-full" />
                  {showGuides && <Overlay preset={preset} />}
                </div>
              </div>

              {hasOverlay && (
                <>
                  <label className="mt-3 flex items-center gap-2 text-sm text-ink-700">
                    <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
                    Show guides on the preview
                  </label>
                  {showGuides && <Legend preset={preset} />}
                  {preset.print && (
                    <p className="mt-2 text-xs text-ink-500">
                      The guides assume your image is the whole print file, bleed included.
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <div className={`rounded-xl border p-4 ${STATUS_STYLE[verdict].box}`}>
                <p className="font-semibold text-ink-950">
                  {verdict === "pass" && `Looks right for ${preset.label}`}
                  {verdict === "warn" && "Passes, with something to check"}
                  {verdict === "fail" && "Needs a fix before you use it"}
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  {checks.filter((check) => check.status === "pass").length} of {checks.length} checks pass.
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {checks.map((check) => {
                  const style = STATUS_STYLE[check.status];
                  return (
                    <li key={check.id} className="flex gap-3 rounded-xl border border-ink-200 p-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}
                        aria-hidden
                      >
                        {style.symbol}
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-ink-950">
                          {check.title} <span className="sr-only">: {style.word}</span>
                        </p>
                        <p className="mt-0.5 leading-relaxed text-ink-700">{check.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {template && target && (
        <div className="mt-8 border-t border-ink-200 pt-6">
          <p className="text-sm font-semibold text-ink-950">Need a blank guide at this size?</p>
          <p className="mt-1 text-sm text-ink-700">
            A {target.width}×{target.height} px layer with the lines drawn on it. Put it under your artwork and hide it before you export.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {pngAllowed && (
              <button type="button" onClick={() => void handleTemplate("png")} disabled={downloading !== null} className={BUTTON}>
                {downloading === "png" ? "Preparing…" : "Download PNG"}
              </button>
            )}
            <button type="button" onClick={() => void handleTemplate("svg")} disabled={downloading !== null} className={BUTTON}>
              Download SVG
            </button>
            {!pngAllowed && <span className="text-xs text-ink-500">This size is too large for a PNG in a browser, so it comes as SVG only.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
