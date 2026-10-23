import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareSlider } from "@/components/compare-slider";
import { FaqList } from "@/components/faq-list";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { RichText } from "@/components/rich-text";
import { SceneCard } from "@/components/scene-card";
import { SceneGenerator } from "@/components/scene-generator";
import { SceneGuide, SceneOverview } from "@/components/scene-sections";
import { getGuidesForScene } from "@/lib/guides";
import { validateInternalLinks } from "@/lib/links";
import { getContent, getExamples, getScene, getScenes, isIndexable, logIndexability, toClientScene } from "@/lib/scenes";
import { faqLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, CATEGORIES, categoryPath, formatDate, SITE_NAME } from "@/lib/site";
import { getStyleFile, getStyleLinks, isStyleIndexable, styleExamples, styleLabel, stylePath } from "@/lib/styles";

export const dynamicParams = false;

export function generateStaticParams() {
  logIndexability();
  // Fails the production build when any content file links to a page that does not exist.
  validateInternalLinks();
  return getScenes().map((scene) => ({ scene: scene.slug }));
}

export async function generateMetadata({ params }: PageProps<"/create/[scene]">): Promise<Metadata> {
  const scene = getScene((await params).scene);
  if (!scene) return {};
  return pageMetadata({
    absoluteTitle: scene.seo.title,
    description: scene.seo.description,
    path: `/create/${scene.slug}`,
    noindex: !isIndexable(scene),
    ownShareImage: true,
  });
}

