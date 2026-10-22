import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getGuide, type GuideSection } from "./guides";
import { stripInline } from "./inline";
import { getScene } from "./scenes";
import type { SizePreset } from "./size-presets";

/**
 * A free tool that runs in the browser. Its page text and presets live as JSON under
 * `src/data/tools/<slug>.json`; the file name is the slug and the page is `/tools/<slug>`.
 */
export interface ToolFile {
  slug: string;
  title: string;
  h1: string;
  description: string;
  summary: string;
  published: string;
  updated: string;
  /** Makers shown as cards under the tool. */
  featuredMakers: string[];
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  presets: SizePreset[];
}

export const TOOLS_BASE = "/tools";

const cache: { tools?: ToolFile[] } = {};

export function getTools(): ToolFile[] {
  if (cache.tools) return cache.tools;
  const dir = path.join(process.cwd(), "src", "data", "tools");
  cache.tools = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
          const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as Omit<ToolFile, "slug">;
          return { ...data, slug: name.replace(/\.json$/, "") } satisfies ToolFile;
        })
        .sort((a, b) => a.h1.localeCompare(b.h1))
    : [];
  return cache.tools;
}

export function getTool(slug: string): ToolFile | undefined {
  return getTools().find((tool) => tool.slug === slug);
}

export function toolPath(tool: Pick<ToolFile, "slug">): string {
  return `${TOOLS_BASE}/${tool.slug}`;
}

/** A tool page stays out of the index (noindex and absent from the sitemap) until it clears these bars. */
export const MIN_TOOL_WORDS = 450;
export const MIN_TOOL_FAQ = 4;
export const MIN_TOOL_PRESETS = 6;

/** Plain text of the tool page, for the word count and for the links to be validated. */
export function toolText(tool: ToolFile): string {
  const parts: string[] = [tool.summary];
  for (const section of tool.sections) {
    parts.push(section.heading, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.after ?? []));
  }
  for (const item of tool.faq) parts.push(item.q, item.a);
  return stripInline(parts.join(" "));
}

export function toolWordCount(tool: ToolFile): number {
  return toolText(tool).split(/\s+/).filter(Boolean).length;
}

export function toolIssues(tool: ToolFile): string[] {
  const issues: string[] = [];
  const words = toolWordCount(tool);
  if (words < MIN_TOOL_WORDS) issues.push(`needs ${MIN_TOOL_WORDS} words (has ${words})`);
  if (tool.faq.length < MIN_TOOL_FAQ) issues.push(`needs ${MIN_TOOL_FAQ} FAQ entries (has ${tool.faq.length})`);
  if (tool.presets.length < MIN_TOOL_PRESETS) issues.push(`needs ${MIN_TOOL_PRESETS} presets (has ${tool.presets.length})`);
  for (const preset of tool.presets) {
    if (!getGuide("size", preset.guide)) issues.push(`preset "${preset.id}" points at unknown guide "${preset.guide}"`);
    if (!getScene(preset.maker)) issues.push(`preset "${preset.id}" points at unknown maker "${preset.maker}"`);
  }
  for (const slug of tool.featuredMakers) {
    if (!getScene(slug)) issues.push(`unknown featured maker "${slug}"`);
  }
  return issues;
}

export function isToolIndexable(tool: ToolFile): boolean {
  return toolIssues(tool).length === 0;
}

/** Prints which tools are held back and why. Called once while building. */
export function logToolIndexability(): void {
  for (const tool of getTools()) {
    const issues = toolIssues(tool);
    if (issues.length > 0) console.info(`[seo] ${toolPath(tool)} is noindex: ${issues.join("; ")}`);
  }
}

/** Official pages behind the presets, grouped by the size guide that cites them. */
export function toolSources(tool: ToolFile): { guideSlug: string; guideTitle: string; sources: { label: string; url: string }[] }[] {
  const seen = new Set<string>();
  const groups: { guideSlug: string; guideTitle: string; sources: { label: string; url: string }[] }[] = [];
  for (const preset of tool.presets) {
    if (seen.has(preset.guide)) continue;
    seen.add(preset.guide);
    const guide = getGuide("size", preset.guide);
    if (guide?.sources?.length) groups.push({ guideSlug: guide.slug, guideTitle: guide.h1, sources: guide.sources });
  }
  return groups;
}
