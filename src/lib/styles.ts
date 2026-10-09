import "server-only";

import fs from "node:fs";
import path from "node:path";

import { stripInline } from "./inline";
import {
  getExamplesForStyle,
  getScene,
  getScenes,
  isIndexable,
  type ContentItem,
  type Example,
  type Scene,
} from "./scenes";

/**
 * Landing pages for one style or theme of a maker, for example `/create/birthday-invitation-maker/unicorn`.
 * Content lives in `src/data/styles/<maker-slug>.json`. A page needs its own text and its own examples;
 * pages that fall short stay out of the index and out of the sitemap, like thin maker pages do.
 */
export interface StyleEntry {
  /** Value of the select option this page is about, for example "art_deco". */
  value: string;
  /** URL segment, for example "art-deco". */
  slug: string;
  seo: { title: string; description: string; h1: string };
  /** Two short paragraphs that say what the style looks like and who it suits. */
  intro: string[];
  bestFor: ContentItem[];
  /** Colors, type and layout choices of the style, and what to put in the form. */
  designNotes: ContentItem[];
  /** Sample entries for the form fields, so a visitor can start without thinking. */
  tryThese: string[];
  faq: { q: string; a: string }[];
}

export interface StyleFile {
  /** Slug of the maker this file belongs to. */
  scene: string;
  /** Key of the select field the styles belong to. */
  field: string;
  /** What the option is called on the page: "style" or "theme". */
  noun: "style" | "theme";
  /** Heading for the list of styles on the maker page, for example "Birthday invitation themes". */
  collection: string;
  updated: string;
  styles: StyleEntry[];
}

export const MIN_STYLE_EXAMPLES = 2;
export const MIN_STYLE_WORDS = 380;

const DIR = path.join(process.cwd(), "src", "data", "styles");
let cache: StyleFile[] | null = null;

export function getStyleFiles(): StyleFile[] {
  if (!cache) {
    cache = fs.existsSync(DIR)
      ? fs
          .readdirSync(DIR)
          .filter((name) => name.endsWith(".json"))
          .map((name) => JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8")) as StyleFile)
          .filter((file) => getScenes().some((scene) => scene.slug === file.scene))
      : [];
  }
  return cache;
}

export function getStyleFile(sceneSlug: string): StyleFile | undefined {
  return getStyleFiles().find((file) => file.scene === sceneSlug);
}

export function getStyle(sceneSlug: string, slug: string): { file: StyleFile; style: StyleEntry } | undefined {
  const file = getStyleFile(sceneSlug);
  const style = file?.styles.find((entry) => entry.slug === slug);
  return file && style ? { file, style } : undefined;
}

export function stylePath(sceneSlug: string, style: StyleEntry): string {
  return `/create/${sceneSlug}/${style.slug}`;
}

/** The label the form shows for this option, for example "Unicorn & rainbow". */
export function styleLabel(scene: Scene, file: StyleFile, style: StyleEntry): string {
  const field = scene.fields.find((f) => f.key === file.field);
  return field?.options?.find((option) => option.value === style.value)?.label ?? style.slug;
}

export function styleExamples(sceneSlug: string, style: StyleEntry): Example[] {
  return getExamplesForStyle(sceneSlug, style.value);
}

export function styleWordCount(style: StyleEntry): number {
  const text = [
    style.intro,
    style.bestFor.flatMap((item) => [item.title, item.description]),
    style.designNotes.flatMap((item) => [item.title, item.description]),
    style.tryThese,
    style.faq.flatMap((item) => [item.q, item.a]),
  ]
    .flat(2)
    .join(" ");
  return stripInline(text).split(/\s+/).filter(Boolean).length;
}

export function styleIssues(file: StyleFile, style: StyleEntry): string[] {
  const issues: string[] = [];
  const scene = getScene(file.scene);
  if (!scene) return [`unknown maker "${file.scene}"`];
  if (!scene.fields.some((f) => f.key === file.field && f.options?.some((o) => o.value === style.value))) {
    issues.push(`the maker has no option "${style.value}" in field "${file.field}"`);
  }
  if (!isIndexable(scene)) issues.push("the maker page is not indexable");
  const examples = styleExamples(file.scene, style).length;
  if (examples < MIN_STYLE_EXAMPLES) issues.push(`needs ${MIN_STYLE_EXAMPLES} approved examples (has ${examples})`);
  const words = styleWordCount(style);
  if (words < MIN_STYLE_WORDS) issues.push(`needs ${MIN_STYLE_WORDS} words of style text (has ${words})`);
  if (style.faq.length < 3) issues.push(`needs 3 FAQ entries (has ${style.faq.length})`);
  return issues;
}

export function isStyleIndexable(file: StyleFile, style: StyleEntry): boolean {
  return styleIssues(file, style).length === 0;
}

/** Prints which style pages are held back and why. Called once while building. */
export function logStyleIndexability(): void {
  for (const { file, style } of getStylePages()) {
    const issues = styleIssues(file, style);
    if (issues.length > 0) console.info(`[seo] ${stylePath(file.scene, style)} is noindex: ${issues.join("; ")}`);
  }
}

/** All style pages of makers that have a style file. */
export function getStylePages(): { file: StyleFile; style: StyleEntry }[] {
  return getStyleFiles().flatMap((file) => file.styles.map((style) => ({ file, style })));
}
