"use client";

/**
 * The free edits: everything here runs in the visitor's browser on a canvas, nothing is uploaded and nothing costs
 * credits. The editor (components/image-editor.tsx) keeps a stack of canvases, one per step, so every step can be undone.
 */

/** The longest side and the most pixels a working canvas may have: phones refuse canvases larger than about 16 million pixels. */
export const MAX_SIDE = 4096;
export const MAX_PIXELS = 16_000_000;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Adjustments {
  /** -100 to 100. */
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Frame {
  /** The space around the picture, in percent of its shorter side (0 to 20). */
  padding: number;
  /** How round the corners are, in percent of half the shorter side (0 to 100). */
  radius: number;
  /** "transparent", or a CSS color such as "#ffffff". */
  color: string;
}

export const NO_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };
export const NO_FRAME: Frame = { padding: 0, radius: 0, color: "transparent" };

export type ExportFormat = "png" | "jpg" | "webp";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** The size a picture has to be shrunk to so it stays within MAX_SIDE and MAX_PIXELS; the same size when it already fits. */
export function fitWithinLimits(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

/** Loads a picture from this site into a canvas, turned upright and shrunk to the limits if it is larger. */
export async function loadPicture(url: string): Promise<HTMLCanvasElement> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("This picture can't be loaded any more. Files are deleted after a while.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(await res.blob(), { imageOrientation: "from-image" });
  } catch {
    throw new Error("Your browser couldn't read this picture.");
  }
  const size = fitWithinLimits(bitmap.width, bitmap.height);
  const canvas = createCanvas(size.width, size.height);
  context(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** A copy that fits in `maxSide`, for drawing on screen quickly. The same canvas when it already fits. */
export function shrink(source: HTMLCanvasElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  if (scale === 1) return source;
  return resize(source, Math.round(source.width * scale), Math.round(source.height * scale));
}

export function resize(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const out = createCanvas(width, height);
  // A very large reduction in one step is jagged; halving until close keeps it smooth.
  let from = source;
  while (from.width / 2 > out.width && from.height / 2 > out.height) {
    const half = createCanvas(from.width / 2, from.height / 2);
    context(half).drawImage(from, 0, 0, half.width, half.height);
    from = half;
  }
  context(out).drawImage(from, 0, 0, out.width, out.height);
  return out;
}

export function rotate(source: HTMLCanvasElement, direction: "left" | "right"): HTMLCanvasElement {
  const out = createCanvas(source.height, source.width);
  const ctx = context(out);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(((direction === "right" ? 1 : -1) * Math.PI) / 2);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}

export function flip(source: HTMLCanvasElement, axis: "horizontal" | "vertical"): HTMLCanvasElement {
  const out = createCanvas(source.width, source.height);
  const ctx = context(out);
  if (axis === "horizontal") ctx.setTransform(-1, 0, 0, 1, out.width, 0);
  else ctx.setTransform(1, 0, 0, -1, 0, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

/** The part of a picture inside `rect`, which is given as fractions (0 to 1) of the picture. */
export function crop(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement {
  const x = Math.round(rect.x * source.width);
  const y = Math.round(rect.y * source.height);
  const w = Math.max(1, Math.min(source.width - x, Math.round(rect.w * source.width)));
  const h = Math.max(1, Math.min(source.height - y, Math.round(rect.h * source.height)));
  const out = createCanvas(w, h);
  context(out).drawImage(source, x, y, w, h, 0, 0, w, h);
  return out;
}

/** The largest crop with the proportions `ratio` (width over height, in pixels) that is centered in a picture. */
export function centeredCrop(width: number, height: number, ratio: number): Rect {
  const wide = width / height > ratio;
  const w = wide ? (height * ratio) / width : 1;
  const h = wide ? 1 : width / ratio / height;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function isNeutral(adjust: Adjustments): boolean {
  return adjust.brightness === 0 && adjust.contrast === 0 && adjust.saturation === 0;
}

/** Brightness, contrast and saturation. Done on the pixels because canvas filters are missing in some browsers. */
export function adjust(source: HTMLCanvasElement, values: Adjustments): HTMLCanvasElement {
  if (isNeutral(values)) return source;
  const out = createCanvas(source.width, source.height);
  const ctx = context(out);
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, out.width, out.height);
  const data = image.data;

  const add = values.brightness * 1.2;
  const c = values.contrast * 2.55;
  const contrast = (259 * (c + 255)) / (255 * (259 - c));
  const saturation = 1 + values.saturation / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + add;
    let g = data[i + 1] + add;
    let b = data[i + 2] + add;
    r = contrast * (r - 128) + 128;
    g = contrast * (g - 128) + 128;
    b = contrast * (b - 128) + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = gray + (r - gray) * saturation;
    data[i + 1] = gray + (g - gray) * saturation;
    data[i + 2] = gray + (b - gray) * saturation;
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

export function hasFrame(frame: Frame): boolean {
  return frame.padding > 0 || frame.radius > 0 || frame.color !== "transparent";
}

/** Space around the picture, a background color and rounded corners. Outside the corners the picture is transparent. */
export function frame(source: HTMLCanvasElement, values: Frame): HTMLCanvasElement {
  if (!hasFrame(values)) return source;
  const pad = Math.round((Math.min(source.width, source.height) * values.padding) / 100);
  const out = createCanvas(source.width + pad * 2, source.height + pad * 2);
  const ctx = context(out);
  const radius = (Math.min(out.width, out.height) / 2) * (values.radius / 100);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, out.width, out.height, radius);
  ctx.clip();
  if (values.color !== "transparent") {
    ctx.fillStyle = values.color;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.drawImage(source, pad, pad);
  ctx.restore();
  return out;
}

const MIME: Record<ExportFormat, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** The picture as a file. A JPG cannot be transparent, so what is transparent becomes white. */
export function encode(source: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  let canvas = source;
  if (format === "jpg") {
    canvas = createCanvas(source.width, source.height);
    const ctx = context(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Your browser couldn't save this image."))),
      MIME[format],
      quality,
    );
  });
}
