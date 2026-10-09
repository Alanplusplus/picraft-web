import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { getGuides, guidePath, isGuideIndexable } from "@/lib/guides";
import { getScene } from "@/lib/scenes";
import { breadcrumbLd, collectionLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES } from "@/lib/site";

const TITLE = "Size Guides: Dimensions, Bleed and File Specs for Every Design";
const DESCRIPTION =
  "Exact sizes and file requirements for YouTube thumbnails, business cards, invitations, book covers, stickers, product photos and more, with sources.";

export const metadata = pageMetadata({ absoluteTitle: TITLE, description: DESCRIPTION, path: "/sizes" });

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Size guides", path: "/sizes" },
];

export default function SizesPage() {
  const guides = getGuides("size").filter(isGuideIndexable);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(CRUMBS),
          collectionLd({
            name: "PiCraft size guides",
            description: DESCRIPTION,
            path: "/sizes",
            items: guides.map((guide) => ({ name: guide.h1, path: guidePath(guide) })),
          }),
        ]}
      />
      <Breadcrumb crumbs={CRUMBS} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Size guides for every design</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-ink-700">
        <p>
          Most design problems are size problems: a thumbnail that YouTube rejects, a business card trimmed too close, a
          product image that is not white enough. Each guide below gives the dimensions, the file format and the
          rules for one kind of file, in plain tables, with links to the official page where one exists.
        </p>
        <p>
          Every guide ends with the PiCraft maker that exports the files at that size, so you can go from the spec to a
          finished file in a minute. New to print terms? Start with{" "}
          <Link href="/blog/what-is-bleed-in-printing" className="font-medium text-brand-700 underline underline-offset-2">
            what bleed is and how to use it
          </Link>
          .
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {CATEGORIES.map((category) => {
          const inCategory = guides.filter((guide) => getScene(guide.scene)?.category === category.id);
          if (inCategory.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className="text-xl font-bold text-ink-950">{category.name}</h2>
              <p className="mt-1 text-sm text-ink-500">{category.description}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((guide) => (
                  <GuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
