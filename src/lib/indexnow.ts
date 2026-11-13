import "server-only";

import { absoluteUrl, SITE_URL } from "./site";

/**
 * IndexNow tells Bing and the other participating search engines which URLs are new or changed, so they
 * recrawl them in hours instead of weeks. ChatGPT search and Copilot lean on Bing's index, which makes this
 * the cheapest way to get a refreshed page into AI answers. Google does not take part.
 *
 * The key is public by design: the search engine proves ownership by fetching it from `/<key>.txt`
 * (the file in `public/`, whose content is the key itself). If you rotate the key, rename that file too.
 */
export const INDEXNOW_KEY = "8cc5f5c3efc18d690b9a9942f334c193";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function indexNowKeyLocation(): string {
  return absoluteUrl(`/${INDEXNOW_KEY}.txt`);
}

/** One request takes up to 10,000 URLs; the site has about a hundred and fifty. */
export async function submitToIndexNow(urls: string[]): Promise<{ status: number; submitted: number }> {
  if (urls.length === 0) return { status: 200, submitted: 0 };
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: indexNowKeyLocation(),
      urlList: urls.slice(0, 10000),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // 200 = accepted, 202 = accepted and the key is still being checked. Anything else is an error.
  return { status: response.status, submitted: urls.length };
}
