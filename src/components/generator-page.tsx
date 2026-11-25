import Image from "next/image";
import Link from "next/link";

import {
  type Generator,
  type GeneratorExample,
  generatorPath,
  getGenerator,
  getGeneratorContent,
  getGeneratorExamples,
  getModels,
  modelName,
  toClientGenerator,
} from "@/lib/generators";
import { getScene } from "@/lib/scenes";
import { faqLd } from "@/lib/schema";
import { absoluteUrl, formatDate, SITE_NAME } from "@/lib/site";
import type { ImageModel } from "@/lib/types";

import { CompareSlider } from "./compare-slider";
import { FaqList } from "./faq-list";
import { GeneratorCard } from "./generator-card";
import { ImageGenerator } from "./image-generator";
import { JsonLd } from "./json-ld";
import { MakerLayout } from "./maker-layout";
import { RichText } from "./rich-text";
import { SceneCard } from "./scene-card";
import { SceneGuide, SceneOverview } from "./scene-sections";

const H2 = "text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl";

/** Which shapes a model makes at a resolution, in words. */
function shapesAt(model: ImageModel, resolution: string): string {
  const supported = model.aspectRatios.filter((shape) => shape.resolutions.includes(resolution));
  if (supported.length === model.aspectRatios.length) return "All shapes";
  const named = supported.filter((shape) => shape.value !== "auto");
  const fixed = model.aspectRatios.filter((shape) => shape.value !== "auto");
  if (named.length === fixed.length) return "All shapes except Auto";
  return named.map((shape) => shape.value).join(", ");
}

function ExampleCaption({ example }: { example: GeneratorExample }) {
  const model = getModels().models.find((item) => item.id === example.model);
  return (
    <figcaption className="border-t border-ink-200 px-3 py-2.5">
      <p className="text-xs font-medium text-brand-700">
        {model ? modelName(model) : example.model} · {example.aspectRatio} · {example.resolution}
      </p>
      <p className="mt-1 text-sm leading-snug text-ink-800">&ldquo;{example.prompt}&rdquo;</p>
    </figcaption>
  );
}

function ExampleCard({ example }: { example: GeneratorExample }) {
  const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
  const references = example.references ?? [];
  return (
    <figure className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-ink-200 bg-white">
      {example.before ? (
        <CompareSlider
          before={example.before}
          beforeAlt={example.beforeAlt ?? "Reference image"}
          after={example.url}
          afterAlt={example.alt}
          width={example.width}
          height={example.height}
          sizes={sizes}
        />
      ) : (
        <>
          {references.length > 1 && (
            <ul className="grid grid-cols-2 gap-px border-b border-ink-200 bg-ink-200">
              {references.map((reference, index) => (
                <li key={reference.url} className="relative aspect-[4/3] bg-white">
                  <Image
                    src={reference.url}
                    alt={reference.alt}
                    fill
                    sizes="(min-width: 1024px) 12vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/70 px-1.5 text-xs font-medium text-white">
                    {index + 1}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Image
            src={example.url}
            alt={example.alt}
            width={example.width}
            height={example.height}
            sizes={sizes}
            className="w-full"
          />
        </>
      )}
      <ExampleCaption example={example} />
    </figure>
  );
}

/** The page of one free-form generator: the form, examples with the exact prompts, the models, guide and FAQ. */
export function GeneratorPage({ generator }: { generator: Generator }) {
  const examples = getGeneratorExamples(generator.slug);
  const content = getGeneratorContent(generator.slug);
  const { models } = getModels();
  const url = absoluteUrl(generatorPath(generator));
  const other = getGenerator(generator.slug === "text-to-image" ? "image-to-image" : "text-to-image");
  const related = generator.related.map((slug) => getScene(slug)).filter((scene) => scene !== undefined);
  const imageMode = generator.mode === "image";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: generator.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${generator.name} by ${SITE_NAME}`,
      url,
      description: generator.seo.description,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
    },
    faqLd(generator.faq),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
          <Link href="/" className="hover:text-ink-900">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-900">{generator.name}</span>
        </nav>

        <MakerLayout
          badges={
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {generator.badge}
            </span>
          }
          title={generator.seo.h1}
          summary={generator.summary}
          form={<ImageGenerator generator={toClientGenerator(generator)} />}
          steps={generator.steps}
        />

        {examples.length > 0 && (
          <section className="mt-16">
            <h2 className={H2}>Made with the {generator.name}</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
              {imageMode
                ? "Each image shows its model, shape, resolution and the exact words typed. Drag the handle on a single-photo example to compare."
                : "Each image shows its model, shape, resolution and the exact words typed. Nothing was retouched; the files are only resized."}
            </p>
            <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {examples.map((example) => (
                <ExampleCard key={example.url} example={example} />
              ))}
            </div>
          </section>
        )}

        {content && <SceneOverview name={generator.name} content={content} />}

        <section className="mt-16">
          <h2 className={H2}>Models, shapes and resolutions</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-ink-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Made by</th>
                  {imageMode && <th className="px-4 py-3 font-semibold">Reference images</th>}
                  <th className="px-4 py-3 font-semibold">Resolution, cost and shapes</th>
                  <th className="px-4 py-3 font-semibold">Also makes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {models.map((model) => (
                  <tr key={model.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-ink-900">{modelName(model)}</td>
                    <td className="px-4 py-3 text-ink-700">{model.maker}</td>
                    {imageMode && <td className="px-4 py-3 text-ink-700">Up to {model.maxImages}</td>}
                    <td className="px-4 py-3 text-ink-700">
                      <ul className="space-y-1">
                        {["1K", "2K", "4K"]
                          .filter((resolution) => model.credits[resolution] !== undefined)
                          .map((resolution) => (
                            <li key={resolution}>
                              <span className="font-medium text-ink-900">{resolution}</span> ·{" "}
                              {model.credits[resolution]} {model.credits[resolution] === 1 ? "credit" : "credits"} ·{" "}
                              {shapesAt(model, resolution)}
                            </li>
                          ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {model.transparent || model.animation ? (
                        <ul className="space-y-1">
                          {model.transparent && <li>Transparent background · same credits as an image</li>}
                          {model.animation && (
                            <li>
                              Animated GIF ·{" "}
                              {Object.entries(model.animation.credits)
                                .map(([frames, credits]) => `${frames} frames ${credits} ${credits === 1 ? "credit" : "credits"}`)
                                .join(", ")}
                            </li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-ink-500">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink-500">
            {generator.specNotes.map((note) => (
              <li key={note}>
                <RichText text={note} />
              </li>
            ))}
          </ul>
        </section>

        {content && <SceneGuide name={generator.name} content={content} />}

        <section className="mt-16 max-w-3xl">
          <h2 className={H2}>Frequently asked questions</h2>
          <FaqList items={generator.faq} />
        </section>

        {content && (
          <p className="mt-10 text-sm text-ink-500">
            Last updated: <time dateTime={content.updated}>{formatDate(content.updated)}</time>
          </p>
        )}

        {(other || related.length > 0) && (
          <section className="mt-16">
            <h2 className={H2}>More ways to make images</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {other && <GeneratorCard generator={other} />}
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
