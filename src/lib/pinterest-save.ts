import { SITE_URL } from "./site";

/** What a visitor's saved pin says and where it leads. */
export interface PinShare {
  sceneName: string;
  /** One sentence about what the maker does, used as the second sentence of the description. */
  summary: string;
  /** Page the pin links to: the page of the chosen look when it has one, otherwise the maker. */
  path: string;
  /** Name of the chosen look, style or theme, for makers that have them. */
  styleLabel?: string;
}

/** Pinterest cuts a description at 500 characters. */
const MAX_DESCRIPTION = 500;

export function pinDescription({ sceneName, summary, styleLabel }: PinShare): string {
  const made = styleLabel ? `${styleLabel}, made with the PiCraft ${sceneName}.` : `Made with the PiCraft ${sceneName}.`;
  const text = `${made} ${summary}`.replace(/\s+/g, " ").trim();
  return text.length <= MAX_DESCRIPTION ? text : `${text.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
}

/** The pin's destination. The campaign tells these visits apart from the pins PiCraft publishes itself. */
export function pinLink({ path }: PinShare): string {
  const url = new URL(`${SITE_URL}${path}`);
  url.searchParams.set("utm_source", "pinterest");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "user_save");
  return url.toString();
}

/**
 * Pinterest's "create a pin" page, filled in with the image, the description and the link.
 * The visitor can still change the board, the title and the text there before saving.
 */
export function pinterestSaveUrl(imageUrl: string, share: PinShare): string {
  const query = [
    ["url", pinLink(share)],
    ["media", imageUrl],
    ["description", pinDescription(share)],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `https://www.pinterest.com/pin/create/button/?${query}`;
}
