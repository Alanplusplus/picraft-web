import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getGuide, type GuideKind } from "./guides";
import { knownPages } from "./links";
import { getExamples, getExamplesForStyle, getScene, type Example } from "./scenes";
import { absoluteUrl, CATEGORIES, type Category, type CategoryId } from "./site";

/**
 * Pinterest RSS feeds. Pinterest turns every feed item into a Pin on one board, so there is one feed
 * per category. A feed lists only original pins that are made for Pinterest (`src/data/pins/daily.json`),
 * never the example images of the maker pages.
 *
 * Every pin image is an original file in image storage (OSS) and the feed links to it directly, so
 * Pinterest gets the uncompressed picture. Nothing here resizes or re-encodes it.
 */
export const PIN_MAX_TITLE = 100;
export const PIN_MAX_DESCRIPTION = 800;
/** Newest pins first; older ones drop out of the feed, which Pinterest has already read. */
export const FEED_MAX_ITEMS = 60;

/** Cards drawn in code are 1000×1500 layouts rendered at 2×, so the PNG in storage is 2000×3000. */
export const CARD_LAYOUT = { width: 1000, height: 1500 };
export const CARD_SCALE = 2;
export const CARD_SIZE = { width: CARD_LAYOUT.width * CARD_SCALE, height: CARD_LAYOUT.height * CARD_SCALE };
export const MAX_SHEET_ROWS = 8;
export const COLLAGE_SIZE = 4;
export const MAX_CHIPS = 4;
export const MAX_DEMO_INPUTS = 6;

/** Where the uploaded originals are served from. Override with PINTEREST_IMAGE_BASE if the storage domain changes. */
export function pinImageBase(): string {
  return (process.env.PINTEREST_IMAGE_BASE || "https://static.picraft.ai/picraft/pins").replace(/\/+$/, "");
}

export type PinKind = "sheet" | "collage" | "demo" | "beforeafter" | "image";

/** One pin in `src/data/pins/daily.json`. */
export interface DailyPinData {
  id: string;
  kind: PinKind;
  category: CategoryId;
  /** First day the pin appears in its feed, YYYY-MM-DD (UTC). */
  release: string;
  title: string;
  description: string;
  /** Path of the indexable page the pin leads to. */
  link: string;
  /** File name in image storage. Defaults to `<id>.png`. */
  file?: string;
  /** Pixel size of the stored original. Cards are 2000×3000; required for `image` pins. */
  width?: number;
  height?: number;
  /** A cheat sheet drawn from a table of a size guide, so the numbers match the guide. */
  sheet?: { guide: string; section: number; heading: string; subtitle?: string };
  /** Four real, approved examples under one headline. */
  collage?: { heading: string; items: { scene: string; style: string; label: string }[] };
  /** What a visitor types and the real result it produced. */
  demo?: { heading: string; scene: string; example: string; inputs: { label: string; value: string }[]; chips: string[] };
  /** A real before and after pair of one example. */
  beforeafter?: { heading: string; scene: string; example: string; chips: string[] };
}

export interface FeedItem {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  /** Absolute page URL the pin links to, with UTM parameters. */
  link: string;
  /** Absolute URL of the original image in storage. */
  image: string;
  imageType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  releasedAt: Date;
  kind: PinKind;
  data: DailyPinData;
}

function parseGuideRef(ref: string): { kind: GuideKind; slug: string } | undefined {
  const [kind, slug] = ref.split(":");
  return (kind === "size" || kind === "blog") && slug ? { kind, slug } : undefined;
}

/** The example of a look whose shape is closest to 2:3, which fills a pin best. */
export function collageExample(scene: string, style: string): Example | undefined {
  return [...getExamplesForStyle(scene, style)]
    .filter((example) => example.approved)
    .sort((a, b) => Math.abs(a.height / a.width - 1.5) - Math.abs(b.height / b.width - 1.5))[0];
}

/** An approved example picked by its image path, for demo and before/after pins. */
export function findExample(scene: string, url: string): Example | undefined {
  return getExamples(scene).find((example) => example.approved && example.url === url);
}

export function sheetTable(pin: DailyPinData) {
  const ref = pin.sheet && parseGuideRef(pin.sheet.guide);
  const guide = ref && getGuide(ref.kind, ref.slug);
  const table = guide && pin.sheet ? guide.sections[pin.sheet.section]?.table : undefined;
  return guide && table ? { guide, table } : undefined;
}

export function pinFile(pin: Pick<DailyPinData, "id" | "file">): string {
  return pin.file ?? `${pin.id}.png`;
}

