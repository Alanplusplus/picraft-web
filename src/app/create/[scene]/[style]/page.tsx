import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { FaqList } from "@/components/faq-list";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { MakerLayout } from "@/components/maker-layout";
import { RichText } from "@/components/rich-text";
import { SceneGenerator } from "@/components/scene-generator";
import { getGuidesForScene } from "@/lib/guides";
import { getScene, toClientScene } from "@/lib/scenes";
import { breadcrumbLd, faqLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, formatDate, SITE_NAME } from "@/lib/site";
import {
  getStyle,
  getStyleLinks,
  getStylePages,
  isStyleIndexable,
  logStyleIndexability,
  styleExamples,
  styleLabel,
  stylePath,
} from "@/lib/styles";

export const dynamicParams = false;

export function generateStaticParams() {
  logStyleIndexability();
  return getStylePages().map(({ file, style }) => ({ scene: file.scene, style: style.slug }));
}

export async function generateMetadata({ params }: PageProps<"/create/[scene]/[style]">): Promise<Metadata> {
  const { scene, style } = await params;
  const found = getStyle(scene, style);
  if (!found) return {};
  return pageMetadata({
    absoluteTitle: found.style.seo.title,
    description: found.style.seo.description,
    path: stylePath(scene, found.style),
    noindex: !isStyleIndexable(found.file, found.style),
    // The segment has its own `opengraph-image` file: the card shows this look's best example.
    ownShareImage: true,
  });
}

const H2 = "text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl";

export default async function StylePage({ params }: PageProps<"/create/[scene]/[style]">) {
  const { scene: sceneSlug, style: styleSlug } = await params;
  const scene = getScene(sceneSlug);
  const found = getStyle(sceneSlug, styleSlug);
  if (!scene || !found) notFound();

  const { file, style } = found;
  const label = styleLabel(scene, file, style);
  const path = stylePath(scene.slug, style);
  const examples = styleExamples(scene.slug, style);
  const landscape = examples.length > 0 && examples.every((example) => example.width > example.height);
  const otherStyles = file.styles.filter((entry) => entry !== style && isStyleIndexable(file, entry));
  const guides = getGuidesForScene(scene.slug).slice(0, 3);

  // Open the generator with this style already selected.
  const client = toClientScene(scene);
  const presetScene = {
    ...client,
    fields: client.fields.map((field) => (field.key === file.field ? { ...field, default: style.value } : field)),
  };

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "All makers", path: "/create" },
    { name: scene.name, path: `/create/${scene.slug}` },
    { name: label, path },
  ];

  // Like the maker page: no offers or ratings, because PiCraft has neither to report.
  const applicationLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${style.seo.h1} by ${SITE_NAME}`,
    url: absoluteUrl(path),
    description: style.seo.description,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    image: examples[0] ? absoluteUrl(examples[0].url) : undefined,
    isPartOf: { "@type": "WebApplication", name: `${scene.name} by ${SITE_NAME}`, url: absoluteUrl(`/create/${scene.slug}`) },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
      <JsonLd data={[breadcrumbLd(crumbs), applicationLd, faqLd(style.faq)]} />
      <Breadcrumb crumbs={crumbs} />

      <MakerLayout
        badges={<span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{label}</span>}
        title={style.seo.h1}
        summary={scene.summary}
        form={<SceneGenerator key={style.value} scene={presetScene} styleLinks={getStyleLinks(scene.slug)} />}
        intro={style.intro}
        note={
          <>
            This is the {label} {file.noun} of the{" "}
            <Link href={`/create/${scene.slug}`} className="font-medium text-brand-700 hover:underline">
              {scene.name}
            </Link>
            . The form on this page opens with it already selected.
          </>
        }
      />

      {examples.length > 0 && (
        <section className="mt-16">
          <h2 className={H2}>
            {label} examples
          </h2>
          <div className={`mt-6 grid gap-4 ${landscape ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
            {examples.map((example) => (
              <Image
                key={example.url}
                src={example.url}
                alt={example.alt}
                width={example.width}
                height={example.height}
                sizes={landscape ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                className="w-full rounded-xl border border-ink-200"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16">
        <h2 className={H2}>
          Who the {label} {file.noun} suits
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {style.bestFor.map((item) => (
            <div key={item.title} className="rounded-xl border border-ink-200 p-5">
              <h3 className="font-semibold text-ink-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                <RichText text={item.description} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>Getting the best {label} result</h2>
        <ol className="mt-6 space-y-5">
          {style.designNotes.map((note, index) => (
            <li key={note.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink-950">{note.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">
                  <RichText text={note.description} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>Ideas to try</h2>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-700">
          {style.tryThese.map((idea) => (
            <li key={idea}>
              <RichText text={idea} />
            </li>
          ))}
        </ul>
      </section>

      {style.promptTry && (
        <section className="mt-16 max-w-3xl">
          <h2 className={H2}>{label} prompt for ChatGPT and Gemini</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-700">
            You can try this look in a chat image tool too: upload your photo, then paste the text below. It is adapted
            from the description PiCraft sends to the image model for this look, so a chat tool may give a different
            result. Every run is different, so try it twice, and add the shape you want at the end, such as
            &ldquo;vertical 2:3&rdquo;.
          </p>
          <pre className="mt-4 select-all whitespace-pre-wrap rounded-xl border border-ink-200 bg-ink-50 p-4 font-sans text-sm leading-relaxed text-ink-800">
            {style.promptTry.prompt}
          </pre>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-700">
            {style.promptTry.notes.map((note) => (
              <li key={note}>
                <RichText text={note} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-base leading-relaxed text-ink-700">
            To change the wording or add reference photos, use{" "}
            <Link href="/image-to-image" className="font-medium text-brand-700 hover:underline">
              Image to Image
            </Link>
            . To skip the prompt, use the form at the top of this page and download a finished JPG at the size you pick.
          </p>
        </section>
      )}

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>What you download</h2>
        <p className="mt-4 text-base leading-relaxed text-ink-700">
          Every design from the {scene.name} comes with the files for the job, whichever {file.noun} you choose:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
          {scene.outputs.map((output) => (
            <li key={output.id}>{output.label}</li>
          ))}
        </ul>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>Questions about the {label} {file.noun}</h2>
        <FaqList items={style.faq} />
      </section>

      <p className="mt-10 text-sm text-ink-500">
        Last updated: <time dateTime={file.updated}>{formatDate(file.updated)}</time>
      </p>

      {otherStyles.length > 0 && (
        <section className="mt-16">
          <h2 className={H2}>{file.collection}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {otherStyles.map((entry) => {
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
                      {styleLabel(scene, file, entry)}
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
          <h2 className={H2}>Guides</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={`${guide.kind}-${guide.slug}`} guide={guide} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
