import "server-only";

import crypto from "node:crypto";
import path from "node:path";

import { getExamples, getScenes, isIndexable, type Example, type Scene } from "./scenes";
import { absoluteUrl, CATEGORIES, categoryPath, type Category, type CategoryId } from "./site";
import { getStyleFile, isStyleIndexable, stylePath } from "./styles";

/**
 * Pinterest RSS feeds. Pinterest turns every feed item into a Pin on one board, so there is one feed
 * per category and each feed lists the public example images of that category's makers.
 *
 * Pinterest recommends a 2:3 image (1000×1500 px) and may cut off anything taller, so the pin image
 * route keeps shapes between 1:1 and 2:3 as they are and trims taller ones to 2:3.
 */
export const PIN_WIDTH = 1000;
export const PIN_MAX_RATIO = 1.5;
export const PIN_MAX_TITLE = 100;
export const PIN_MAX_DESCRIPTION = 800;

const DAY_MS = 86_400_000;

/** First day a feed releases pins. Set PINTEREST_FEED_START (YYYY-MM-DD) to the day you connect the feeds. */
const DEFAULT_FEED_START = "2026-10-15";

function feedStart(): number {
  const value = process.env.PINTEREST_FEED_START || DEFAULT_FEED_START;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? Date.parse(`${DEFAULT_FEED_START}T00:00:00Z`) : time;
}

/** How many new pins each feed releases per day. A new Pinterest account should not receive a flood of pins at once. */
function pinsPerDay(): number {
  const value = Number.parseInt(process.env.PINTEREST_PINS_PER_DAY ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 5;
}

export interface PinItem {
  /** File name of the pin image, for example `3f2a9c1d5b7e4a60.jpg`. */
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  /** Absolute page URL the pin links to, with UTM parameters. */
  link: string;
  /** Absolute URL of the pin image. */
  image: string;
  width: number;
  height: number;
  /** Path of the source image below `public/`, for example `/examples/sticker-maker_1.webp`. */
  source: string;
}

export interface FeedItem extends PinItem {
  releasedAt: Date;
}

function pinId(example: Example): string {
  return `${crypto.createHash("sha1").update(example.url).digest("hex").slice(0, 16)}.jpg`;
}

/** Output size of a pin image: at most 1000 px wide, never taller than 2:3. */
export function pinSize(example: Pick<Example, "width" | "height">): { width: number; height: number } {
  const width = Math.min(PIN_WIDTH, example.width);
  const ratio = Math.min(example.height / example.width, PIN_MAX_RATIO);
  return { width, height: Math.round(width * ratio) };
}

export function pinSourceFile(item: Pick<PinItem, "source">): string {
  return path.join(process.cwd(), "public", item.source);
}

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–-]+$/, "")}…`;
}

/** A pin title of at most `max` characters that ends at a natural break instead of a trailing ellipsis. */
function titleFrom(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  for (const separator of [", ", " with ", " and ", " in "]) {
    const at = head.lastIndexOf(separator);
    if (at >= 40) return head.slice(0, at);
  }
  return trimTo(text, max);
}

function sentence(text: string): string {
  return text.trim().replace(/[.!?\s]+$/, "");
}

function targetPath(scene: Scene, example: Example): string {
  if (example.style) {
    const file = getStyleFile(scene.slug);
    const style = file?.styles.find((entry) => entry.value === example.style);
    if (file && style && isStyleIndexable(file, style)) return stylePath(scene.slug, style);
  }
  return `/create/${scene.slug}`;
}

function toItem(scene: Scene, example: Example): PinItem {
  const id = pinId(example);
  const size = pinSize(example);
  const url = new URL(absoluteUrl(targetPath(scene, example)));
  url.searchParams.set("utm_source", "pinterest");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", `rss_${scene.category}`);
  const alt = sentence(example.alt);
  return {
    id,
    category: scene.category,
    title: titleFrom(alt, PIN_MAX_TITLE),
    description: trimTo(`${alt}. Made with the PiCraft ${scene.name}. ${scene.summary}`, PIN_MAX_DESCRIPTION),
    link: url.toString(),
    image: absoluteUrl(`/pins/${id}`),
    ...size,
    source: example.url,
  };
}

/** Round-robin over several lists, so the first items of a feed show variety instead of one maker. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let round = 0; round < longest; round += 1) {
    for (const list of lists) if (round < list.length) out.push(list[round]);
  }
  return out;
}

function sceneItems(scene: Scene): PinItem[] {
  // Landscape examples (banners, thumbnails, cards) are cropped badly on a vertical board, so skip them.
  const examples = getExamples(scene.slug).filter((example) => example.height >= example.width);
  const groups = new Map<string, Example[]>();
  for (const example of examples) {
    const key = example.style ?? "";
    groups.set(key, [...(groups.get(key) ?? []), example]);
  }
  return interleave([...groups.values()]).map((example) => toItem(scene, example));
}

/** Every pin of one category in release order, whether or not it is released yet. */
export function getCategoryPins(category: CategoryId): PinItem[] {
  const scenes = getScenes().filter((scene) => scene.category === category && isIndexable(scene));
  return interleave(scenes.map(sceneItems));
}

export function getAllPins(): PinItem[] {
  return CATEGORIES.flatMap((category) => getCategoryPins(category.id));
}

/** The pins a feed lists at a given moment: `PINTEREST_PINS_PER_DAY` more each day since the start date. */
export function getFeedItems(category: CategoryId, now: Date = new Date()): FeedItem[] {
  const start = feedStart();
  const perDay = pinsPerDay();
  return getCategoryPins(category)
    .map((pin, index) => ({ ...pin, releasedAt: new Date(start + Math.floor(index / perDay) * DAY_MS) }))
    .filter((pin) => pin.releasedAt.getTime() <= now.getTime());
}

export function feedFileName(category: Category): string {
  return `${category.slug}.xml`;
}

function escapeXml(text: string): string {
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
      <guid isPermaLink="false">pin-${item.id.replace(/\.jpg$/, "")}</guid>
      <pubDate>${item.releasedAt.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(item.image)}" length="0" type="image/jpeg" />
      <media:content url="${escapeXml(item.image)}" medium="image" type="image/jpeg" width="${item.width}" height="${item.height}" />
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`PiCraft – ${category.name}`)}</title>
    <link>${escapeXml(absoluteUrl(categoryPath(category.id)))}</link>
    <description>${escapeXml(category.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;
}
