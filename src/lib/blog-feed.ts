import "server-only";

import { getGuides, guidePath, isGuideIndexable } from "./guides";
import { escapeXml } from "./pinterest";
import { absoluteUrl } from "./site";

export const BLOG_FEED_PATH = "/blog/feed.xml";
const FEED_MAX_POSTS = 30;

/** RSS 2.0 document with the newest indexable blog posts. The feed is fixed at build time, like the posts. */
export function buildBlogFeedXml(): string {
  const posts = getGuides("blog")
    .filter(isGuideIndexable)
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, FEED_MAX_POSTS);
  const lastUpdated = posts.map((post) => post.updated).sort().pop() ?? posts[0]?.published;

  const items = posts
    .map((post) => {
      const link = absoluteUrl(guidePath(post));
      return `    <item>
      <title>${escapeXml(post.h1)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(`${post.published}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PiCraft blog</title>
    <link>${escapeXml(absoluteUrl("/blog"))}</link>
    <description>Practical guides on print files, platform rules and the checks that save you a reprint.</description>
    <language>en-us</language>${lastUpdated ? `\n    <lastBuildDate>${new Date(`${lastUpdated}T00:00:00Z`).toUTCString()}</lastBuildDate>` : ""}
    <atom:link href="${escapeXml(absoluteUrl(BLOG_FEED_PATH))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
