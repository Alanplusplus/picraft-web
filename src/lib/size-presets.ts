/**
 * Pure helpers for the image size checker. They run on the server (the preset table on the page) and in the
 * browser (the checks and the guide templates), so this file must not import anything server-only.
 *
 * Every number comes from a preset in `src/data/tools/image-size-checker.json`, and each preset points at the
 * size guide that cites the official page for it.
 */

export type ImageFormat = "jpg" | "png" | "webp" | "gif" | "tiff" | "other";

/** Print resolution used for every print preset. */
export const PRINT_DPI = 300;

export interface PrintSpec {
  trimWidth: number;
  trimHeight: number;
  /** Bleed per edge, in the same unit as the trim size. */
  bleed: number;
  unit: "in" | "mm";
  /** Safe margin inside the trim line, in the same unit. */
  safe?: number;
}

/** A rectangle drawn over the preview, in fractions of the frame (0 to 1). */
export interface Zone {
  kind: "avoid" | "suggest";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface SizePreset {
  id: string;
  group: string;
  label: string;
  /** Slug of the size guide that cites the numbers. */
  guide: string;
  /** Slug of the maker that exports this kind of file. */
  maker: string;
  /** Target pixels. Print presets leave it out; it follows from `print`. */
  width?: number;
  height?: number;
  print?: PrintSpec;
  minWidth?: number;
  minHeight?: number;
  /** Rule on the longest side only, for marketplace images. */
  minLongSide?: number;
  recLongSide?: number;
  maxSide?: number;
  /** Expected width:height. Print presets and presets with a target size use their own ratio when this is empty. */
  aspect?: [number, number];
  /** Kindle covers: height divided by width must be at least this. */
  minHeightToWidth?: number;
  formats?: Exclude<ImageFormat, "other">[];
  maxBytes?: number;
  /** A size above this is a warning, above `maxBytes` a failure. */
  warnBytes?: number;
  bytesNote?: string;
  /** Needs real transparent pixels (stickers, shirts). */
  transparent?: boolean;
  /** Main marketplace image: pure white background and a minimum product fill. */
  whiteBackground?: boolean;
  minFill?: number;
  zones?: Zone[];
  notes?: string[];
}

export interface ImageInfo {
  width: number;
  height: number;
  bytes: number;
  format: ImageFormat;
  /** Share of pixels that are transparent (0 to 1). */
  transparentShare: number;
  /** Share of border pixels that are pure white, with a little tolerance for JPEG noise (0 to 1). */
  whiteBorderShare: number;
  /** How much of the frame the non-white content spans, the larger of width and height (0 to 1). */
  fill: number;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  status: CheckStatus;
  title: string;
  detail: string;
}

const MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 2 : 1)} MB`;
}

/** A size limit as a person would write it: "2 MB", not "2.00 MB". */
function formatLimit(bytes: number): string {
  return bytes % MB === 0 ? `${bytes / MB} MB` : formatBytes(bytes);
}

const FORMAT_LABEL: Record<ImageFormat, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  tiff: "TIFF",
  other: "this format",
};

function formatList(formats: readonly string[]): string {
  const labels = formats.map((format) => FORMAT_LABEL[format as ImageFormat] ?? format.toUpperCase());
  return labels.length <= 2 ? labels.join(" or ") : `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "16:9" when the ratio reduces to small numbers, otherwise a decimal such as "2.35:1". */
export function ratioLabel(width: number, height: number): string {
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;
  if (w <= 40 && h <= 40) return `${w}:${h}`;
  return `${(width / height).toFixed(2)}:1`;
}

const toInches = (value: number, unit: "in" | "mm") => (unit === "mm" ? value / 25.4 : value);

/** Size of the print file in inches, bleed included. */
export function printFrameInches(print: PrintSpec): { width: number; height: number } {
  return {
    width: toInches(print.trimWidth + 2 * print.bleed, print.unit),
    height: toInches(print.trimHeight + 2 * print.bleed, print.unit),
  };
}

