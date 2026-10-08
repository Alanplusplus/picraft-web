export const SITE_NAME = "PiCraft";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://picraft.ai").replace(/\/$/, "");
export const SUPPORT_EMAIL = "support@picraft.ai";
export const TAGLINE = "Finished visuals, not prompts.";
/** Year the site launched, shown in the footer. A fixed year avoids a value frozen at build time. */
export const COPYRIGHT_YEAR = 2026;

/** Shown on the legal pages and used as `dateModified`. Update it whenever the wording changes. */
export const LEGAL_UPDATED = "October 8, 2026";
export const LEGAL_UPDATED_ISO = "2026-10-08";

/** Generated files are deleted after this many days (enforced by `backend/scripts/set_oss_lifecycle.py`). */
export const FILE_RETENTION_DAYS = 90;

/** Optional operator details. Set them in the environment and they appear in the legal pages. */
export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "";
export const LEGAL_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "";
export const GOVERNING_LAW = process.env.NEXT_PUBLIC_GOVERNING_LAW ?? "";

/** Optional integrations. Each one is switched on only when its environment variable is set. */
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
export const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";
export const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "";

export type CategoryId = "photos" | "print" | "creators" | "merch";

export const CATEGORIES: { id: CategoryId; name: string; description: string }[] = [
  {
    id: "photos",
    name: "Photos to spec",
    description: "Product shots and listing photos that follow marketplace and MLS rules.",
  },
  {
    id: "print",
    name: "Invitations & print",
    description: "Invitations, menus, flyers and business cards with your details typeset and print files ready.",
  },
  {
    id: "creators",
    name: "Creators & social",
    description: "Thumbnails, banners and covers at the exact size each platform expects.",
  },
  {
    id: "merch",
    name: "Stickers & merch",
    description: "Transparent, print-ready artwork for stickers and print-on-demand shirts.",
  },
];

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
