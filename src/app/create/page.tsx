import Link from "next/link";

import { SceneCard } from "@/components/scene-card";
import { getScenesByCategory } from "@/lib/scenes";
import { pageMetadata } from "@/lib/seo";
import { CATEGORIES, categoryPath, type CategoryId } from "@/lib/site";

export const metadata = pageMetadata({
  absoluteTitle: "All PiCraft Makers – Invitations, Cards, Thumbnails & More",
  description:
    "All PiCraft makers: photo trends, product photos, invitations, menus, flyers, business cards, thumbnails, banners, book covers, stickers and t-shirt designs.",
  path: "/create",
});

const INTROS: Record<CategoryId, string> = {
  trends:
    "One photo, redone in a look that is going around: an 80s snapshot, a claymation figure, a photo booth strip. Pick a look and a size, from full-screen 9:16 to a Pinterest Pin, and download a finished JPG.",
  photos:
    "Photos that have to follow someone else's rules. Marketplace main images need a pure white background, and property listings need bright, straight photos with honest labels on any edits. These makers start from your own photo.",
  print:
    "Things that go to a printer. Your names, dates, prices and contact details are typeset into the design, and you download PDFs with bleed and safe margins so nothing is trimmed away.",
  creators:
    "Images for a platform with a fixed size, such as a YouTube thumbnail, a LinkedIn banner or a book cover. Each one exports the pixel size and file weight the platform asks for.",
  merch:
    "Artwork with a transparent edge. Stickers and t-shirt graphics come as PNG files with the background removed, ready for a cutting machine or a print-on-demand store.",
};

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
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">What do you need to make?</h1>
      <p className="mt-3 max-w-3xl text-ink-700">
        Pick the thing you need. Each maker asks only for the details that matter, designs it with AI and gives you
        files at the exact size and format you&apos;ll use them in. You never write a prompt, and every maker page
        explains the specs and the rules it follows.
      </p>
      <p className="mt-3 max-w-3xl text-ink-700">
        New visitors get a few free credits, and each design uses one credit. If a design isn&apos;t right, generate
        it again.
      </p>

      <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-2">
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
        {CATEGORIES.map((category) => (
          <section key={category.id} id={category.id} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-ink-950">
              <Link href={categoryPath(category.id)} className="hover:text-brand-700">
                {category.name}
              </Link>
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-700">{INTROS[category.id]}</p>
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
        <p className="mt-1 text-sm leading-relaxed text-ink-700">Start from what you want to do.</p>
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