export default async function ScenePage({ params }: PageProps<"/create/[scene]">) {
  const scene = getScene((await params).scene);
  if (!scene) notFound();

  const examples = getExamples(scene.slug);
  // Wide examples (cards, banners, thumbnails) need bigger tiles to stay readable.
  const landscape = examples.length > 0 && examples.every((e) => e.width > e.height);
  const content = getContent(scene.slug);
  const related = scene.related.map((slug) => getScene(slug)).filter((s) => s !== undefined);
  const url = absoluteUrl(`/create/${scene.slug}`);
  const styleFile = getStyleFile(scene.slug);
  const styleEntries = styleFile?.styles.filter((entry) => isStyleIndexable(styleFile, entry)) ?? [];
  const guides = getGuidesForScene(scene.slug);
  const category = CATEGORIES.find((entry) => entry.id === scene.category);
  // Photo makers show a before / after slider. When the maker has styles, one example per style is enough here;
  // the other examples of a style are on its own page.
  const showcase = examples.some((example) => example.before)
    ? examples.filter((example, index) => !example.style || examples.findIndex((other) => other.style === example.style) === index)
    : [];
  const showcasePortrait = showcase.length > 0 && showcase.every((example) => example.height > example.width);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "All makers", item: absoluteUrl("/create") },
        { "@type": "ListItem", position: 3, name: scene.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${scene.name} by ${SITE_NAME}`,
      url,
      description: scene.seo.description,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
    },
    faqLd(scene.faq),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
          <Link href="/" className="hover:text-ink-900">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/create" className="hover:text-ink-900">
            All makers
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-900">{scene.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_440px]">
          <section>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{scene.badge}</span>
              {category && (
                <span className="text-sm text-ink-500">
                  Part of{" "}
                  <Link href={categoryPath(category.id)} className="font-medium text-brand-700 hover:underline">
                    {category.name}
                  </Link>
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{scene.seo.h1}</h1>
            <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-700">
              {scene.seo.intro.map((paragraph) => (
                <p key={paragraph}>
                  <RichText text={paragraph} />
                </p>
              ))}
            </div>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {scene.steps.map((step, index) => (
                <li key={step.title} className="rounded-xl bg-ink-50 p-4">
                  <span className="text-sm font-semibold text-brand-700">Step {index + 1}</span>
                  <p className="mt-1 font-semibold text-ink-900">{step.title}</p>
                  <p className="mt-1 text-sm text-ink-500">
                    <RichText text={step.description} />
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <aside id="create" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
            <SceneGenerator scene={toClientScene(scene)} styleLinks={getStyleLinks(scene.slug)} />
          </aside>
        </div>

        {examples.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">Made with the {scene.name}</h2>
            {showcase.length > 0 ? (
              <>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
                  Drag the handle on any photo to compare the original with the result.
                  {styleFile ? ` Pick a ${styleFile.noun} to open it with that ${styleFile.noun} already selected.` : " Use the form above to try it with your own photo."}
                </p>
                <ul className={`mt-6 grid gap-4 ${showcasePortrait ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {showcase.map((example) => {
                    const entry = styleFile?.styles.find((item) => item.value === example.style);
                    const label = entry && styleFile ? styleLabel(scene, styleFile, entry) : undefined;
                    const href = entry && styleFile && isStyleIndexable(styleFile, entry) ? stylePath(scene.slug, entry) : "#create";
                    return (
                      <li key={example.url} className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white">
                        <CompareSlider
                          before={example.before ?? example.url}
                          beforeAlt={example.beforeAlt ?? "Original photo before editing"}
                          after={example.url}
                          afterAlt={example.alt}
                          width={example.width}
                          height={example.height}
                          sizes={showcasePortrait ? "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                        />
                        <Link
                          href={href}
                          className="group flex flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-ink-200 px-3 py-2.5 hover:bg-brand-50"
                        >
                          <span className="text-sm font-semibold leading-snug text-ink-950 group-hover:text-brand-700">
                            {label ?? "Try it with your own photo"}
                          </span>
                          <span className="shrink-0 rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-medium text-white group-hover:bg-brand-800">
                            {label ? "Try it" : "Start"} →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className={`mt-6 gap-4 ${landscape ? "columns-1 sm:columns-2 lg:columns-3" : "columns-2 sm:columns-3 lg:columns-4"}`}>
                {examples.map((example) => (
                  <Image
                    key={example.url}
                    src={example.url}
                    alt={example.alt}
                    width={example.width}
                    height={example.height}
                    sizes={landscape ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
                    className="mb-4 w-full rounded-xl border border-ink-200"
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {content && <SceneOverview name={scene.name} content={content} />}

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">{scene.specs.heading}</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-ink-50 text-ink-700">
                <tr>
                  {scene.specs.columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {scene.specs.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, index) => (
                      <td key={index} className={`px-4 py-3 ${index === 0 ? "font-medium text-ink-900" : "text-ink-700"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scene.specs.notes && (
            <ul className="mt-4 space-y-2 text-sm text-ink-500">
              {scene.specs.notes.map((note) => (
                <li key={note}>
                  <RichText text={note} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {content && <SceneGuide name={scene.name} content={content} />}

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Frequently asked questions</h2>
          <FaqList items={scene.faq} />
        </section>

        {styleFile && styleEntries.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">{styleFile.collection}</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
              Each {styleFile.noun} has its own page with examples, ideas for what to write and answers to common
              questions. Open one to start with that {styleFile.noun} already selected.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {styleEntries.map((entry) => {
                const cover = styleExamples(scene.slug, entry)[0];
                return (
                  <li key={entry.slug}>
                    <Link href={stylePath(scene.slug, entry)} className="group block">
                      {cover && (
                        <Image
                          src={cover.url}
                          alt={cover.alt}
                          width={cover.width}
                          height={cover.height}
                          sizes="(min-width: 1024px) 20vw, 50vw"
                          className="w-full rounded-xl border border-ink-200 transition group-hover:border-ink-400"
                        />
                      )}
                      <p className="mt-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">
                        {styleLabel(scene, styleFile, entry)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {guides.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">Guides for the {scene.name}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {guides.slice(0, 3).map((guide) => (
                <GuideCard key={`${guide.kind}-${guide.slug}`} guide={guide} />
              ))}
            </div>
          </section>
        )}

        {content && (
          <p className="mt-10 text-sm text-ink-500">
            Last updated: <time dateTime={content.updated}>{formatDate(content.updated)}</time>
          </p>
        )}

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">More makers</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <SceneCard key={item.slug} scene={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
