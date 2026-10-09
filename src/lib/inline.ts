/**
 * Guides, posts and style pages are stored as JSON, so links inside a sentence use the small
 * `[label](href)` form. Internal links start with "/", external ones with "https://".
 */
export type InlinePart = string | { label: string; href: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push({ label: match[1], href: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** The text without link markup, for structured data and word counts. */
export function stripInline(text: string): string {
  return text.replace(LINK, "$1");
}

/** Internal paths a piece of text links to, used to check that no link points at a missing page. */
export function inlineLinks(text: string): string[] {
  return [...text.matchAll(LINK)].map((match) => match[2]);
}
