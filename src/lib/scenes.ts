import "server-only";

import fs from "node:fs";
import path from "node:path";

import { stripInline } from "./inline";
import type { CategoryId } from "./site";
import type { ClientScene, SceneField } from "./types";

/**
 * A scene page stays out of the index (noindex, and absent from the sitemap) until it clears
 * every bar below. Thin pages hurt a site's standing with Google, so new scenes start hidden.
 */
export const MIN_EXAMPLES_TO_INDEX = 3;
export const MIN_FAQ_TO_INDEX = 8;
export const MIN_WORDS_TO_INDEX = 900;

const DATA_DIR = path.join(process.cwd(), "src", "data", "scenes");

export interface OutputSpec {
  id: string;
  label: string;
  format: "jpg" | "png" | "pdf";
  when?: Record<string, string | string[]>;
  [key: string]: unknown;
}

export interface Scene {
  slug: string;
  name: string;
  category: CategoryId;
  summary: string;
  badge: string;
  indexable: boolean;
  seo: { title: string; description: string; h1: string; intro: string[] };
  cost: number;
  engine: { model: string; aspectRatio: string; resolution: string };
  fields: SceneField[];
  prompt: string;
  outputs: OutputSpec[];
  specs: { heading: string; columns: string[]; rows: string[][]; notes?: string[] };
  steps: { title: string; description: string }[];
  faq: { q: string; a: string }[];
  related: string[];
}

export interface Example {
  url: string;
  alt: string;
  width: number;
  height: number;
  approved: boolean;
  /** Value of the style / theme option the example was made with, for makers that have style pages. */
  style?: string;
  /** Original / "before" image for photo-editing scenes (product, real-estate). */
  before?: string;
  /** Alt text for the "before" image; falls back to a generic description. */
  beforeAlt?: string;
}

export interface ContentItem {
  title: string;
  description: string;
}

/**
 * Editorial content for a scene page, stored in `content-<slug>.json` next to the scene file.
 * The backend never reads it, so it does not need a copy under `backend/scenes/`.
 */
export interface SceneContent {
  /** ISO date (YYYY-MM-DD) shown as "Last updated". Change it whenever the page text is revised. */
  updated: string;
  overview: { heading: string; paragraphs: string[] };
  whatYouGet: ContentItem[];
  useCases: ContentItem[];
  tips: ContentItem[];
  /** Optional guide to the style / theme / genre choices of scenes that have them. */
  styleGuide?: { heading: string; intro?: string; items: ContentItem[] };
  checklist: { heading: string; items: string[] };
  /** What the maker can't do, so visitors know before they try. */
  limits: string[];
  /** Official rules the scene follows, linked for readers who want to check them. */
  sources?: { label: string; url: string }[];
}

const CONTENT_PREFIX = "content-";

let cache: Scene[] | null = null;

export function getScenes(): Scene[] {
  if (!cache) {
    cache = fs
      .readdirSync(DATA_DIR)
      .filter((name) => name.endsWith(".json") && !name.startsWith("examples-") && !name.startsWith(CONTENT_PREFIX))
      .map((name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8")) as Scene)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return cache;
}

export function getScene(slug: string): Scene | undefined {
  return getScenes().find((scene) => scene.slug === slug);
}

export function getScenesByCategory(category: CategoryId): Scene[] {
  return getScenes().filter((scene) => scene.category === category);
}

export function getExamples(slug: string): Example[] {
  const file = path.join(DATA_DIR, `examples-${slug}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { items?: Example[] };
  return (data.items ?? []).filter((item) => item.approved);
}

export function getExamplesForStyle(slug: string, style: string): Example[] {
  return getExamples(slug).filter((example) => example.style === style);
}

export function getContent(slug: string): SceneContent | undefined {
  const file = path.join(DATA_DIR, `${CONTENT_PREFIX}${slug}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SceneContent;
}

/** Returns the first approved example for a scene, or undefined. */
export function getCoverExample(slug: string): Example | undefined {
  return getExamples(slug)[0];
}

function collectText(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) if (key !== "url") collectText(item, out);
  }
  return out;
}

/** Words a visitor can read on the scene page, outside the generator form. */
export function pageWordCount(scene: Scene, content: SceneContent | undefined): number {
  const text = stripInline(collectText([scene.seo.intro, scene.steps, scene.specs, scene.faq, content]).join(" "));
  return text.split(/\s+/).filter(Boolean).length;
}

/** Why a scene page is not indexable yet. An empty list means it is. */
export function indexabilityIssues(scene: Scene): string[] {
  const issues: string[] = [];
  if (!scene.indexable) issues.push("disabled with indexable=false in the scene file");

  const examples = getExamples(scene.slug).length;
  if (examples < MIN_EXAMPLES_TO_INDEX) {
    issues.push(`needs ${MIN_EXAMPLES_TO_INDEX} approved examples (has ${examples})`);
  }
  if (scene.faq.length < MIN_FAQ_TO_INDEX) {
    issues.push(`needs ${MIN_FAQ_TO_INDEX} FAQ entries (has ${scene.faq.length})`);
  }

  const content = getContent(scene.slug);
  if (!content) {
    issues.push(`needs a content-${scene.slug}.json file`);
  } else {
    const missing = [
      ["whatYouGet", content.whatYouGet?.length >= 3],
      ["useCases", content.useCases?.length >= 3],
      ["tips", content.tips?.length >= 5],
      ["checklist", content.checklist?.items?.length >= 5],
      ["limits", content.limits?.length >= 3],
    ]
      .filter(([, ok]) => !ok)
      .map(([name]) => name);
    if (missing.length > 0) issues.push(`content is missing or too short: ${missing.join(", ")}`);
  }

  const words = pageWordCount(scene, content);
  if (words < MIN_WORDS_TO_INDEX) issues.push(`needs ${MIN_WORDS_TO_INDEX} words of page text (has ${words})`);
  return issues;
}

export function isIndexable(scene: Scene): boolean {
  return indexabilityIssues(scene).length === 0;
}

/** Prints which scene pages are held back and why. Called once while building. */
export function logIndexability(): void {
  for (const scene of getScenes()) {
    const issues = indexabilityIssues(scene);
    if (issues.length > 0) console.info(`[seo] ${scene.slug} is noindex: ${issues.join("; ")}`);
  }
}

export function toClientScene(scene: Scene): ClientScene {
  return {
    slug: scene.slug,
    name: scene.name,
    cost: scene.cost,
    fields: scene.fields.map((field) => ({
      ...field,
      options: field.options?.map(({ value, label }) => ({ value, label })),
    })),
    outputs: scene.outputs.map(({ id, label, when }) => ({ id, label, when })),
  };
}
