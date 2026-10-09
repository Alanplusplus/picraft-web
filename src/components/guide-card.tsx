import Link from "next/link";

import { guidePath, type Guide } from "@/lib/guides";
import { formatDate } from "@/lib/site";

/** A text card that links to a size guide or a blog post. */
export function GuideCard({ guide, showDate = false }: { guide: Guide; showDate?: boolean }) {
  return (
    <Link
      href={guidePath(guide)}
      className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-md"
    >
      <span className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
        {guide.kind === "size" ? "Size guide" : (guide.topic ?? "Guide")}
      </span>
      <h3 className="mt-3 font-semibold text-ink-950 group-hover:text-brand-700">{guide.h1}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{guide.description}</p>
      {showDate && <p className="mt-3 text-xs text-ink-500">Updated {formatDate(guide.updated)}</p>}
    </Link>
  );
}