/** Pixel size of the print file at 300 DPI, bleed included. */
export function printPixels(print: PrintSpec): { width: number; height: number } {
  const frame = printFrameInches(print);
  return { width: Math.round(frame.width * PRINT_DPI), height: Math.round(frame.height * PRINT_DPI) };
}

/** The pixel size a preset aims for, or null for presets that only have a rule on the longest side. */
export function presetTarget(preset: SizePreset): { width: number; height: number } | null {
  if (preset.print) return printPixels(preset.print);
  if (preset.width && preset.height) return { width: preset.width, height: preset.height };
  return null;
}

function expectedAspect(preset: SizePreset): [number, number] | null {
  if (preset.aspect) return preset.aspect;
  if (preset.minHeightToWidth) return null;
  const target = presetTarget(preset);
  return target ? [target.width, target.height] : null;
}

const frameLabel = (print: PrintSpec) => {
  const frame = printFrameInches(print);
  return print.unit === "mm"
    ? `${print.trimWidth + 2 * print.bleed}×${print.trimHeight + 2 * print.bleed} mm`
    : `${Number(frame.width.toFixed(3))}×${Number(frame.height.toFixed(3))} in`;
};

/** One-line description of the target size, for the preset table. */
export function presetTargetLabel(preset: SizePreset): string {
  const target = presetTarget(preset);
  if (preset.print && target) {
    return `${target.width}×${target.height} px at ${PRINT_DPI} DPI (${frameLabel(preset.print)} with bleed)`;
  }
  if (target) return `${target.width}×${target.height} px`;
  if (preset.minLongSide) return `Longest side ${preset.minLongSide} px or more`;
  return "See notes";
}

/** The other rules of a preset, as short phrases for the preset table. */
export function presetRules(preset: SizePreset): string[] {
  const rules: string[] = [];
  const aspect = expectedAspect(preset);
  if (preset.minHeightToWidth) rules.push(`Height at least ${preset.minHeightToWidth}× the width`);
  else if (aspect && !preset.print) rules.push(`Ratio ${aspect[0]}:${aspect[1]}`);
  if (preset.minWidth && preset.minHeight) rules.push(`Minimum ${preset.minWidth}×${preset.minHeight} px`);
  else if (preset.minWidth) rules.push(`At least ${preset.minWidth} px wide`);
  else if (preset.minHeight) rules.push(`At least ${preset.minHeight} px tall`);
  if (preset.recLongSide) rules.push(`${preset.recLongSide} px or more recommended`);
  if (preset.maxSide) rules.push(`Up to ${preset.maxSide.toLocaleString("en-US")} px`);
  if (preset.formats) rules.push(formatList(preset.formats));
  if (preset.warnBytes && preset.maxBytes) {
    rules.push(`${formatLimit(preset.warnBytes)} or less is safest, ${formatLimit(preset.maxBytes)} at most`);
  } else if (preset.maxBytes) rules.push(`Under ${formatLimit(preset.maxBytes)}`);
  if (preset.print) {
    const { bleed, safe, unit } = preset.print;
    rules.push(`${bleed} ${unit} bleed on every edge`);
    if (safe) rules.push(`Keep text ${safe} ${unit} inside the trim`);
  }
  if (preset.transparent) rules.push("Transparent background");
  if (preset.whiteBackground) rules.push("Pure white background");
  if (preset.minFill) rules.push(`Product fills ${Math.round(preset.minFill * 100)}% or more`);
  return rules;
}

