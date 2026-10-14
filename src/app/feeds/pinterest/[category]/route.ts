import type { NextRequest } from "next/server";

import { buildFeedXml, feedFileName } from "@/lib/pinterest";
import { CATEGORIES } from "@/lib/site";

/**
 * One RSS 2.0 feed per category, `/feeds/pinterest/<category-slug>.xml`. Connect each feed to one
 * Pinterest board. The feed releases a few new pins per day (see `lib/pinterest.ts`), so the page is
 * regenerated every hour instead of being fixed at build time.
 */
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: feedFileName(category) }));
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/feeds/pinterest/[category]">) {
  const { category: file } = await ctx.params;
  const category = CATEGORIES.find((entry) => feedFileName(entry) === file);
  if (!category) return new Response("Not found", { status: 404 });

  return new Response(buildFeedXml(category), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
