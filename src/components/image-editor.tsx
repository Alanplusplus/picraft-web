"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  type Adjustments,
  type ExportFormat,
  type Frame,
  type Rect,
  MAX_SIDE,
  NO_ADJUSTMENTS,
  NO_FRAME,
  adjust,
  centeredCrop,
  crop,
  encode,
  fitWithinLimits,
  flip,
  frame,
  hasFrame,
  isNeutral,
  loadPicture,
  resize,
  rotate,
  shrink,
} from "@/lib/image-edit";

type Tab = "crop" | "rotate" | "resize" | "adjust" | "frame";
type Corner = "nw" | "ne" | "sw" | "se";

const TABS: { id: Tab; label: string }[] = [
  { id: "crop", label: "Crop" },
  { id: "rotate", label: "Rotate" },
  { id: "resize", label: "Resize" },
  { id: "adjust", label: "Adjust" },
  { id: "frame", label: "Frame" },
];

const RATIOS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "2:3", label: "2:3 Pin", ratio: 2 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
];

const SWATCHES = ["#ffffff", "#000000"];
const RESIZE_PRESETS = [1080, 1600, 2048, MAX_SIDE];
const PREVIEW_SIDE = 900;
const MAX_STEPS = 12;
const MIN_CROP = 0.05;
const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function moveRect(start: Rect, dx: number, dy: number): Rect {
  return {
    ...start,
    x: clamp(start.x + dx, 0, 1 - start.w),
    y: clamp(start.y + dy, 0, 1 - start.h),
  };
}

