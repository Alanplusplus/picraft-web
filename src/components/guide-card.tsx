import Link from "next/link";

import { guidePath, type Guide } from "@/lib/guides";
import { formatDate } from "@/lib/site";

/**
 * A text card that links to a size guide or a blog post. The title says what the guide is, so the summary under it is
 * left out unless the page is a list of guides (`showSummary`), where it is cut to two lines.
 */
export function GuideCard({
  guide,
  showDate = false,
  showSummary = false,
}: {
  guide: Guide;
  showDate?: boolean;
  showSummary?: boolean;
}) {
  return (
    <Link
      href={guidePath(guide)}
      className="group card-link flex h-full flex-col p-5"
    >
      <span className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
        {guide.kind === "size" ? "Size guide" : (guide.topic ?? "Guide")}
      </span>
      <h3 className="mt-3 font-semibold text-ink-950 group-hover:text-brand-700">{guide.h1}</h3>
      {showSummary && <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">{guide.description}</p>}
      {showDate && <p className="mt-3 text-xs text-ink-500">Updated {formatDate(guide.updated)}</p>}
    </Link>
  );
}
