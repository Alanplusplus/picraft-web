import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { GeneratorCard } from "@/components/generator-card";
import { SceneCard } from "@/components/scene-card";
import { generatorPath, getGenerators } from "@/lib/generators";
import { getScenes, getScenesByCategory, isIndexable } from "@/lib/scenes";
import { breadcrumbLd, collectionLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES, categoryPath } from "@/lib/site";

const TITLE = "All PiCraft AI Image Tools – Photos, Invitations & More";
const DESCRIPTION =
  "All PiCraft AI image tools: text to image, image to image, photo trends, product photos, invitations, menus, thumbnails, book covers, stickers and t-shirt designs.";

export const metadata = pageMetadata({ absoluteTitle: TITLE, description: DESCRIPTION, path: "/create" });

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "All makers", path: "/create" },
];

const GUIDE = [
  { need: "Restyle a photo of yourself or a pet", slug: "photo-trend-maker", name: "Photo Trend Maker" },
  { need: "Sell a product online", slug: "amazon-product-photo", name: "Amazon Product Photo Maker" },
  { need: "List a property", slug: "real-estate-listing-photo", name: "Real Estate Listing Photo Editor" },
  { need: "Invite people to a wedding", slug: "wedding-invitation-maker", name: "Wedding Invitation Maker" },
  { need: "Invite people to a party", slug: "birthday-invitation-maker", name: "Birthday Invitation Maker" },
  { need: "Promote an event", slug: "event-flyer-maker", name: "Event Flyer Maker" },
  { need: "Print a menu", slug: "restaurant-menu-maker", name: "Restaurant Menu Maker" },
  { need: "Hand out contact details", slug: "business-card-maker", name: "Business Card Maker" },
  { need: "Upload a video thumbnail", slug: "youtube-thumbnail-maker", name: "YouTube Thumbnail Maker" },
  { need: "Update a LinkedIn profile", slug: "linkedin-banner-maker", name: "LinkedIn Banner Maker" },
  { need: "Publish a book", slug: "book-cover-maker", name: "Book Cover Maker" },
  { need: "Make stickers", slug: "sticker-maker", name: "Sticker Maker" },
  { need: "Sell t-shirts", slug: "t-shirt-design-maker", name: "T-Shirt Design Maker" },
];

export default function CreatePage() {
  const makers = getScenes().filter(isIndexable);
  const generators = getGenerators();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(CRUMBS),
          collectionLd({
            name: "PiCraft makers",
            description: DESCRIPTION,
            path: "/create",
            items: [
              ...generators.map((generator) => ({ name: generator.name, path: generatorPath(generator) })),
              ...makers.map((scene) => ({ name: scene.name, path: `/create/${scene.slug}` })),
            ],
          }),
        ]}
      />
      <Breadcrumb crumbs={CRUMBS} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">What do you need to make?</h1>
      <p className="mt-3 max-w-3xl text-ink-700">
        Pick the job you have, and the maker gives you files at the size and format you need, with no prompt to write.
        If no maker fits, the two generators take your own description or photos.
      </p>

      <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-2">
        <a
          href="#generators"
          className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-800 hover:border-ink-500"
        >
          AI image generators
        </a>
        {CATEGORIES.map((category) => (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-800 hover:border-ink-500"
          >
            {category.name}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-14">
        <section id="generators" className="scroll-mt-20">
          <h2 className="text-xl font-bold text-ink-950">AI image generators</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {generators.map((generator) => (
              <GeneratorCard key={generator.slug} generator={generator} />
            ))}
          </div>
        </section>

        {CATEGORIES.map((category) => (
          <section key={category.id} id={category.id} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-ink-950">
              <Link href={categoryPath(category.id)} className="hover:text-brand-700">
                {category.name}
              </Link>
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {getScenesByCategory(category.id).map((scene) => (
                <SceneCard key={scene.slug} scene={scene} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-xl font-bold text-ink-950">Not sure where to start?</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {GUIDE.map((item) => (
            <li key={item.slug} className="text-ink-700">
              {item.need}:{" "}
              <Link href={`/create/${item.slug}`} className="font-medium text-brand-700 hover:underline">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