/** Drags one corner of the crop box; the opposite corner stays where it is. `ratio` is width over height in pixels. */
function resizeRect(start: Rect, corner: Corner, dx: number, dy: number, ratio: number | null, width: number, height: number): Rect {
  const east = corner === "ne" || corner === "se";
  const south = corner === "sw" || corner === "se";
  const ax = east ? start.x : start.x + start.w;
  const ay = south ? start.y : start.y + start.h;
  const cx = clamp((east ? start.x + start.w : start.x) + dx, 0, 1);
  const cy = clamp((south ? start.y + start.h : start.y) + dy, 0, 1);

  // The corner cannot be dragged past the opposite one.
  let w = Math.max(MIN_CROP, east ? cx - ax : ax - cx);
  let h = Math.max(MIN_CROP, south ? cy - ay : ay - cy);
  const roomW = east ? 1 - ax : ax;
  const roomH = south ? 1 - ay : ay;
  if (ratio) {
    // Width and height are tied together: follow the width, then pull both in until they fit.
    w = Math.min(w, roomW, (roomH * ratio * height) / width);
    h = (w * width) / (ratio * height);
  } else {
    w = Math.min(w, roomW);
    h = Math.min(h, roomH);
  }
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm text-ink-800">
        {label}
        <span className="tabular-nums text-ink-500">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-brand-600"
      />
    </label>
  );
}

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
    active ? "border-ink-950 bg-ink-950 text-white" : "border-ink-300 bg-white text-ink-800 hover:border-ink-500"
  }`;

/**
 * The free editor: crop, rotate and flip, resize, brightness / contrast / saturation, and a frame with rounded
 * corners, then save as PNG, JPG or WebP. It all happens in the browser: nothing is uploaded and it costs no credits.
 * `src` has to be a picture served from this site, otherwise the canvas could not be saved again.
 */
export function ImageEditor({
  src,
  scene,
  startFormat,
  onClose,
}: {
  src: string;
  scene: string;
  startFormat: ExportFormat;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "move" | Corner; start: Rect; x: number; y: number; width: number; height: number } | null>(null);

  const [stack, setStack] = useState<HTMLCanvasElement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("crop");
  const [ratioId, setRatioId] = useState("free");
  const [cropRect, setCropRect] = useState<Rect>(FULL);
  const [resizeInput, setResizeInput] = useState<{ w: string; h: string } | null>(null);
  const [lock, setLock] = useState(true);
  const [adj, setAdj] = useState<Adjustments>(NO_ADJUSTMENTS);
  const [fr, setFr] = useState<Frame>(NO_FRAME);
  const [format, setFormat] = useState<ExportFormat>(startFormat);
  const [quality, setQuality] = useState(90);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  const ratio = RATIOS.find((item) => item.id === ratioId)?.ratio ?? null;

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

  useEffect(() => {
    let active = true;
    loadPicture(src)
      .then((canvas) => {
        if (active) setStack([canvas]);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [src]);

  // What is drawn on screen is a smaller copy, so the sliders stay quick on a large picture.
  const small = useMemo(() => (current ? shrink(current, PREVIEW_SIDE) : null), [current]);
  const adjusted = useMemo(() => (small ? adjust(small, adj) : null), [small, adj]);
  const framed = useMemo(() => (adjusted ? frame(adjusted, fr) : null), [adjusted, fr]);
  const shown = tab === "crop" ? adjusted : framed;

  useEffect(() => {
    const canvas = view.current;
    if (!canvas || !shown) return;
    canvas.width = shown.width;
    canvas.height = shown.height;
    canvas.getContext("2d")?.drawImage(shown, 0, 0);
  }, [shown]);

  function push(next: HTMLCanvasElement) {
    setStack((prev) => [...prev, next].slice(-MAX_STEPS));
    setCropRect(FULL);
    setResizeInput(null);
  }

  function undo() {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setCropRect(FULL);
    setResizeInput(null);
  }

  function startOver() {
    setStack((prev) => prev.slice(0, 1));
    setCropRect(FULL);
    setResizeInput(null);
    setAdj(NO_ADJUSTMENTS);
    setFr(NO_FRAME);
    setRatioId("free");
  }

  function pickRatio(id: string) {
    setRatioId(id);
    const wanted = RATIOS.find((item) => item.id === id)?.ratio;
    if (wanted && current) setCropRect(centeredCrop(current.width, current.height, wanted));
  }

  function onDown(event: React.PointerEvent, kind: "move" | Corner) {
    if (!current || !box.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = box.current.getBoundingClientRect();
    drag.current = { kind, start: cropRect, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height };
  }

  function onMove(event: React.PointerEvent) {
    const d = drag.current;
    if (!d || !current) return;
    const dx = (event.clientX - d.x) / d.width;
    const dy = (event.clientY - d.y) / d.height;
    setCropRect(
      d.kind === "move" ? moveRect(d.start, dx, dy) : resizeRect(d.start, d.kind, dx, dy, ratio, current.width, current.height),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  const cropped = cropRect.w < 0.999 || cropRect.h < 0.999;
  const resizeW = resizeInput?.w ?? String(current?.width ?? "");
  const resizeH = resizeInput?.h ?? String(current?.height ?? "");

  function typeSize(side: "w" | "h", text: string) {
    if (!current) return;
    const digits = text.replace(/\D/g, "").slice(0, 5);
    const value = Number(digits);
    if (!lock || !value) {
      setResizeInput({ w: side === "w" ? digits : resizeW, h: side === "h" ? digits : resizeH });
      return;
    }
    const scale = side === "w" ? current.height / current.width : current.width / current.height;
    const other = String(Math.max(1, Math.round(value * scale)));
    setResizeInput(side === "w" ? { w: digits, h: other } : { w: other, h: digits });
  }

  function applyResize(width: number, height: number) {
    if (!current || !width || !height) return;
    const size = fitWithinLimits(width, height);
    push(resize(current, size.width, size.height));
  }

  function longestSide(side: number) {
    if (!current) return;
    const scale = side / Math.max(current.width, current.height);
    applyResize(Math.round(current.width * scale), Math.round(current.height * scale));
  }

  // The size the file will have: the working picture plus the space of the frame.
  const outputSize = useMemo(() => {
    if (!current) return null;
    const pad = Math.round((Math.min(current.width, current.height) * fr.padding) / 100);
    return { width: current.width + pad * 2, height: current.height + pad * 2 };
  }, [current, fr.padding]);

  async function save() {
    if (!current) return;
    setSaving(true);
    setSaveError(null);
    try {
      const blob = await encode(frame(adjust(current, adj), fr), format, quality / 100);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `picraft-edited.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      trackEvent("editor_download", { scene, format, steps: stack.length - 1 });
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const changed = stack.length > 1 || !isNeutral(adj) || hasFrame(fr);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="editor-title"
      onClose={() => {
        // A close that was queued before the window was opened again (React's double run in development) is stale.
        if (!dialog.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      // This window can sit on top of the My files viewer, which steps through designs with the arrow keys.
      onKeyDown={(event) => event.stopPropagation()}
      className="m-auto max-h-[96vh] w-[min(100%-1rem,60rem)] overflow-y-auto rounded-2xl border-0 bg-white p-4 shadow-2xl backdrop:bg-ink-950/70 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Free · in your browser</p>
          <h2 id="editor-title" className="mt-0.5 text-lg font-bold tracking-tight text-ink-950">
            Edit this image
          </h2>
          <p className="text-xs text-ink-500">Nothing is uploaded and it costs no credits. Your design stays as it is.</p>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-h-[16rem] items-center justify-center rounded-xl bg-ink-100 p-3">
          {loadError ? (
            <p className="max-w-xs text-center text-sm text-brand-700">{loadError}</p>
          ) : !shown ? (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-label="Loading" />
          ) : (
            <div ref={box} className="relative inline-block select-none leading-[0]">
              <canvas
                ref={view}
                aria-label="Preview of your edits"
                className="checkerboard block h-auto max-h-[46vh] w-auto max-w-full lg:max-h-[58vh]"
              />
              {tab === "crop" && (
                <>
                  {/* What is outside the box is darkened. It is clipped to the picture; the handles below are not. */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                      className="absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      style={{
                        left: `${cropRect.x * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.w * 100}%`,
                        height: `${cropRect.h * 100}%`,
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 touch-none">
                    <div
                      onPointerDown={(event) => onDown(event, "move")}
                      onPointerMove={onMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className="absolute cursor-move border-2 border-white outline outline-1 outline-black/40"
                      style={{
                        left: `${cropRect.x * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.w * 100}%`,
                        height: `${cropRect.h * 100}%`,
                      }}
                    >
                      {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                        <span
                          key={corner}
                          role="presentation"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            onDown(event, corner);
                          }}
                          onPointerMove={onMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          className={`absolute h-7 w-7 ${
                            corner === "nw"
                              ? "-left-3.5 -top-3.5 cursor-nwse-resize"
                              : corner === "ne"
                                ? "-right-3.5 -top-3.5 cursor-nesw-resize"
                                : corner === "sw"
                                  ? "-bottom-3.5 -left-3.5 cursor-nesw-resize"
                                  : "-bottom-3.5 -right-3.5 cursor-nwse-resize"
                          }`}
                        >
                          <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-ink-400 bg-white" />
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div role="tablist" aria-label="Tools" className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`shrink-0 grow rounded-lg px-2 py-1.5 text-[13px] font-medium transition ${
                  tab === item.id ? "bg-white text-ink-950 shadow-sm" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="min-h-[9.5rem] space-y-3">
            {tab === "crop" && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {RATIOS.map((item) => (
                    <button key={item.id} type="button" onClick={() => pickRatio(item.id)} className={chip(ratioId === item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-500">Drag the box or its corners on the picture.</p>
                <button
                  type="button"
                  disabled={!cropped || !current}
                  onClick={() => current && push(crop(current, cropRect))}
                  className="btn-secondary w-full !py-2"
                >
                  Apply crop
                </button>
              </>
            )}

            {tab === "rotate" && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Rotate left", () => current && push(rotate(current, "left"))],
                    ["Rotate right", () => current && push(rotate(current, "right"))],
                    ["Flip horizontally", () => current && push(flip(current, "horizontal"))],
                    ["Flip vertically", () => current && push(flip(current, "vertical"))],
                  ] as const
                ).map(([label, action]) => (
                  <button key={label} type="button" onClick={action} disabled={!current} className="btn-secondary !px-2 !py-2">
                    {label}
                  </button>
                ))}
              </div>
            )}

            {tab === "resize" && current && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-ink-600">
                    Width (px)
                    <input
                      className="field mt-1 !py-2"
                      inputMode="numeric"
                      value={resizeW}
                      onChange={(event) => typeSize("w", event.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-ink-600">
                    Height (px)
                    <input
                      className="field mt-1 !py-2"
                      inputMode="numeric"
                      value={resizeH}
                      onChange={(event) => typeSize("h", event.target.value)}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-800">
                  <input type="checkbox" checked={lock} onChange={(event) => setLock(event.target.checked)} className="accent-brand-600" />
                  Keep the proportions
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-ink-500">Longest side:</span>
                  {RESIZE_PRESETS.map((side) => (
                    <button key={side} type="button" onClick={() => longestSide(side)} className={chip(false)}>
                      {side}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => applyResize(Number(resizeW), Number(resizeH))}
                  disabled={!Number(resizeW) || !Number(resizeH) || (Number(resizeW) === current.width && Number(resizeH) === current.height)}
                  className="btn-secondary w-full !py-2"
                >
                  Apply size
                </button>
                <p className="text-xs text-ink-500">
                  Up to {MAX_SIDE} px. Making a picture larger here only stretches it; use Enlarge (AI) for a sharper result.
                </p>
              </>
            )}

            {tab === "adjust" && (
              <>
                <Slider label="Brightness" value={adj.brightness} min={-100} max={100} onChange={(brightness) => setAdj({ ...adj, brightness })} />
                <Slider label="Contrast" value={adj.contrast} min={-100} max={100} onChange={(contrast) => setAdj({ ...adj, contrast })} />
                <Slider label="Saturation" value={adj.saturation} min={-100} max={100} onChange={(saturation) => setAdj({ ...adj, saturation })} />
                <button type="button" disabled={isNeutral(adj)} onClick={() => setAdj(NO_ADJUSTMENTS)} className="text-sm text-ink-600 underline disabled:opacity-40">
                  Reset
                </button>
              </>
            )}

            {tab === "frame" && (
              <>
                <Slider label="Space around" value={fr.padding} min={0} max={20} suffix="%" onChange={(padding) => setFr({ ...fr, padding })} />
                <Slider label="Round the corners" value={fr.radius} min={0} max={100} suffix="%" onChange={(radius) => setFr({ ...fr, radius })} />
                <div>
                  <p className="text-sm text-ink-800">Background</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-label="Transparent"
                      aria-pressed={fr.color === "transparent"}
                      onClick={() => setFr({ ...fr, color: "transparent" })}
                      className={`checkerboard h-8 w-8 rounded-full border-2 ${fr.color === "transparent" ? "border-brand-600" : "border-ink-300"}`}
                    />
                    {SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={color === "#ffffff" ? "White" : "Black"}
                        aria-pressed={fr.color === color}
                        onClick={() => setFr({ ...fr, color })}
                        style={{ backgroundColor: color }}
                        className={`h-8 w-8 rounded-full border-2 ${fr.color === color ? "border-brand-600" : "border-ink-300"}`}
                      />
                    ))}
                    <label className="flex items-center gap-1.5 text-xs text-ink-600">
                      <input
                        type="color"
                        aria-label="Pick a color"
                        value={/^#[0-9a-f]{6}$/i.test(fr.color) ? fr.color : "#ffffff"}
                        onChange={(event) => setFr({ ...fr, color: event.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-full border border-ink-300 bg-white p-0.5"
                      />
                      Any color
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 border-t border-ink-100 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-950">Save</p>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={undo} disabled={stack.length < 2} className="text-ink-600 underline disabled:opacity-40">
                  Undo
                </button>
                <button type="button" onClick={startOver} disabled={!changed} className="text-ink-600 underline disabled:opacity-40">
                  Start over
                </button>
              </div>
            </div>
            <div role="radiogroup" aria-label="File type" className="flex gap-1.5">
              {(["png", "jpg", "webp"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={format === item}
                  onClick={() => setFormat(item)}
                  className={chip(format === item)}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
            {format !== "png" && <Slider label="Quality" value={quality} min={40} max={100} suffix="%" onChange={setQuality} />}
            {format === "jpg" && fr.color === "transparent" && (
              <p className="text-xs text-ink-500">A JPG can&apos;t be transparent: transparent parts become white.</p>
            )}
            {saveError && <p className="text-sm text-brand-700">{saveError}</p>}
            <button type="button" onClick={() => void save()} disabled={!current || saving} className="btn-primary w-full">
              {saving ? "Preparing…" : `Download ${format.toUpperCase()}${outputSize ? ` · ${outputSize.width}×${outputSize.height}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
