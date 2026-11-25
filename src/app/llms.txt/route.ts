import { buildLlmsTxt } from "@/lib/llms-txt";

/** GET handlers are dynamic by default; a `revalidate` value makes this one a static file built with the site. */
export const revalidate = 3600;

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
