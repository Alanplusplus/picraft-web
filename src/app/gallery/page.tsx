import Image from "next/image";
import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { getExamples, getScenes, isIndexable, type Example } from "@/lib/scenes";
import { breadcrumbLd, collectionLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES } from "@/lib/site";
import { getStyleFile, isStyleIndexable, styleLabel, stylePath } from "@/lib/styles";

const TITLE = "Design Gallery – Invitations, Thumbnails, Stickers & More Made with PiCraft";
const DESCRIPTION =
  "Browse real designs made with PiCraft: wedding and birthday invitations, menus, flyers, YouTube thumbnails, book covers, stickers, t-shirt graphics and product photos.";

export const metadata = pageMetadata({ absoluteTitle: TITLE, description: DESCRIPTION, path: "/gallery" });

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Gallery", path: "/gallery" },
];

const MAX_PER_MAKER = 10;

/** One example per style when the maker has styles, so the gallery shows variety instead of near-duplicates. */
function pickExamples(examples: Example[]): Example[] {
  const seen = new Set<string>();
  const picked: Example[] = [];
  for (const example of examples) {
    if (example.style) {
      if (seen.has(example.style)) continue;
      seen.add(example.style);
    }
    picked.push(example);
    if (picked.length === MAX_PER_MAKER) break;
  }
  return picked;
}

export default function GalleryPage() {
  const scenes = getScenes().filter(isIndexable);
  const ordered = CATEGORIES.flatMap((category) => scenes.filter((scene) => scene.category === category.id));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(CRUMBS),
          collectionLd({
            name: "PiCraft design gallery",
            description: DESCRIPTION,
            path: "/gallery",
            items: ordered.map((scene) => ({ name: scene.name, path: `/create/${scene.slug}` })),
          }),
        ]}
      />
      <Breadcrumb crumbs={CRUMBS} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Design gallery</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-ink-700">
        <p>
          These are real designs made with PiCraft makers. Every one was created from a short form: names and dates for
          an invitation, a headline for a thumbnail, a single idea for a sticker, one photo for a photo trend. Pick a look
          you like, open its maker and make your own with your details.
        </p>
        <p>
          Names, venues and brands in the examples are made up, and the people and pets in the photo trend examples
          are AI-generated, not real. Use the examples for ideas and always proofread your own text before you print
          or publish.
        </p>
      </div>

      <div className="mt-12 space-y-16">
        {ordered.map((scene) => {
          const examples = getExamples(scene.slug);
          const picked = pickExamples(examples);
          if (picked.length === 0) return null;
          const landscape = picked.every((example) => example.width > example.height);
          const styleFile = getStyleFile(scene.slug);

          return (
            <section key={scene.slug} aria-labelledby={`g-${scene.slug}`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id={`g-${scene.slug}`} className="text-2xl font-bold tracking-tight text-ink-950">
                    {scene.name}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-ink-500">{scene.summary}</p>
                </div>
                <Link href={`/create/${scene.slug}`} className="text-sm font-medium text-brand-700 hover:underline">
                  Open the {scene.name} →
                </Link>
              </div>

              <ul
                className={`mt-6 grid gap-4 ${
                  landscape ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                }`}
              >
                {picked.map((example) => {
                  const style = styleFile?.styles.find((entry) => entry.value === example.style);
                  const label = style && styleFile ? styleLabel(scene, styleFile, style) : undefined;
                  const linkable = style && styleFile && isStyleIndexable(styleFile, style);
                  return (
                    <li key={example.url}>
                      <figure>
                        <Image
                          src={example.url}
                          alt={example.alt}
                          width={example.width}
                          height={example.height}
                          sizes={landscape ? "(min-width: 1024px) 33vw, 50vw" : "(min-width: 1024px) 20vw, 33vw"}
                          className="w-full rounded-xl border border-ink-200"
                        />
                        {label && (
                          <figcaption className="mt-2 text-sm text-ink-700">
                            {linkable ? (
                              <Link href={stylePath(scene.slug, style)} className="font-medium text-brand-700 hover:underline">
                                {label}
                              </Link>
                            ) : (
                              label
                            )}
                          </figcaption>
                        )}
                      </figure>
                    </li>
                  );
                })}
              </ul>
              {examples.length > picked.length && (
                <p className="mt-4 text-sm text-ink-500">
                  {examples.length - picked.length} more on the{" "}
                  <Link href={`/create/${scene.slug}`} className="font-medium text-brand-700 hover:underline">
                    {scene.name} page
                  </Link>
                  .
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
