import Image from "next/image";
import Link from "next/link";

import { getScenesByCategory } from "@/lib/scenes";
import { CATEGORIES, COPYRIGHT_YEAR, SITE_NAME, TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-5">
        <div className="md:col-span-1">
          <div className="flex items-center gap-1.5">
            <Image src="/images/logo-64.png" alt="" width={24} height={24} className="h-6 w-6" />
            <Image src="/images/wordmark.png" alt={SITE_NAME} width={100} height={22} className="h-[18px] w-auto" />
          </div>
          <p className="mt-3 text-sm text-ink-500">{TAGLINE}</p>
        </div>
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <p className="text-sm font-semibold text-ink-900">{category.name}</p>
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
      </div>
      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-500 sm:px-6">
          <p>© {COPYRIGHT_YEAR} {SITE_NAME}</p>
          <nav aria-label="Company" className="flex flex-wrap gap-5">
            <Link href="/about" className="hover:text-ink-900">
              About
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
