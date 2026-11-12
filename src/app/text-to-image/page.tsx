import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GeneratorPage } from "@/components/generator-page";
import { getGenerator, isGeneratorIndexable, logGeneratorIndexability } from "@/lib/generators";
import { validateInternalLinks } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

const SLUG = "text-to-image";

export function generateMetadata(): Metadata {
  const generator = getGenerator(SLUG);
  if (!generator) return {};
  return pageMetadata({
    absoluteTitle: generator.seo.title,
    description: generator.seo.description,
    path: `/${SLUG}`,
    noindex: !isGeneratorIndexable(generator),
    ownShareImage: true,
  });
}

export default function Page() {
  logGeneratorIndexability(SLUG);
  validateInternalLinks();
  const generator = getGenerator(SLUG);
  if (!generator) notFound();
  return <GeneratorPage generator={generator} />;
}
