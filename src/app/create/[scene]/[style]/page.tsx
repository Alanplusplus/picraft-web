import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { FaqList } from "@/components/faq-list";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { RichText } from "@/components/rich-text";
import { SceneGenerator } from "@/components/scene-generator";
import { getGuidesForScene } from "@/lib/guides";
import { getScene, toClientScene } from "@/lib/scenes";
import { breadcrumbLd, faqLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import {
  getStyle,
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
  });
}

const H2 = "text-2xl font-bold tracking-tight text-ink-950";

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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(style.faq)]} />
      <Breadcrumb crumbs={crumbs} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_440px]">
        <section>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{label}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{style.seo.h1}</h1>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-700">
            {style.intro.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>
          <p className="mt-5 text-sm text-ink-500">
            This is the {label} {file.noun} of the{" "}
            <Link href={`/create/${scene.slug}`} className="font-medium text-brand-700 hover:underline">
              {scene.name}
            </Link>
            . The form on this page opens with it already selected.
          </p>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SceneGenerator key={style.value} scene={presetScene} />
        </aside>
      </div>

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
