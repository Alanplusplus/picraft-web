import Image from "next/image";
import Link from "next/link";

import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { SceneCard } from "@/components/scene-card";
import { TrackedLink } from "@/components/tracked-link";
import { getGuides, isGuideIndexable } from "@/lib/guides";
import { getScene, getScenesByCategory } from "@/lib/scenes";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";
import {
  absoluteUrl,
  CATEGORIES,
  categoryPath,
  FILE_RETENTION_DAYS,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILES,
  SUPPORT_EMAIL,
  TAGLINE,
} from "@/lib/site";
import { getStyleFile, isStyleIndexable, styleExamples, styleLabel, stylePath } from "@/lib/styles";

export const metadata = pageMetadata({ absoluteTitle: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" });

const STEPS = [
  {
    title: "Choose what you need",
    body: "Pick a maker, such as a birthday invitation, a business card, a YouTube thumbnail or a sticker. Each one is built for a single job.",
  },
  {
    title: "Answer a few plain questions",
    body: "Type the names, dates, prices or the idea for the sticker. Upload a photo if the maker uses one. There is no prompt to write.",
  },
  {
    title: "Download files that are ready to use",
    body: "In about a minute you get every file for that design: the print PDF with bleed, the web image, the transparent PNG, whichever the job needs.",
  },
];

const PROMISES = [
  {
    icon: "📐",
    title: "The exact size, every time",
    body: "1280×720 thumbnails, 5×7 in invitations with bleed, 3.5×2 in business cards. You never have to look up a spec.",
  },
  {
    icon: "📁",
    title: "Files you can use right away",
    body: "Print PDFs with bleed, transparent PNGs and pure-white product shots, not just a picture to fix up later.",
  },
  {
    icon: "✨",
    title: "No prompts to write",
    body: "Answer a few plain questions, like names, dates or what's on the sticker. PiCraft handles the design.",
  },
  {
    icon: "🔎",
    title: "Specs with sources",
    body: "Maker pages explain the rules they follow and link to the official guidelines where they exist, such as YouTube, LinkedIn and Amazon KDP.",
  },
];

const FORMATS = [
  {
    title: "Print PDF with bleed",
    body: "Invitations, flyers, menus and business cards at 300 DPI, with bleed for your print shop and text kept inside the safe area.",
  },
  {
    title: "Transparent PNG",
    body: "Stickers and t-shirt graphics with the background removed, ready for Cricut, print-on-demand stores and cutting machines.",
  },
  {
    title: "Platform-sized JPG",
    body: "Thumbnails, banners, covers and share images at the pixel size and file weight each platform asks for.",
  },
  {
    title: "Pure white product images",
    body: "Main images with a background set to exact RGB 255, plus lifestyle and detail shots for the rest of the listing.",
  },
];

const FAQ = [
  {
    q: "Is PiCraft free?",
    a: "You can try it free. Every new visitor gets a few free credits to use on any maker, and each design uses one credit. When your free credits are used up you can't create more for now.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You start with free credits on the browser you are using, and we don't ask for your name or email address. Your credits and your file history are linked to that browser, so use the same one to see them again.",
  },
  {
    q: "How is PiCraft different from a general AI image generator?",
    a: "A general generator returns a picture and leaves the rest to you: the right size, bleed, spelling, background removal and file format. PiCraft asks plain questions, writes the design instructions for you and exports the files in the formats the job needs.",
  },
  {
    q: "Can I use the files commercially?",
    a: "Yes. You can use what you create for personal and commercial projects, as long as your input doesn't infringe anyone else's rights. Check trademarks and other rights before you sell or publish a design.",
  },
  {
    q: "Will the text on my design be spelled correctly?",
    a: "PiCraft puts your text into the design and tells the AI to spell it exactly, but AI can still make mistakes. Read every name, date, price and phone number before you print or publish, and generate again if something is off.",
  },
  {
    q: "How long does a design take?",
    a: "Usually 30–90 seconds. Every file for that design, such as the print PDF and the share image, is ready at the same time.",
  },
  {
    q: "How long are my files kept?",
    a: `Generated files are deleted automatically after ${FILE_RETENTION_DAYS} days, so download the ones you want to keep. You can ask us to delete them sooner by emailing support.`,
  },
  {
    q: "What happens to the photos I upload?",
    a: "Your photos are sent to our AI provider to create the design and are not shown to other visitors. The Privacy Policy lists the providers we use and how long data is kept.",
  },
  {
    q: "What if the result isn't right?",
    a: "Generate again. Each attempt is a new design and uses one credit. If a generation fails, the credit is returned automatically.",
  },
];

const HERO_SCENES = [
  { slug: "sticker-maker", name: "Sticker Maker" },
  { slug: "birthday-invitation-maker", name: "Birthday Invitation" },
  { slug: "youtube-thumbnail-maker", name: "YouTube Thumbnail" },
  { slug: "book-cover-maker", name: "Book Cover" },
  { slug: "wedding-invitation-maker", name: "Wedding Invitation" },
  { slug: "event-flyer-maker", name: "Event Flyer" },
];

/** Cards for the "Trending photo looks" strip: one per look whose page is live, so the strip never links to a hidden page. */
function trendCards() {
  const scene = getScene("photo-trend-maker");
  const file = getStyleFile("photo-trend-maker");
  if (!scene || !file) return [];
  return file.styles
    .filter((style) => isStyleIndexable(file, style))
    .flatMap((style) => {
      const cover = styleExamples(scene.slug, style)[0];
      return cover ? [{ href: stylePath(scene.slug, style), label: styleLabel(scene, file, style), cover }] : [];
    });
}

export default function HomePage() {
  const resourceGuides = [
    ...getGuides("size").filter(isGuideIndexable).slice(0, 3),
    ...getGuides("blog").filter(isGuideIndexable).slice(0, 3),
  ];
  const trends = trendCards();
  const trendCategory = CATEGORIES.find((category) => category.id === "trends");
  // With no live look pages yet, the plain category section stands in for the strip.
  const categories = CATEGORIES.filter((category) => category.id !== "trends" || trends.length === 0);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: absoluteUrl("/"),
            logo: absoluteUrl("/images/logo-128.png"),
            email: SUPPORT_EMAIL,
            ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES.map((profile) => profile.url) } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: SITE_NAME,
            alternateName: "PiCraft.ai",
            url: absoluteUrl("/"),
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
        ]}
      />

      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{TAGLINE}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
                Make the thing you actually need, ready to print, post or upload.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-ink-700">
                Invitations, menus, business cards, YouTube thumbnails, stickers and more. Fill in a short form and
                download finished files in the right size and format.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <TrackedLink
                  href="/create"
                  event="cta_click"
                  eventParams={{ location: "home_hero", target: "all_makers" }}
                  className="rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800"
                >
                  Browse all makers
                </TrackedLink>
                <TrackedLink
                  href="/create/youtube-thumbnail-maker"
                  event="cta_click"
                  eventParams={{ location: "home_hero", target: "youtube-thumbnail-maker" }}
                  className="rounded-xl border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-900 hover:border-ink-500"
                >
                  Make a YouTube thumbnail
                </TrackedLink>
              </div>
            </div>

            <div className="hidden grid-cols-3 gap-3 lg:grid" aria-hidden>
              {HERO_SCENES.map((item, i) => (
                <div
                  key={item.slug}
                  className={`overflow-hidden rounded-xl border border-ink-200 shadow-sm ${i % 2 === 1 ? "translate-y-4" : ""}`}
                >
                  <Image
                    src={`/images/scenes/${item.slug}.webp`}
                    alt={item.name}
                    width={280}
                    height={210}
                    sizes="140px"
                    className="h-auto w-[140px] object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {trends.length > 0 && trendCategory && (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-950">
                  <Link href={categoryPath(trendCategory.id)} className="hover:text-brand-700">
                    Trending photo looks
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-ink-500">{trendCategory.description}</p>
              </div>
              <Link
                href="/create/photo-trend-maker"
                className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block"
              >
                Open the Photo Trend Maker →
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {trends.map((card) => (
                <li key={card.href}>
                  <Link href={card.href} className="group block">
                    <Image
                      src={card.cover.url}
                      alt={card.cover.alt}
                      width={card.cover.width}
                      height={card.cover.height}
                      sizes="(min-width: 1024px) 14vw, (min-width: 640px) 25vw, 33vw"
                      className="aspect-[2/3] w-full rounded-xl border border-ink-200 object-cover transition group-hover:border-ink-400"
                    />
                    <p className="mt-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">{card.label}</p>
                  </Link>
                </li>
              ))}
              <li className="flex items-center justify-center rounded-xl border border-dashed border-ink-300 p-3 text-center">
                <Link href="/create/photo-trend-maker" className="text-sm font-semibold text-brand-700 hover:underline">
                  Try your own photo →
                </Link>
              </li>
            </ul>
          </section>
        )}

        {categories.map((category) => (
          <section key={category.id} className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-950">
                  <Link href={categoryPath(category.id)} className="hover:text-brand-700">
                    {category.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-ink-500">{category.description}</p>
              </div>
              <Link
                href={categoryPath(category.id)}
                className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block"
              >
                About these makers →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {getScenesByCategory(category.id).map((scene) => (
                <SceneCard key={scene.slug} scene={scene} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">How PiCraft works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-ink-200 p-6">
                <span className="text-sm font-semibold text-brand-700">Step {index + 1}</span>
                <h3 className="mt-2 font-semibold text-ink-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Why use PiCraft</h2>
          <p className="mt-3 max-w-3xl text-ink-700">
            Most of the work in a design is not the picture. It is the size, the bleed, the spelling and the file
            format. PiCraft takes care of those, so the first file you download is usually the one you use.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((item) => (
              <div key={item.title} className="rounded-2xl bg-ink-50 p-6">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">The files you get</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FORMATS.map((item) => (
              <div key={item.title} className="border-l-2 border-brand-200 pl-5">
                <h3 className="font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {resourceGuides.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-950">Size guides and how-tos</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Exact dimensions, bleed and platform rules, so the file you make is the file you need.
                </p>
              </div>
              <Link href="/sizes" className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block">
                All size guides →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resourceGuides.map((guide) => (
                <GuideCard key={`${guide.kind}-${guide.slug}`} guide={guide} />
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Already have an image? Run it through the free{" "}
              <Link href="/tools/image-size-checker" className="font-medium text-brand-700 hover:underline">
                image size checker
              </Link>
              . More on the{" "}
              <Link href="/blog" className="font-medium text-brand-700 hover:underline">
                blog
              </Link>{" "}
              and in the{" "}
              <Link href="/gallery" className="font-medium text-brand-700 hover:underline">
                design gallery
              </Link>
              .
            </p>
          </section>
        )}

        <section className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Made with AI, used responsibly</h2>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-700">
            <p>
              PiCraft uses AI image models to create the artwork. AI can slip on a letter in a name, a digit in a
              price or a detail on a product, so proofread everything before it goes to a printer or a customer.
            </p>
            <p>
              Some uses have rules of their own. Marketplaces expect product images to show what the buyer gets, and
              many real estate listing services require edited or virtually staged photos to be labeled. Each maker page
              explains the rules that apply to it.
            </p>
            <p>
              Read more about how PiCraft works on the{" "}
              <Link href="/about" className="font-medium text-brand-700 underline underline-offset-2">
                About page
              </Link>
              , and about your data in the{" "}
              <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Questions</h2>
          <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
            {FAQ.map((item) => (
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
      </div>
    </>
  );
}
