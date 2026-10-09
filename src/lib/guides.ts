import "server-only";

import fs from "node:fs";
import path from "node:path";

import { stripInline } from "./inline";
import { getScene } from "./scenes";

/**
 * Two kinds of long-form pages share one format:
 *  - "size": a spec reference for one kind of file, for example "YouTube thumbnail size" (`/sizes/<slug>`)
 *  - "blog": a how-to or explainer (`/blog/<slug>`)
 * Both live as JSON under `src/data/guides/<sizes|blog>/<slug>.json`; the file name is the slug.
 */
export type GuideKind = "size" | "blog";

export interface GuideTable {
  caption?: string;
  columns: string[];
  rows: string[][];
}

export interface GuideSection {
  heading: string;
  /** Plain paragraphs. Use `[label](/path)` for links. */
  paragraphs?: string[];
  items?: string[];
  /** Render `items` as a numbered list instead of bullets. */
  ordered?: boolean;
  table?: GuideTable;
  /** Paragraphs shown after the list or table. */
  after?: string[];
}

export interface Guide {
  kind: GuideKind;
  slug: string;
  /** Full page title for search results, without the site name. */
  title: string;
  h1: string;
  /** Meta description, about 150 to 160 characters. */
  description: string;
  /** The short answer, shown in a box right under the heading. */
  summary: string;
  /** Short label of a post's topic, shown on the blog index. */
  topic?: string;
  published: string;
  updated: string;
  /** The maker this page leads to. */
  scene: string;
  relatedScenes?: string[];
  /** Slugs of other guides of the same kind or `size:<slug>` / `blog:<slug>` to link across kinds. */
  relatedGuides?: string[];
  sections: GuideSection[];
  faq?: { q: string; a: string }[];
  sources?: { label: string; url: string }[];
}

export const GUIDE_BASE: Record<GuideKind, string> = { size: "/sizes", blog: "/blog" };
const DIRS: Record<GuideKind, string> = { size: "sizes", blog: "blog" };

/** A guide stays out of the index (noindex and absent from the sitemap) until it clears these bars. */
export const MIN_GUIDE_WORDS: Record<GuideKind, number> = { size: 450, blog: 800 };
export const MIN_GUIDE_SECTIONS = 4;
export const MIN_SIZE_FAQ = 4;

const cache = new Map<GuideKind, Guide[]>();

export function getGuides(kind: GuideKind): Guide[] {
  const cached = cache.get(kind);
  if (cached) return cached;

  const dir = path.join(process.cwd(), "src", "data", "guides", DIRS[kind]);
  const guides = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
          const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as Omit<Guide, "kind" | "slug">;
          return { ...data, kind, slug: name.replace(/\.json$/, "") } satisfies Guide;
        })
    : [];

  guides.sort((a, b) =>
    kind === "blog" ? b.published.localeCompare(a.published) || a.title.localeCompare(b.title) : a.h1.localeCompare(b.h1),
  );
  cache.set(kind, guides);
  return guides;
}

export function getGuide(kind: GuideKind, slug: string): Guide | undefined {
  return getGuides(kind).find((guide) => guide.slug === slug);
}

export function guidePath(guide: Pick<Guide, "kind" | "slug">): string {
  return `${GUIDE_BASE[guide.kind]}/${guide.slug}`;
}

/** Guides about one maker: the ones that lead to it first, then the ones that mention it. */
export function getGuidesForScene(sceneSlug: string, kind?: GuideKind): Guide[] {
  const all = [...getGuides("size"), ...getGuides("blog")].filter((guide) => !kind || guide.kind === kind);
  const primary = all.filter((guide) => guide.scene === sceneSlug);
  const mentions = all.filter((guide) => guide.scene !== sceneSlug && guide.relatedScenes?.includes(sceneSlug));
  return [...primary, ...mentions].filter(isGuideIndexable);
}

/**
 * Resolves `relatedGuides` entries. `size:x` / `blog:x` picks the kind; a bare slug is looked up
 * in the guide's own kind first and then in the other one.
 */
export function getRelatedGuides(guide: Guide): Guide[] {
  const other: GuideKind = guide.kind === "blog" ? "size" : "blog";
  return (guide.relatedGuides ?? [])
    .map((ref) => {
      if (ref.includes(":")) {
        const [kind, slug] = ref.split(":");
        return getGuide(kind === "blog" ? "blog" : "size", slug);
      }
      return getGuide(guide.kind, ref) ?? getGuide(other, ref);
    })
    .filter((related): related is Guide => related !== undefined && related !== guide && isGuideIndexable(related));
}

export function guideText(guide: Guide): string {
  const parts: string[] = [guide.summary];
  for (const section of guide.sections) {
    parts.push(section.heading, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.after ?? []));
    if (section.table) parts.push(...section.table.columns, ...section.table.rows.flat());
  }
  for (const item of guide.faq ?? []) parts.push(item.q, item.a);
  return stripInline(parts.join(" "));
}

export function guideWordCount(guide: Guide): number {
  return guideText(guide).split(/\s+/).filter(Boolean).length;
}

export function guideIssues(guide: Guide): string[] {
  const issues: string[] = [];
  if (!getScene(guide.scene)) issues.push(`unknown maker "${guide.scene}"`);
  if (guide.sections.length < MIN_GUIDE_SECTIONS) issues.push(`needs ${MIN_GUIDE_SECTIONS} sections (has ${guide.sections.length})`);
  const words = guideWordCount(guide);
  if (words < MIN_GUIDE_WORDS[guide.kind]) issues.push(`needs ${MIN_GUIDE_WORDS[guide.kind]} words (has ${words})`);
  if (guide.kind === "size" && (guide.faq?.length ?? 0) < MIN_SIZE_FAQ) {
    issues.push(`needs ${MIN_SIZE_FAQ} FAQ entries (has ${guide.faq?.length ?? 0})`);
  }
  return issues;
}

export function isGuideIndexable(guide: Guide): boolean {
  return guideIssues(guide).length === 0;
}

/** Prints which guides are held back and why. Called once while building. */
export function logGuideIndexability(kind: GuideKind): void {
  for (const guide of getGuides(kind)) {
    const issues = guideIssues(guide);
    if (issues.length > 0) console.info(`[seo] ${GUIDE_BASE[kind]}/${guide.slug} is noindex: ${issues.join("; ")}`);
  }
}

/** Anchor id of a section heading, used by the table of contents. */
export function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
