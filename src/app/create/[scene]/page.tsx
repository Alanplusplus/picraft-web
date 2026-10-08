import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { SceneCard } from "@/components/scene-card";
import { SceneGenerator } from "@/components/scene-generator";
import { SceneGuide, SceneOverview } from "@/components/scene-sections";
import { getContent, getExamples, getScene, getScenes, isIndexable, logIndexability, toClientScene } from "@/lib/scenes";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const dynamicParams = false;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function generateStaticParams() {
  logIndexability();
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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: scene.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
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
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{scene.badge}</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{scene.seo.h1}</h1>
            <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-700">
              {scene.seo.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {scene.steps.map((step, index) => (
                <li key={step.title} className="rounded-xl bg-ink-50 p-4">
                  <span className="text-sm font-semibold text-brand-700">Step {index + 1}</span>
                  <p className="mt-1 font-semibold text-ink-900">{step.title}</p>
                  <p className="mt-1 text-sm text-ink-500">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <SceneGenerator scene={toClientScene(scene)} />
          </aside>
        </div>

        {examples.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">Made with the {scene.name}</h2>
            {examples.some((e) => e.before) ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {examples.map((example) => (
                  <div key={example.url} className="overflow-hidden rounded-xl border border-ink-200">
                    {example.before && (
                      <div className="grid grid-cols-2">
                        <div className="relative border-r border-ink-200">
                          <span className="absolute left-2 top-2 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">Before</span>
                          <Image src={example.before} alt={example.beforeAlt ?? "Original photo before editing"} width={example.width} height={example.height} sizes="(min-width: 1024px) 16vw, 25vw" className="h-full w-full object-cover" />
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-2 rounded bg-brand-800/90 px-1.5 py-0.5 text-[10px] font-medium text-white">After</span>
                          <Image src={example.url} alt={example.alt} width={example.width} height={example.height} sizes="(min-width: 1024px) 16vw, 25vw" className="h-full w-full object-cover" />
                        </div>
                      </div>
                    )}
                    {!example.before && (
                      <Image src={example.url} alt={example.alt} width={example.width} height={example.height} sizes="(min-width: 1024px) 33vw, 50vw" className="w-full" />
                    )}
                  </div>
                ))}
              </div>
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
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </section>

        {content && <SceneGuide name={scene.name} content={content} />}

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
            {scene.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-900">
                  {item.q}
                  <span className="text-ink-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

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
