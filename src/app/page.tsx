import Image from "next/image";
import Link from "next/link";

import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { GeneratorCard } from "@/components/generator-card";
import { SceneCard } from "@/components/scene-card";
import { TrackedLink } from "@/components/tracked-link";
import { getGenerators } from "@/lib/generators";
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
  { title: "Choose what you need", body: "A maker for one job, or a generator for any idea." },
  { title: "Answer a few plain questions", body: "Names, dates, prices or the idea. Add a photo if the tool uses one." },
  { title: "Download files that are ready to use", body: "A print PDF, a web image or a transparent PNG, whichever the job needs." },
];

const PROMISES = [
  { icon: "📐", title: "The exact size, every time", body: "1280×720 thumbnails, 5×7 in invitations with bleed, 3.5×2 in business cards." },
  { icon: "📁", title: "Files you can use right away", body: "Print PDFs with bleed, transparent PNGs, pure-white product shots." },
  { icon: "✨", title: "Prompts are optional", body: "Makers ask plain questions and write the design instructions for you." },
  { icon: "🔎", title: "Specs with sources", body: "Maker pages link to the official rules, such as YouTube, LinkedIn and Amazon KDP." },
];

const FAQ = [
  {
    q: "Is PiCraft free?",
    a: "You can try it free: new visitors get a few free credits, and each design uses one. After that you can buy a credit pack (a one-time payment, and the credits never expire) or subscribe weekly or monthly and cancel at any time.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Your credits and your file history are tied to the browser you use, and we don't ask for your name. If you buy credits, our payment provider asks for an email address for the receipt, which you can use later to restore your credits on another device.",
  },
  {
    q: "Does PiCraft have a general AI image generator?",
    a: "Yes. The text to image and image to image generators let you pick Nano Banana or GPT Image, describe the image in your own words, add up to 16 reference photos and choose the shape and resolution. GPT Image can leave the background transparent, and GPT Image 2.6 can make a short animated GIF. The makers cover jobs that come with a spec, such as print PDFs with bleed or pure-white product images.",
  },
  {
    q: "Can I use the files commercially?",
    a: "Yes, for personal and commercial projects, as long as your input doesn't infringe anyone else's rights. Check trademarks before you sell or publish a design.",
  },
  {
    q: "Can I use photos of other people?",
    a: "Only with their permission, and never photos of children. PiCraft is not a face-swap tool: swapping faces, undressing someone or imitating a real person is not allowed, and every request is checked before anything is made. The Acceptable Use Policy has the details.",
  },
  {
    q: "Will the text on my design be spelled correctly?",
    a: "PiCraft tells the AI to spell your text exactly, but AI can still make mistakes. Read every name, date, price and phone number before you print or publish, and generate again if something is off.",
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

/** Specific jobs to start from, shown under the hero buttons: most visitors know the job, not the tool. */
const HERO_JOBS = [
  { label: "Make a sticker", href: "/create/sticker-maker" },
  { label: "YouTube thumbnail", href: "/create/youtube-thumbnail-maker" },
  { label: "Birthday invitation", href: "/create/birthday-invitation-maker" },
  { label: "Book cover", href: "/create/book-cover-maker" },
];

/** Six real results shown beside the hero text: portraits first, since they read well at a small size. */
const HERO_COVERS = [
  { src: "/examples/photo-trend-maker_collectible_figure_box_0_1792339400000.webp", name: "Collectible Figure Box" },
  { src: "/examples/photo-trend-maker_snow_globe_0_1792077818845.webp", name: "Snow Globe" },
  { src: "/examples/photo-trend-maker_chibi_character_0_1795573483000.webp", name: "Chibi Character" },
  { src: "/examples/book-cover-maker_1791295680098_4.webp", name: "Book Cover" },
  { src: "/examples/photo-trend-maker_arcade_16bit_0_1791953427614.webp", name: "16-bit Arcade Fighter" },
  { src: "/examples/sticker-maker_1791294964364_3.webp", name: "Sticker Maker", contain: true },
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

function CategorySection({ category }: { category: (typeof CATEGORIES)[number] }) {
  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            <Link href={categoryPath(category.id)} className="hover:text-brand-700">
              {category.name}
            </Link>
          </h2>
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
  );
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

      <section className="relative overflow-hidden border-b border-ink-200 hero-glow">
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                {TAGLINE}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                AI image tools for the jobs <span className="text-brand-600">you actually have.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-700">
                Make invitations, thumbnails, stickers and photo trends at the right size, or describe any image and
                let the AI draw it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <TrackedLink
                  href="/text-to-image"
                  event="cta_click"
                  eventParams={{ location: "home_hero", target: "text-to-image" }}
                  className="btn-primary"
                >
                  Text to image
                </TrackedLink>
                <TrackedLink
                  href="/image-to-image"
                  event="cta_click"
                  eventParams={{ location: "home_hero", target: "image-to-image" }}
                  className="btn-secondary"
                >
                  Image to image
                </TrackedLink>
                <TrackedLink
                  href="/create"
                  event="cta_click"
                  eventParams={{ location: "home_hero", target: "all_makers" }}
                  className="px-2 py-3 text-sm font-semibold text-brand-700 hover:underline underline-offset-4"
                >
                  Browse all makers →
                </TrackedLink>
              </div>
              <div className="mt-6">
                <p className="text-sm text-ink-500">Free to try, no sign-up. Or start from a job:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {HERO_JOBS.map((job) => (
                    <li key={job.href}>
                      <TrackedLink
                        href={job.href}
                        event="cta_click"
                        eventParams={{ location: "home_hero_job", target: job.href.replace("/create/", "") }}
                        className="inline-block rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-900 shadow-sm transition hover:-translate-y-px hover:border-brand-500 hover:text-brand-700"
                      >
                        {job.label}
                      </TrackedLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hidden grid-cols-3 gap-3 pr-2 lg:grid xl:gap-4" aria-hidden>
              {HERO_COVERS.map((item, i) => (
                <div
                  key={item.src}
                  className={`overflow-hidden rounded-2xl bg-white p-1 shadow-lift ring-1 ring-ink-200 ${
                    // Both cards of a column share one offset, so the columns step without the rows overlapping.
                    ["-rotate-2", "translate-y-5 rotate-1", "translate-y-2 rotate-2", "rotate-1", "translate-y-5 -rotate-1", "translate-y-2 rotate-2"][i]
                  }`}
                >
                  <Image
                    src={item.src}
                    alt={item.name}
                    width={300}
                    height={450}
                    sizes="130px"
                    className={`aspect-[2/3] w-[108px] rounded-xl xl:w-[128px] ${item.contain ? "bg-white object-contain" : "object-cover"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Generate any image</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {getGenerators().map((generator) => (
              <GeneratorCard key={generator.slug} generator={generator} wide />
            ))}
          </div>
        </section>

        {trends.length > 0 && trendCategory && (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                  <Link href={categoryPath(trendCategory.id)} className="hover:text-brand-700">
                    Trending photo looks
                  </Link>
                </h2>
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
                      className="aspect-[2/3] w-full rounded-xl border border-ink-200 object-cover shadow-soft transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift"
                    />
                    <p className="mt-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">{card.label}</p>
                  </Link>
                </li>
              ))}
              <li className="flex items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-3 text-center">
                <Link href="/create/photo-trend-maker" className="text-sm font-semibold text-brand-700 hover:underline">
                  Try your own photo →
                </Link>
              </li>
            </ul>
          </section>
        )}

        {categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}

        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">How PiCraft works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="panel p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  <span className="sr-only">Step </span>
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Why use PiCraft</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink-200 bg-ink-50 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl shadow-soft">
                  {item.icon}
                </span>
                <h3 className="mt-3 font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {resourceGuides.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Size guides and how-tos</h2>
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
              Also:{" "}
              <Link href="/tools/image-size-checker" className="font-medium text-brand-700 hover:underline">
                image size checker
              </Link>
              ,{" "}
              <Link href="/blog" className="font-medium text-brand-700 hover:underline">
                blog
              </Link>
              ,{" "}
              <Link href="/gallery" className="font-medium text-brand-700 hover:underline">
                design gallery
              </Link>
              .
            </p>
          </section>
        )}

        <section className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Made with AI, used responsibly</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-700">
            AI can slip on a letter in a name or a digit in a price, so proofread before you print or publish.
            Marketplaces, listing services and platforms such as YouTube have their own rules for edited or
            AI-generated images, and each maker page lists the ones that apply. More on the{" "}
            <Link href="/about" className="font-medium text-brand-700 underline underline-offset-2">
              About page
            </Link>{" "}
            and in the{" "}
            <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Questions</h2>
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

        <section className="relative mt-20 overflow-hidden rounded-3xl bg-ink-950 px-6 py-12 text-center sm:px-12 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_50%_0%,rgb(255_90_54/0.35),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ready to make your first design?</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <TrackedLink
                href="/text-to-image"
                event="cta_click"
                eventParams={{ location: "home_footer", target: "text-to-image" }}
                className="btn-primary"
              >
                Text to image
              </TrackedLink>
              <TrackedLink
                href="/create"
                event="cta_click"
                eventParams={{ location: "home_footer", target: "all_makers" }}
                className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse all makers
              </TrackedLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
