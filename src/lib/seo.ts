import type { Metadata } from "next";

import { SITE_NAME, TAGLINE } from "./site";

export const DEFAULT_TITLE = `${SITE_NAME} – Print-Ready Invitations, Cards & Thumbnails`;
export const DEFAULT_DESCRIPTION =
  "Fill in a short form and download finished, correctly sized visuals: invitations, menus, business cards, YouTube thumbnails, stickers and more.";

/**
 * Fallback share image for pages without an `opengraph-image` file of their own.
 * A page-level `openGraph` drops the image inherited from the root segment, so it is set explicitly.
 * Pages whose segment has an `opengraph-image` file (home, makers) use that one instead.
 */
const DEFAULT_SHARE_IMAGE = [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: ${TAGLINE}` }];

interface PageMeta {
  /** Page title. The site name is appended by the title template. */
  title?: string;
  /** Use instead of `title` when the page title must not get the site-name suffix. */
  absoluteTitle?: string;
  description: string;
  /** Path of the page, used for the canonical URL and `og:url`. */
  path: string;
  noindex?: boolean;
}

/**
 * Builds the metadata for a page, including canonical, Open Graph and Twitter fields.
 * A page-level `openGraph` replaces the layout's object instead of merging with it,
 * so every page goes through this helper to keep `siteName`, `type` and `locale`.
 * The share image comes from the `opengraph-image` file of the nearest route segment.
 */
export function pageMetadata({ title, absoluteTitle, description, path, noindex }: PageMeta): Metadata {
  const socialTitle = absoluteTitle ?? (title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE);
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: socialTitle,
      description,
      url: path,
      images: DEFAULT_SHARE_IMAGE,
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: DEFAULT_SHARE_IMAGE },
  };
}
