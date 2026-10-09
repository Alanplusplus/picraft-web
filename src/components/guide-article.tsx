import Image from "next/image";
import Link from "next/link";

import { getScene } from "@/lib/scenes";
import { getRelatedGuides, GUIDE_BASE, sectionId, type Guide } from "@/lib/guides";
import type { Crumb } from "@/lib/schema";
import { formatDate, SITE_NAME } from "@/lib/site";

import { Breadcrumb } from "./breadcrumb";
import { FaqList } from "./faq-list";
import { GuideCard } from "./guide-card";
import { RichText } from "./rich-text";
import { SceneCard } from "./scene-card";

const H2 = "text-2xl font-bold tracking-tight text-ink-950";

function MakerCta({ sceneSlug, lead }: { sceneSlug: string; lead: string }) {
  const scene = getScene(sceneSlug);
  if (!scene) return null;
  return (
    <Link
      href={`/create/${scene.slug}`}
      className="group mt-8 flex items-center gap-4 rounded-2xl border border-ink-200 bg-brand-50 p-4 transition hover:border-brand-500 sm:gap-6 sm:p-5"
    >
      <Image
        src={`/images/scenes/${scene.slug}.webp`}
        alt={scene.name}
        width={160}
        height={120}
        className="h-20 w-28 shrink-0 rounded-lg object-cover sm:h-24 sm:w-32"
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{lead}</p>
        <p className="mt-1 font-semibold text-ink-950 group-hover:text-brand-700">{scene.name}</p>
        <p className="mt-1 text-sm text-ink-700">{scene.summary}</p>
      </div>
    </Link>
  );
}

/** The page body shared by size guides and blog posts. */
export function GuideArticle({ guide, crumbs }: { guide: Guide; crumbs: Crumb[] }) {
  const related = getRelatedGuides(guide);
  const sceneSlugs = [guide.scene, ...(guide.relatedScenes ?? [])].filter((slug, i, all) => all.indexOf(slug) === i);
  const scenes = sceneSlugs.map((slug) => getScene(slug)).filter((scene) => scene !== undefined);
  const hasToc = guide.sections.length >= 4;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Breadcrumb crumbs={crumbs} />

      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          {guide.kind === "size" ? "Size guide" : (guide.topic ?? "Guide")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{guide.h1}</h1>
        <p className="mt-3 text-sm text-ink-500">
          {guide.kind === "blog" ? `By the ${SITE_NAME} team · ` : ""}
          Updated <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
        </p>
      </header>

      <div className="mt-6 rounded-2xl border-l-4 border-brand-500 bg-ink-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {guide.kind === "size" ? "Short answer" : "In short"}
        </p>
        <p className="mt-2 text-base leading-relaxed text-ink-900">
          <RichText text={guide.summary} />
        </p>
      </div>

      <MakerCta sceneSlug={guide.scene} lead="Make it with PiCraft" />

      {hasToc && (
        <nav aria-label="On this page" className="mt-10 rounded-2xl border border-ink-200 p-5">
          <p className="text-sm font-semibold text-ink-950">On this page</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
            {guide.sections.map((section) => (
              <li key={section.heading}>
                <a href={`#${sectionId(section.heading)}`} className="hover:text-brand-700 hover:underline">
                  {section.heading}
                </a>
              </li>
            ))}
            {guide.faq && guide.faq.length > 0 && (
              <li>
                <a href="#faq" className="hover:text-brand-700 hover:underline">
                  Frequently asked questions
                </a>
              </li>
            )}
          </ol>
        </nav>
      )}

      {guide.sections.map((section) => (
        <section key={section.heading} id={sectionId(section.heading)} className="mt-12 scroll-mt-20">
          <h2 className={H2}>{section.heading}</h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-700">
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}

            {section.items &&
              (section.ordered ? (
                <ol className="list-decimal space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>
                      <RichText text={item} />
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="list-disc space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>
                      <RichText text={item} />
                    </li>
                  ))}
                </ul>
              ))}

            {section.table && (
              <div className="overflow-x-auto rounded-xl border border-ink-200">
                <table className="w-full min-w-[480px] text-left text-sm">
                  {section.table.caption && (
                    <caption className="border-b border-ink-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink-900">
                      {section.table.caption}
                    </caption>
                  )}
                  <thead className="bg-ink-50 text-ink-700">
                    <tr>
                      {section.table.columns.map((column) => (
                        <th key={column} scope="col" className="px-4 py-3 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {section.table.rows.map((row) => (
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
            )}

            {section.after?.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>
        </section>
      ))}

      {guide.faq && guide.faq.length > 0 && (
        <section id="faq" className="mt-12 scroll-mt-20">
          <h2 className={H2}>Frequently asked questions</h2>
          <FaqList items={guide.faq} />
        </section>
      )}

      {guide.sources && guide.sources.length > 0 && (
        <section className="mt-12">
          <h2 className={H2}>Sources</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            Platforms change their requirements, so check the official page before you submit a file.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MakerCta sceneSlug={guide.scene} lead="Ready to make one?" />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className={H2}>Related guides</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <GuideCard key={`${item.kind}-${item.slug}`} guide={item} />
            ))}
          </div>
        </section>
      )}

      {scenes.length > 1 && (
        <section className="mt-16">
          <h2 className={H2}>Makers that help</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {scenes.slice(0, 4).map((scene) => (
              <SceneCard key={scene.slug} scene={scene} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-sm text-ink-500">
        <Link href={GUIDE_BASE[guide.kind]} className="font-medium text-brand-700 hover:underline">
          ← {guide.kind === "size" ? "All size guides" : "All posts"}
        </Link>
      </p>
    </article>
  );
}
