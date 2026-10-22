import Image from "next/image";
import Link from "next/link";

import { getScenesByCategory } from "@/lib/scenes";
import { CATEGORIES, categoryPath, COPYRIGHT_YEAR, SITE_NAME, SOCIAL_PROFILES, TAGLINE } from "@/lib/site";

const RESOURCES = [
  { href: "/sizes", label: "Size guides" },
  { href: "/tools", label: "Free tools" },
  { href: "/tools/image-size-checker", label: "Image size checker" },
  { href: "/blog", label: "Blog" },
  { href: "/gallery", label: "Design gallery" },
  { href: "/create", label: "All makers" },
];

function ExternalIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 opacity-70"
    >
      <path d="M4.5 2.5h5v5M9.5 2.5 3 9" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-3 lg:grid-cols-7">
        <div>
          <div className="flex items-center gap-1.5">
            <Image src="/images/logo-64.png" alt="" width={24} height={24} className="h-6 w-6" />
            <Image src="/images/wordmark.png" alt={SITE_NAME} width={100} height={22} className="h-[18px] w-auto" />
          </div>
          <p className="mt-3 text-sm text-ink-500">{TAGLINE}</p>
          {SOCIAL_PROFILES.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="PiCraft elsewhere on the web">
              {SOCIAL_PROFILES.map((profile) => (
                <li key={profile.name}>
                  <a
                    href={profile.url}
                    target="_blank"
                    rel="me noopener"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm transition hover:border-brand-500 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900"
                  >
                    {profile.name}
                    <ExternalIcon />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <p className="text-sm font-semibold text-ink-900">
              <Link href={categoryPath(category.id)} className="hover:text-brand-700">
                {category.name}
              </Link>
            </p>
            <ul className="mt-3 space-y-2">
              {getScenesByCategory(category.id).map((scene) => (
                <li key={scene.slug}>
                  <Link href={`/create/${scene.slug}`} className="text-sm text-ink-500 hover:text-ink-900">
                    {scene.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-sm font-semibold text-ink-900">Resources</p>
          <ul className="mt-3 space-y-2">
            {RESOURCES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ink-500 hover:text-ink-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-500 sm:px-6">
          <p>© {COPYRIGHT_YEAR} {SITE_NAME}</p>
          <nav aria-label="Company" className="flex flex-wrap gap-5">
            <Link href="/about" className="hover:text-ink-900">
              About
            </Link>
            <Link href="/press" className="hover:text-ink-900">
              Press kit
            </Link>
            <Link href="/contact" className="hover:text-ink-900">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-ink-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-900">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
