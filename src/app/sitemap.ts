import type { MetadataRoute } from "next";

import { getCategoryPage } from "@/lib/categories";
import { getGuides, guidePath, isGuideIndexable } from "@/lib/guides";
import { getContent, getExamples, getScenes, isIndexable } from "@/lib/scenes";
import { absoluteUrl, CATEGORIES, categoryPath, LEGAL_UPDATED_ISO } from "@/lib/site";
import { getStylePages, isStyleIndexable, styleExamples, stylePath } from "@/lib/styles";

type Entry = MetadataRoute.Sitemap[number];

const newest = (dates: (string | undefined)[]) => dates.filter((date) => date !== undefined).sort().at(-1);

/**
 * `lastModified` is only set where the site knows a real date: the "Last updated" date of a maker's
 * guide, a guide's own update date, or the date of the legal text. Search engines ignore lastmod
 * values that are always "now". Pages that are held back from the index (noindex) are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const scenes = getScenes().filter(isIndexable);
  const sizeGuides = getGuides("size").filter(isGuideIndexable);
  const posts = getGuides("blog").filter(isGuideIndexable);
  const stylePages = getStylePages().filter(({ file, style }) => isStyleIndexable(file, style));

  const latestScene = newest(scenes.map((scene) => getContent(scene.slug)?.updated));
  const latestGuide = newest([...sizeGuides, ...posts].map((guide) => guide.updated));
  const latest = newest([latestScene, latestGuide]);

  const exampleImages = (slug: string) => getExamples(slug).map((example) => absoluteUrl(example.url));

  const entries: Entry[] = [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/create"), lastModified: latestScene, changeFrequency: "weekly", priority: 0.8 },
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(categoryPath(category.id)),
      lastModified: getCategoryPage(category.id).updated,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...scenes.map((scene) => ({
      url: absoluteUrl(`/create/${scene.slug}`),
      lastModified: getContent(scene.slug)?.updated,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      images: exampleImages(scene.slug),
    })),
    ...stylePages.map(({ file, style }) => ({
      url: absoluteUrl(stylePath(file.scene, style)),
      lastModified: file.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: styleExamples(file.scene, style).map((example) => absoluteUrl(example.url)),
    })),
    {
      url: absoluteUrl("/gallery"),
      lastModified: latestScene,
      changeFrequency: "weekly",
      priority: 0.6,
      images: scenes.flatMap((scene) => exampleImages(scene.slug).slice(0, 10)),
    },
    { url: absoluteUrl("/sizes"), lastModified: latestGuide, changeFrequency: "weekly", priority: 0.7 },
    ...sizeGuides.map((guide) => ({
      url: absoluteUrl(guidePath(guide)),
      lastModified: guide.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/blog"), lastModified: newest(posts.map((post) => post.updated)), changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({
      url: absoluteUrl(guidePath(post)),
      lastModified: post.updated,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.2 },
  ];

  return entries;
}
