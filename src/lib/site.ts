export const SITE_NAME = "PiCraft";
/**
 * Public origin of the site. It must be the host that actually serves pages (www.picraft.ai):
 * the bare picraft.ai answers with a 301 to www, and a canonical, sitemap or og:url pointing at a
 * redirecting URL makes Google report "Page with redirect" and ignore the canonical.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.picraft.ai").replace(/\/$/, "");
export const SUPPORT_EMAIL = "support@picraft.ai";
export const TAGLINE = "Finished visuals, not prompts.";
/** Year the site launched, shown in the footer. A fixed year avoids a value frozen at build time. */
export const COPYRIGHT_YEAR = 2026;

/** Shown on the legal pages and used as `dateModified`. Update it whenever the wording changes. */
export const LEGAL_UPDATED = "October 18, 2026";
export const LEGAL_UPDATED_ISO = "2026-10-18";

/** Generated files are deleted after this many days (enforced by `backend/scripts/set_oss_lifecycle.py`). */
export const FILE_RETENTION_DAYS = 90;

/** Optional operator details. Set them in the environment and they appear in the legal pages. */
export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "";
export const LEGAL_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "";
export const GOVERNING_LAW = process.env.NEXT_PUBLIC_GOVERNING_LAW ?? "";

/** Optional integrations. Each one is switched on only when its environment variable is set. */
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
export const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
/** Google Analytics 4 measurement ID. Set the variable to an empty string to switch Google Analytics off. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-DZJL4E7P9L";
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";
export const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "";
/** Content of the Pinterest `p:domain_verify` meta tag, used to claim the website on Pinterest. */
export const PINTEREST_VERIFICATION = process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION ?? "";

/** Public social profiles. A profile is linked in the footer and listed in the structured data once its URL is set. */
export const SOCIAL_PROFILES: { name: string; url: string }[] = [
  { name: "Pinterest", url: process.env.NEXT_PUBLIC_SOCIAL_PINTEREST ?? "" },
].filter((profile) => profile.url);

export type CategoryId = "trends" | "photos" | "print" | "creators" | "merch";

export interface Category {
  id: CategoryId;
  /** URL segment of the category page, `/categories/<slug>`. */
  slug: string;
  name: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "trends",
    slug: "photo-trends",
    name: "Photo trends",
    description: "Turn one photo into a trending look, sized for full-screen vertical, Pinterest and feed posts.",
  },
  {
    id: "photos",
    slug: "product-and-listing-photos",
    name: "Photos to spec",
    description: "Product shots and listing photos that follow marketplace and MLS rules.",
  },
  {
    id: "print",
    slug: "invitations-and-print",
    name: "Invitations & print",
    description: "Invitations, menus, flyers and business cards with your details typeset and print files ready.",
  },
  {
    id: "creators",
    slug: "creator-graphics",
    name: "Creators & social",
    description: "Thumbnails, banners and covers at the exact size each platform expects.",
  },
  {
    id: "merch",
    slug: "stickers-and-merch",
    name: "Stickers & merch",
    description: "Transparent, print-ready artwork for stickers and print-on-demand shirts.",
  },
];

export function categoryPath(id: CategoryId): string {
  const category = CATEGORIES.find((c) => c.id === id);
  return category ? `/categories/${category.slug}` : "/create";
}

/** Date format used for "Updated" lines on guides and posts. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
