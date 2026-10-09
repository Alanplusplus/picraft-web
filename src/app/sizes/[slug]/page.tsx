import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideArticle } from "@/components/guide-article";
import { JsonLd } from "@/components/json-ld";
import { getGuide, getGuides, guidePath, isGuideIndexable, logGuideIndexability } from "@/lib/guides";
import { articleLd, breadcrumbLd, faqLd, type Crumb } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  logGuideIndexability("size");
  return getGuides("size").map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sizes/[slug]">): Promise<Metadata> {
  const guide = getGuide("size", (await params).slug);
  if (!guide) return {};
  return pageMetadata({
    absoluteTitle: guide.title,
    description: guide.description,
    path: guidePath(guide),
    noindex: !isGuideIndexable(guide),
  });
}

export default async function SizeGuidePage({ params }: PageProps<"/sizes/[slug]">) {
  const guide = getGuide("size", (await params).slug);
  if (!guide) notFound();

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Size guides", path: "/sizes" },
    { name: guide.h1, path: guidePath(guide) },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          articleLd({
            headline: guide.h1,
            description: guide.description,
            path: guidePath(guide),
            published: guide.published,
            updated: guide.updated,
            image: `/images/scenes/${guide.scene}.webp`,
          }),
          ...(guide.faq && guide.faq.length > 0 ? [faqLd(guide.faq)] : []),
        ]}
      />
      <GuideArticle guide={guide} crumbs={crumbs} />
    </>
  );
}