function dailyIssues(pin: DailyPinData, pages: Map<string, boolean>): string[] {
  const issues: string[] = [];
  if (!/^[a-z0-9-]+$/.test(pin.id)) issues.push("id must use a-z, 0-9 and -");
  if (!CATEGORIES.some((category) => category.id === pin.category)) issues.push(`unknown category "${pin.category}"`);
  if (Number.isNaN(Date.parse(`${pin.release}T00:00:00Z`))) issues.push(`release "${pin.release}" is not YYYY-MM-DD`);
  if (!pin.title || pin.title.length > PIN_MAX_TITLE) issues.push(`title needs 1-${PIN_MAX_TITLE} characters`);
  if (pin.description.length < 60 || pin.description.length > PIN_MAX_DESCRIPTION) {
    issues.push(`description needs 60-${PIN_MAX_DESCRIPTION} characters`);
  }
  const indexable = pages.get(pin.link);
  if (!pin.link.startsWith("/") || indexable === undefined) issues.push(`link ${pin.link} is not a page`);
  else if (!indexable) issues.push(`link ${pin.link} is noindex`);
  if (!/\.(png|jpg)$/.test(pinFile(pin))) issues.push("file must end in .png or .jpg");

  const chipIssues = (chips: string[]) => {
    if (chips.length < 1 || chips.length > MAX_CHIPS) issues.push(`needs 1-${MAX_CHIPS} chips`);
  };

  if (pin.kind === "image") {
    if (!pin.width || !pin.height) issues.push("an image pin needs width and height of the stored original");
    else if (pin.height / pin.width < 1 || pin.height / pin.width > 1.52) issues.push("image must be between 1:1 and 2:3");
  } else if (pin.kind === "sheet") {
    const found = sheetTable(pin);
    if (!found) issues.push("sheet needs a guide and a section with a table");
    else {
      if (!found.guide.sources?.length) issues.push(`guide ${pin.sheet?.guide} has no sources, so it cannot back a cheat sheet`);
      if (found.table.rows.length > MAX_SHEET_ROWS) issues.push(`table has more than ${MAX_SHEET_ROWS} rows`);
      if (found.table.columns.length !== 2) issues.push("a sheet needs a table with 2 columns");
    }
  } else if (pin.kind === "collage") {
    const items = pin.collage?.items ?? [];
    if (items.length !== COLLAGE_SIZE) issues.push(`collage needs ${COLLAGE_SIZE} items`);
    for (const item of items) {
      if (!getScene(item.scene) || !collageExample(item.scene, item.style)) {
        issues.push(`collage item ${item.scene}/${item.style} has no approved example`);
      }
    }
  } else if (pin.kind === "demo") {
    const demo = pin.demo;
    if (!demo || !findExample(demo.scene, demo.example)) issues.push("demo needs an approved example of its maker");
    else {
      chipIssues(demo.chips);
      if (demo.inputs.length < 1 || demo.inputs.length > MAX_DEMO_INPUTS) issues.push(`demo needs 1-${MAX_DEMO_INPUTS} inputs`);
    }
  } else if (pin.kind === "beforeafter") {
    const pair = pin.beforeafter;
    const example = pair && findExample(pair.scene, pair.example);
    if (!pair || !example) issues.push("beforeafter needs an approved example of its maker");
    else {
      if (!example.before) issues.push("that example has no before image");
      chipIssues(pair.chips);
    }
  } else {
    issues.push(`unknown kind "${pin.kind}"`);
  }
  return issues;
}

let cache: FeedItem[] | null = null;

function readDailyFile(): DailyPinData[] {
  const file = path.join(process.cwd(), "src", "data", "pins", "daily.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { pins: DailyPinData[] }).pins;
}

/** Every pin, checked. A broken pin fails a production build, so a feed never serves a dead link. */
export function getDailyPins(): FeedItem[] {
  if (cache) return cache;
  const pages = knownPages();
  const seen = new Set<string>();
  const errors: string[] = [];
  const pins: FeedItem[] = [];

  for (const data of readDailyFile()) {
    const issues = dailyIssues(data, pages);
    if (seen.has(data.id)) issues.push("duplicate id");
    seen.add(data.id);
    if (issues.length > 0) {
      errors.push(`  - ${data.id}: ${issues.join("; ")}`);
      continue;
    }
    const url = new URL(absoluteUrl(data.link));
    url.searchParams.set("utm_source", "pinterest");
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", `daily_${data.category}`);
    const file = pinFile(data);
    pins.push({
      id: data.id,
      category: data.category,
      title: data.title,
      description: data.description,
      link: url.toString(),
      image: `${pinImageBase()}/${file}`,
      imageType: file.endsWith(".jpg") ? "image/jpeg" : "image/png",
      width: data.width ?? CARD_SIZE.width,
      height: data.height ?? CARD_SIZE.height,
      releasedAt: new Date(`${data.release}T00:00:00Z`),
      kind: data.kind,
      data,
    });
  }

  if (errors.length > 0) {
    const message = `Invalid pins in src/data/pins/daily.json:\n${errors.join("\n")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.error(`[pinterest] ${message}`);
  }
  cache = pins;
  return pins;
}

/** The pins a feed lists at a given moment: released ones, newest first. */
export function getFeedItems(category: CategoryId, now: Date = new Date()): FeedItem[] {
  return getDailyPins()
    .filter((pin) => pin.category === category && pin.releasedAt.getTime() <= now.getTime())
    .sort((a, b) => b.releasedAt.getTime() - a.releasedAt.getTime())
    .slice(0, FEED_MAX_ITEMS);
}

export function feedFileName(category: Category): string {
  return `${category.slug}.xml`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 document for one category feed. Image URLs go in both `enclosure` and `media:content`. */
export function buildFeedXml(category: Category, now: Date = new Date()): string {
  const items = getFeedItems(category.id, now);
  const selfUrl = absoluteUrl(`/feeds/pinterest/${feedFileName(category)}`);
  const body = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <guid isPermaLink="false">pin-${escapeXml(item.id)}</guid>
      <pubDate>${item.releasedAt.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(item.image)}" length="0" type="${item.imageType}" />
      <media:content url="${escapeXml(item.image)}" medium="image" type="${item.imageType}" width="${item.width}" height="${item.height}" />
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`PiCraft – ${category.name}`)}</title>
    <link>${escapeXml(absoluteUrl(`/categories/${category.slug}`))}</link>
    <description>${escapeXml(category.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;
}
