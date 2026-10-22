import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { FaqList } from "@/components/faq-list";
import { ImageSizeChecker } from "@/components/image-size-checker";
import { JsonLd } from "@/components/json-ld";
import { RichText } from "@/components/rich-text";
import { SceneCard } from "@/components/scene-card";
import { getGuide, sectionId } from "@/lib/guides";
import { validateInternalLinks } from "@/lib/links";
import { getScene } from "@/lib/scenes";
import { breadcrumbLd, faqLd, webApplicationLd, type Crumb } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/site";
import { presetRules, presetTargetLabel } from "@/lib/size-presets";
import { getTool, isToolIndexable, logToolIndexability, toolPath, toolSources } from "@/lib/tools";

const SLUG = "image-size-checker";
const H2 = "text-2xl font-bold tracking-tight text-ink-950";

export function generateMetadata() {
  const tool = getTool(SLUG);
  if (!tool) return {};
  return pageMetadata({
    absoluteTitle: tool.title,
    description: tool.description,
    path: toolPath(tool),
    noindex: !isToolIndexable(tool),
  });
}

export default function ImageSizeCheckerPage() {
  const tool = getTool(SLUG);
  if (!tool) notFound();
  logToolIndexability();
  validateInternalLinks();

  const path = toolPath(tool);
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Free tools", path: "/tools" },
    { name: tool.h1, path },
  ];

  const guideNames: Record<string, string> = {};
  const makerNames: Record<string, string> = {};
  for (const preset of tool.presets) {
    const guide = getGuide("size", preset.guide);
    if (guide) guideNames[preset.guide] = `Read the ${guide.h1}`;
    const maker = getScene(preset.maker);
    if (maker) makerNames[preset.maker] = `Make it with the ${maker.name}`;
  }
  const featured = tool.featuredMakers.map((slug) => getScene(slug)).filter((scene) => scene !== undefined);
  const sources = toolSources(tool);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          webApplicationLd({ name: `PiCraft ${tool.h1}`, description: tool.description, path }),
          faqLd(tool.faq),
        ]}
      />
      <article className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Breadcrumb crumbs={crumbs} />

        <header className="mt-6 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Free tool</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{tool.h1}</h1>
          <p className="mt-3 text-sm text-ink-500">
            Updated <time dateTime={tool.updated}>{formatDate(tool.updated)}</time>
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-900">
            <RichText text={tool.summary} />
          </p>
        </header>

        <ImageSizeChecker presets={tool.presets} guideNames={guideNames} makerNames={makerNames} />

        <div className="mx-auto mt-12 max-w-3xl">
          <nav aria-label="On this page" className="rounded-2xl border border-ink-200 p-5">
            <p className="text-sm font-semibold text-ink-950">On this page</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
              {tool.sections.map((section) => (
                <li key={section.heading}>
                  <a href={`#${sectionId(section.heading)}`} className="hover:text-brand-700 hover:underline">
                    {section.heading}
                  </a>
                </li>
              ))}
              <li>
                <a href="#presets" className="hover:text-brand-700 hover:underline">
                  Presets and rules
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-brand-700 hover:underline">
                  Frequently asked questions
                </a>
              </li>
            </ol>
          </nav>

          {tool.sections.map((section) => (
            <section key={section.heading} id={sectionId(section.heading)} className="mt-12 scroll-mt-20">
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

          <section id="presets" className="mt-12 scroll-mt-20">
            <h2 className={H2}>Presets and rules</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-700">
              Each row links to the size guide that explains the numbers and cites the official page.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-ink-50 text-ink-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Preset
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Target
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Other rules
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Guide
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {tool.presets.map((preset) => (
                    <tr key={preset.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-ink-900">{preset.label}</td>
                      <td className="px-4 py-3 text-ink-700">{presetTargetLabel(preset)}</td>
                      <td className="px-4 py-3 text-ink-700">{presetRules(preset).join(" · ") || "None"}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sizes/${preset.guide}`}
                          className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                        >
                          {getGuide("size", preset.guide)?.h1 ?? preset.guide}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="faq" className="mt-12 scroll-mt-20">
            <h2 className={H2}>Frequently asked questions</h2>
            <FaqList items={tool.faq} />
          </section>

          {sources.length > 0 && (
            <section className="mt-12">
              <h2 className={H2}>Sources</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                The numbers come from the official pages cited in the size guides. Platforms change their requirements, so check the official page before you submit a file.
              </p>
              <div className="mt-4 space-y-4 text-sm">
                {sources.map((group) => (
                  <div key={group.guideSlug}>
                    <p className="font-semibold text-ink-900">
                      <Link href={`/sizes/${group.guideSlug}`} className="hover:text-brand-700 hover:underline">
                        {group.guideTitle}
                      </Link>
                    </p>
                    <ul className="mt-1 space-y-1">
                      {group.sources.map((source) => (
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
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {featured.length > 0 && (
          <section className="mt-16">
            <h2 className={H2}>Make a file at the right size</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
              These PiCraft makers export files at the sizes above, so a design starts at the right pixels.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((scene) => (
                <SceneCard key={scene.slug} scene={scene} />
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 text-sm text-ink-500">
          <Link href="/tools" className="font-medium text-brand-700 hover:underline">
            ← All free tools
          </Link>
        </p>
      </article>
    </>
  );
}