/** Runs every check that applies to the preset. The order is the order shown on the page. */
export function runChecks(preset: SizePreset, image: ImageInfo): Check[] {
  const checks: Check[] = [];
  const { width, height, bytes, format } = image;
  const longSide = Math.max(width, height);
  const target = presetTarget(preset);

  // Pixel size, or resolution at print size.
  if (preset.print && target) {
    const frame = printFrameInches(preset.print);
    const dpi = Math.min(width / frame.width, height / frame.height);
    const detail = `Printed at ${frameLabel(preset.print)} (trim plus bleed), this image is ${Math.round(dpi)} DPI. The target is ${target.width}×${target.height} px at ${PRINT_DPI} DPI.`;
    const status: CheckStatus = dpi >= PRINT_DPI - 1 ? "pass" : dpi >= 150 ? "warn" : "fail";
    checks.push({
      id: "resolution",
      status,
      title: "Resolution at print size",
      detail:
        status === "pass"
          ? detail
          : `${detail} Most print shops ask for ${PRINT_DPI} DPI; below about 150 DPI print looks soft.`,
    });
  } else if (preset.minLongSide) {
    let status: CheckStatus = "pass";
    let detail = `Longest side is ${longSide} px.`;
    if (longSide < preset.minLongSide) {
      status = "fail";
      detail = `Longest side is ${longSide} px; the minimum is ${preset.minLongSide} px.`;
    } else if (preset.recLongSide && longSide < preset.recLongSide) {
      status = "warn";
      detail = `Longest side is ${longSide} px. That meets the ${preset.minLongSide} px minimum, but ${preset.recLongSide} px or more is recommended.`;
    } else if (preset.maxSide && longSide > preset.maxSide) {
      status = "fail";
      detail = `Longest side is ${longSide} px; the maximum is ${preset.maxSide.toLocaleString("en-US")} px.`;
    }
    checks.push({ id: "pixels", status, title: "Pixel size", detail });
  } else if (target) {
    const belowMin = (preset.minWidth && width < preset.minWidth) || (preset.minHeight && height < preset.minHeight);
    const hasMin = Boolean(preset.minWidth || preset.minHeight);
    let status: CheckStatus;
    let detail: string;
    if (belowMin) {
      status = "fail";
      const need = [preset.minWidth && `${preset.minWidth} px wide`, preset.minHeight && `${preset.minHeight} px tall`]
        .filter(Boolean)
        .join(" and ");
      detail = `${width}×${height} px is below the minimum of ${need}.`;
    } else if (width >= target.width && height >= target.height) {
      status = "pass";
      detail =
        width === target.width && height === target.height
          ? `${width}×${height} px, exactly the target.`
          : `${width}×${height} px, at or above the ${target.width}×${target.height} px target.`;
    } else {
      status = "warn";
      detail = hasMin
        ? `${width}×${height} px meets the minimum but is smaller than the ${target.width}×${target.height} px target.`
        : `${width}×${height} px is smaller than the ${target.width}×${target.height} px target, so it would be scaled up and look soft.`;
    }
    if (status !== "fail" && preset.maxSide && longSide > preset.maxSide) {
      status = "fail";
      detail = `Longest side is ${longSide} px; the maximum is ${preset.maxSide.toLocaleString("en-US")} px.`;
    }
    checks.push({ id: "pixels", status, title: "Pixel size", detail });
  }

  // Aspect ratio.
  const aspect = expectedAspect(preset);
  const actual = width / height;
  if (preset.minHeightToWidth) {
    const ratio = height / width;
    const ok = ratio >= preset.minHeightToWidth - 0.001;
    checks.push({
      id: "aspect",
      status: ok ? "pass" : "fail",
      title: "Aspect ratio",
      detail: ok
        ? `Height is ${ratio.toFixed(2)}× the width, at least the ${preset.minHeightToWidth}:1 that is required.`
        : `Height is only ${ratio.toFixed(2)}× the width; at least ${preset.minHeightToWidth}:1 is required. Make the image taller or crop the sides.`,
    });
  } else if (aspect) {
    const expected = aspect[0] / aspect[1];
    const off = Math.abs(actual - expected) / expected;
    const expectedText = preset.aspect ? `${aspect[0]}:${aspect[1]}` : ratioLabel(aspect[0], aspect[1]);
    const cropPercent = Math.round((actual > expected ? 1 - expected / actual : 1 - actual / expected) * 100);
    const edge = actual > expected ? "sides" : "top and bottom";
    let status: CheckStatus = "pass";
    let detail = `${ratioLabel(width, height)} matches ${expectedText}.`;
    if (off > 0.05) {
      status = "fail";
      detail = `${ratioLabel(width, height)} is not ${expectedText}. Crop about ${cropPercent}% from the ${edge}, or the platform or printer will crop for you.`;
    } else if (off > 0.01) {
      status = "warn";
      detail = `${ratioLabel(width, height)} is close to ${expectedText} (off by ${(off * 100).toFixed(1)}%). A small crop of about ${cropPercent}% from the ${edge} fixes it.`;
    }
    checks.push({ id: "aspect", status, title: "Aspect ratio", detail });
  }

  // File size.
  if (preset.maxBytes || preset.warnBytes) {
    const note = preset.bytesNote ? ` ${preset.bytesNote}` : "";
    let status: CheckStatus = "pass";
    let detail = `${formatBytes(bytes)}, within the limit.`;
    if (preset.maxBytes && bytes > preset.maxBytes) {
      status = "fail";
      detail = `${formatBytes(bytes)} is over the ${formatLimit(preset.maxBytes)} limit.`;
    } else if (preset.warnBytes && bytes > preset.warnBytes) {
      status = "warn";
      detail = `${formatBytes(bytes)} is over ${formatLimit(preset.warnBytes)}.`;
    }
    checks.push({ id: "bytes", status, title: "File size", detail: `${detail}${note}` });
  }

  // File type.
  if (preset.formats) {
    const ok = format !== "other" && preset.formats.includes(format);
    checks.push({
      id: "format",
      status: ok ? "pass" : "fail",
      title: "File type",
      detail: ok
        ? `${FORMAT_LABEL[format]} is accepted.`
        : `${FORMAT_LABEL[format] === "this format" ? "This file type" : FORMAT_LABEL[format]} is not on the accepted list: ${formatList(preset.formats)}.`,
    });
  }

  // Transparency.
  if (preset.transparent) {
    const ok = image.transparentShare >= 0.01;
    checks.push({
      id: "transparent",
      status: ok ? "pass" : "fail",
      title: "Transparent background",
      detail: ok
        ? `${Math.round(image.transparentShare * 100)}% of the pixels are transparent.`
        : "No transparent pixels found, so the background is solid. Export a PNG with the background removed.",
    });
  }

  // Marketplace main image: background and product fill. Both are estimates from a reduced copy of the image.
  if (preset.whiteBackground) {
    const share = image.whiteBorderShare;
    const status: CheckStatus = share >= 0.98 ? "pass" : share >= 0.9 ? "warn" : "fail";
    checks.push({
      id: "white",
      status,
      title: "Pure white background (estimate)",
      detail:
        status === "pass"
          ? `${Math.round(share * 100)}% of the border pixels are pure white (RGB 255, 255, 255 within JPEG noise).`
          : `Only ${Math.round(share * 100)}% of the border pixels are pure white. Marketplace main images need RGB 255, 255, 255; off-white and shadows at the edge fail.`,
    });
  }
  if (preset.minFill) {
    const ok = image.fill >= preset.minFill;
    checks.push({
      id: "fill",
      status: ok ? "pass" : "warn",
      title: "Product fill (estimate)",
      detail: ok
        ? `The product spans about ${Math.round(image.fill * 100)}% of the frame.`
        : `The product spans about ${Math.round(image.fill * 100)}% of the frame; ${Math.round(preset.minFill * 100)}% or more is asked for. The marketplace does not publish how it measures this, so treat it as a guide.`,
    });
  }

  return checks;
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Biggest template PNG the browser can draw safely; larger sizes are offered as SVG only. */
export const MAX_TEMPLATE_PIXELS = 16_000_000;

/**
 * An SVG guide layer at the exact pixel size of the preset: bleed band, trim line and safe area for print,
 * and the keep-clear or text zones for platform presets. Put it under the artwork and hide it before export.
 */
export function buildTemplateSvg(preset: SizePreset): string | null {
  const target = presetTarget(preset);
  if (!target) return null;
  const { width: w, height: h } = target;
  const unit = Math.min(w, h);
  const stroke = Math.max(2, Math.round(unit / 400));
  const font = Math.max(14, Math.round(unit * 0.03));
  const label = (x: number, y: number, text: string, color: string, anchor: "start" | "middle" | "end" = "start") =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${font}" fill="${color}" text-anchor="${anchor}">${escapeXml(text)}</text>`;

  const parts: string[] = [];
  const title = `${preset.label}: ${w}×${h} px`;

  if (preset.print) {
    const frame = printFrameInches(preset.print);
    const pxPerUnit = (w / frame.width) * (preset.print.unit === "mm" ? 1 / 25.4 : 1);
    const bleed = Math.round(preset.print.bleed * pxPerUnit);
    const safe = Math.round((preset.print.safe ?? 0) * pxPerUnit);
    parts.push(`<rect width="${w}" height="${h}" fill="#fde3dc"/>`);
    parts.push(`<rect x="${bleed}" y="${bleed}" width="${w - 2 * bleed}" height="${h - 2 * bleed}" fill="#ffffff" stroke="#111111" stroke-width="${stroke}"/>`);
    if (safe > 0) {
      parts.push(
        `<rect x="${bleed + safe}" y="${bleed + safe}" width="${w - 2 * (bleed + safe)}" height="${h - 2 * (bleed + safe)}" fill="none" stroke="#2563eb" stroke-width="${stroke}" stroke-dasharray="${stroke * 6} ${stroke * 4}"/>`,
      );
    }
    const inner = bleed + Math.max(safe, 0) + font * 0.6;
    parts.push(label(inner, inner + font, title, "#111111"));
    parts.push(label(inner, inner + font * 2.4, "Black line: trim (final cut)", "#111111"));
    if (safe > 0) parts.push(label(inner, inner + font * 3.8, "Blue dashes: safe area, keep text inside", "#2563eb"));
    parts.push(label(inner, inner + font * (safe > 0 ? 5.2 : 3.8), "Pink band: bleed, extend the background to the edge", "#b4381f"));
  } else {
    parts.push(`<rect width="${w}" height="${h}" fill="#ffffff" stroke="#111111" stroke-width="${stroke * 2}"/>`);
    for (const zone of preset.zones ?? []) {
      const x = Math.round(zone.x * w);
      const y = Math.round(zone.y * h);
      const zw = Math.round(zone.width * w);
      const zh = Math.round(zone.height * h);
      const avoid = zone.kind === "avoid";
      parts.push(
        `<rect x="${x}" y="${y}" width="${zw}" height="${zh}" fill="${avoid ? "#ef4444" : "#22c55e"}" fill-opacity="0.16" stroke="${avoid ? "#dc2626" : "#16a34a"}" stroke-width="${stroke}" stroke-dasharray="${stroke * 6} ${stroke * 4}"/>`,
      );
      parts.push(label(x + zw / 2, y + zh / 2 + font / 3, zone.label, avoid ? "#b91c1c" : "#15803d", "middle"));
    }
    parts.push(label(font, font * 1.8, title, "#111111"));
  }
  // Bottom-left for platform presets, because the keep-clear zones usually sit in the bottom-right corner.
  const footer = "picraft.ai/tools/image-size-checker";
  parts.push(
    preset.print
      ? label(w - font, h - font * 0.6, footer, "#8a8f99", "end")
      : label(font, h - font * 0.6, footer, "#8a8f99", "start"),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join("")}</svg>`;
}
