import "server-only";

import { getCategoryPage } from "./categories";
import { getGuides, guidePath, isGuideIndexable, type Guide, type GuideKind } from "./guides";
import { inlineLinks } from "./inline";
import { getContent, getScenes, isIndexable } from "./scenes";
import { CATEGORIES, categoryPath } from "./site";
import { getStylePages, isStyleIndexable, stylePath } from "./styles";
import { getTools, isToolIndexable, toolPath } from "./tools";

/** Pages that are written by hand as `page.tsx` files and are never held back from the index. */
const STATIC_PAGES = ["/", "/create", "/gallery", "/sizes", "/blog", "/tools", "/about", "/press", "/contact", "/privacy", "/terms"];

/** Every page the site renders, mapped to whether it is indexable. */
export function knownPages(): Map<string, boolean> {
  const pages = new Map<string, boolean>(STATIC_PAGES.map((page) => [page, true]));
  for (const category of CATEGORIES) pages.set(categoryPath(category.id), true);
  for (const scene of getScenes()) pages.set(`/create/${scene.slug}`, isIndexable(scene));
  for (const { file, style } of getStylePages()) pages.set(stylePath(file.scene, style), isStyleIndexable(file, style));
  for (const kind of ["size", "blog"] as const) {
    for (const guide of getGuides(kind)) pages.set(guidePath(guide), isGuideIndexable(guide));
  }
  for (const tool of getTools()) pages.set(toolPath(tool), isToolIndexable(tool));
  return pages;
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) strings(item, out);
  return out;
}

/** The guide a `relatedGuides` entry points at, using the same lookup as `getRelatedGuides`. */
function resolveGuideRef(guide: Guide, ref: string): Guide | undefined {
  const other: GuideKind = guide.kind === "blog" ? "size" : "blog";
  if (ref.includes(":")) {
    const [kind, slug] = ref.split(":");
    return getGuides(kind === "blog" ? "blog" : "size").find((item) => item.slug === slug);
  }
  const find = (kind: GuideKind) => getGuides(kind).find((item) => item.slug === ref);
  return find(guide.kind) ?? find(other);
}

let checked = false;

/**
 * Checks every internal link the content files can produce: `[label](/path)` links inside text, plus the
 * slug lists that pick related guides and makers. A link to a page that does not exist fails the build,
 * because it would ship as a dead link. A link to a page that exists but is noindex is only reported.
 * Links written by hand in `.tsx` files are not covered here.
 * Runs once per process; called from `generateStaticParams`.
 */
export function validateInternalLinks(): void {
  if (checked) return;
  checked = true;

  const pages = knownPages();
  const errors: string[] = [];
  const warnings: string[] = [];

  const checkTarget = (source: string, path: string, label: string) => {
    const indexable = pages.get(path);
    if (indexable === undefined) errors.push(`${source}: ${label} points at ${path}, which is not a page`);
    else if (!indexable) warnings.push(`${source}: ${label} points at ${path}, which is noindex`);
  };

  const checkText = (source: string, text: unknown) => {
    for (const href of inlineLinks(strings(text).join("\n"))) {
      if (href.startsWith("https://")) continue;
      if (!href.startsWith("/")) {
        errors.push(`${source}: link ${href} must start with "/" (internal) or "https://" (external)`);
        continue;
      }
      const pathname = href.split(/[?#]/)[0];
      checkTarget(source, pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname, `link ${href}`);
    }
  };

  for (const kind of ["size", "blog"] as const) {
    for (const guide of getGuides(kind)) {
      const source = `src/data/guides/${kind === "size" ? "sizes" : "blog"}/${guide.slug}.json`;
      checkText(source, [guide.summary, guide.sections, guide.faq]);
      checkTarget(source, `/create/${guide.scene}`, `scene "${guide.scene}"`);
      for (const slug of guide.relatedScenes ?? []) checkTarget(source, `/create/${slug}`, `relatedScenes "${slug}"`);
      for (const ref of guide.relatedGuides ?? []) {
        const target = resolveGuideRef(guide, ref);
        if (!target) errors.push(`${source}: relatedGuides "${ref}" is not a guide`);
        else if (target === guide) errors.push(`${source}: relatedGuides "${ref}" points at the guide itself`);
        else checkTarget(source, guidePath(target), `relatedGuides "${ref}"`);
      }
    }
  }

  for (const tool of getTools()) {
    const source = `src/data/tools/${tool.slug}.json`;
    checkText(source, [tool.summary, tool.sections, tool.faq]);
    for (const preset of tool.presets) {
      checkTarget(source, `/sizes/${preset.guide}`, `preset "${preset.id}" guide`);
      checkTarget(source, `/create/${preset.maker}`, `preset "${preset.id}" maker`);
    }
    for (const slug of tool.featuredMakers) checkTarget(source, `/create/${slug}`, `featuredMakers "${slug}"`);
  }

  for (const { file, style } of getStylePages()) {
    checkText(`src/data/styles/${file.scene}.json (${style.slug})`, [style.intro, style.bestFor, style.designNotes, style.tryThese, style.faq]);
  }

  for (const category of CATEGORIES) {
    const page = getCategoryPage(category.id);
    checkText(`src/data/categories.json (${category.id})`, [page.intro, page.sections, page.faq]);
  }

  for (const scene of getScenes()) {
    const source = `src/data/scenes/${scene.slug}.json`;
    checkText(source, [scene.seo.intro, scene.steps, scene.specs, scene.faq]);
    for (const slug of scene.related) checkTarget(source, `/create/${slug}`, `related "${slug}"`);
    checkText(`src/data/scenes/content-${scene.slug}.json`, getContent(scene.slug));
  }

  for (const warning of warnings) console.warn(`[seo] ${warning}`);
  if (errors.length === 0) return;

  const message = `Broken internal links (${errors.length}):\n${errors.map((error) => `  - ${error}`).join("\n")}`;
  // `next dev` keeps running so an author can fix the file; a production build must not ship dead links.
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.error(`[seo] ${message}`);
}
