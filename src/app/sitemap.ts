import type { MetadataRoute } from "next";

import { getContent, getScenes, isIndexable } from "@/lib/scenes";
import { absoluteUrl, LEGAL_UPDATED_ISO } from "@/lib/site";

/**
 * `lastModified` is only set where the site knows a real date: the "Last updated" date of a maker's
 * guide, or the date of the legal text. Search engines ignore lastmod values that are always "now".
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const scenes = getScenes().filter(isIndexable);
  const sceneDates = scenes.map((scene) => getContent(scene.slug)?.updated).filter((date) => date !== undefined);
  const latest = sceneDates.sort().at(-1);

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/create"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    ...scenes.map((scene) => ({
      url: absoluteUrl(`/create/${scene.slug}`),
      lastModified: getContent(scene.slug)?.updated,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.2 },
  ];
}
