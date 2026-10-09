import Link from "next/link";

import type { Crumb } from "@/lib/schema";

/** Visible breadcrumb trail. The last crumb is the current page and is not a link. */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path}>
          {index > 0 && <span className="mx-2">/</span>}
          {index === crumbs.length - 1 ? (
            <span className="text-ink-900">{crumb.name}</span>
          ) : (
            <Link href={crumb.path} className="hover:text-ink-900">
              {crumb.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
