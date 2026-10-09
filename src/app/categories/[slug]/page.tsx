import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { FaqList } from "@/components/faq-list";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { RichText } from "@/components/rich-text";
import { SceneCard } from "@/components/scene-card";
import { getCategoryPage } from "@/lib/categories";
import { getGuidesForScene } from "@/lib/guides";
import { getScenesByCategory } from "@/lib/scenes";
import { breadcrumbLd, collectionLd, faqLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES, categoryPath } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

function findCategory(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = findCategory((await params).slug);
  if (!category) return {};
  const page = getCategoryPage(category.id);
  return pageMetadata({
    absoluteTitle: page.seo.title,
    description: page.seo.description,
    path: categoryPath(category.id),
  });
}

const H2 = "text-2xl font-bold tracking-tight text-ink-950";

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const category = findCategory((await params).slug);
  if (!category) notFound();

  const page = getCategoryPage(category.id);
  const path = categoryPath(category.id);
  const scenes = getScenesByCategory(category.id);
  const guides = scenes
    .flatMap((scene) => getGuidesForScene(scene.slug))
    .filter((guide, index, all) => all.findIndex((other) => other.kind === guide.kind && other.slug === guide.slug) === index);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "All makers", path: "/create" },
    { name: category.name, path },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          collectionLd({
            name: page.seo.h1,
            description: page.seo.description,
            path,
            items: scenes.map((scene) => ({ name: scene.name, path: `/create/${scene.slug}` })),
          }),
          faqLd(page.faq),
        ]}
      />
      <Breadcrumb crumbs={crumbs} />

      <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{page.seo.h1}</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-ink-700">
        {page.intro.map((paragraph) => (
          <p key={paragraph}>
            <RichText text={paragraph} />
          </p>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {scenes.map((scene) => (
          <SceneCard key={scene.slug} scene={scene} />
        ))}
      </div>

      {page.sections.map((section) => (
        <section key={section.heading} className="mt-16 max-w-3xl">
          <h2 className={H2}>{section.heading}</h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-700">
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
            {section.items && (
              <ul className="list-disc space-y-2 pl-5">
                {section.items.map((item) => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      {guides.length > 0 && (
        <section className="mt-16">
          <h2 className={H2}>Guides for these makers</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.slice(0, 6).map((guide) => (
              <GuideCard key={`${guide.kind}-${guide.slug}`} guide={guide} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>Questions</h2>
        <FaqList items={page.faq} />
      </section>

      <nav aria-label="Other categories" className="mt-16">
        <h2 className="text-lg font-semibold text-ink-950">More categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.filter((other) => other.id !== category.id).map((other) => (
            <Link
              key={other.id}
              href={categoryPath(other.id)}
              className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-800 hover:border-ink-500"
            >
              {other.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
