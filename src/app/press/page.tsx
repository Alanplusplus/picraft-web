import Image from "next/image";

import { ProsePage, type ProseSection } from "@/components/prose-page";
import { getGuides, isGuideIndexable } from "@/lib/guides";
import { getScenes, isIndexable } from "@/lib/scenes";
import { pageMetadata } from "@/lib/seo";
import { FILE_RETENTION_DAYS, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";
import { getTools, isToolIndexable } from "@/lib/tools";

export const metadata = pageMetadata({
  absoluteTitle: "Press Kit: PiCraft Facts, Boilerplate & Logos",
  description:
    "PiCraft press kit: short descriptions to copy, key facts, how to write the name, logo downloads and a contact address for journalists, bloggers and directories.",
  path: "/press",
});

const BOX = "mt-3 select-all rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm leading-relaxed text-ink-900";

export default function PressPage() {
  const makers = getScenes().filter(isIndexable).length;
  const sizeGuides = getGuides("size").filter(isGuideIndexable).length;
  const tools = getTools().filter(isToolIndexable).length;

  const oneLine = `${SITE_NAME} (picraft.ai) is a set of single-purpose makers that turn a short form into finished, correctly sized files: invitations, menus, business cards, YouTube thumbnails, stickers and marketplace product photos.`;
  const short = `${SITE_NAME} (picraft.ai) turns a short form into finished, correctly sized design files. Instead of a blank prompt box, each maker asks for the details that matter and returns print PDFs with bleed, transparent PNGs, pure white product images or thumbnails under the upload limit. New visitors get free credits and need no account.`;
  const long = [
    `${SITE_NAME} (picraft.ai) is a set of ${makers} single-purpose makers for design jobs that come with a spec. Each maker is a short form instead of a prompt box: you enter the names, dates, prices or product details that matter, and ${SITE_NAME} returns finished files in the sizes and formats you will use them in. Examples are print-ready PDFs with bleed for invitations, menus, flyers and business cards, YouTube thumbnails and LinkedIn banners at the exact upload size, book covers, transparent PNGs for stickers and print-on-demand shirts, and pure white marketplace product photos.`,
    `${SITE_NAME} uses third-party AI image models for the artwork and handles the rest: background removal, bleed, resizing and PDF export. The site also publishes size guides that link the official requirement behind every number, and a free image size checker that runs in the browser. New visitors get free credits and do not need an account.`,
  ];

  const sections: ProseSection[] = [
    {
      heading: "Key facts",
      items: [
        `Name: ${SITE_NAME}. Website: https://www.picraft.ai`,
        "Launched: 2026",
        `What it is: ${makers} makers, ${sizeGuides} size guides and ${tools} free ${tools === 1 ? "tool" : "tools"}`,
        "How it works: a short form instead of a prompt; the artwork comes from third-party AI image models",
        "Pricing: new visitors get a few free credits, each design uses one credit. There is no paid plan at the moment",
        "Account: none needed. Credits and file history are tied to the browser",
        `Files: kept for ${FILE_RETENTION_DAYS} days, then deleted automatically`,
        "Use of the files: personal and commercial use is allowed (see the Terms)",
        `Contact: ${SUPPORT_EMAIL}`,
      ],
    },
    {
      heading: "How to write the name",
      paragraphs: [
        `Please write ${SITE_NAME} with a capital P and a capital C, and link to https://www.picraft.ai. Other products have similar names, so adding picraft.ai in brackets the first time you mention it avoids a mix-up.`,
      ],
    },
    {
      heading: "About the examples",
      paragraphs: [
        "The example designs on the site are made with the PiCraft makers. Names, venues and brands in them are made up, and the people and pets in the photo trend examples are AI-generated, not real. If you publish an example, please say that it is AI-generated.",
      ],
    },
  ];

  return (
    <ProsePage
      title="PiCraft press kit"
      intro={[
        `Facts, short descriptions and logos for anyone writing about ${SITE_NAME}: journalists, bloggers, newsletter authors and directory editors. Click a description to select it, then copy it.`,
        `If you need something that is not here, such as a screenshot of a specific maker or a larger logo, write to ${SUPPORT_EMAIL}.`,
      ]}
      sections={[]}
      numbered={false}
      showUpdated={false}
    >
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-950">Descriptions to copy</h2>
        <h3 className="mt-4 text-sm font-semibold text-ink-900">One sentence</h3>
        <p className={BOX}>{oneLine}</p>
        <h3 className="mt-6 text-sm font-semibold text-ink-900">Short (about 60 words)</h3>
        <p className={BOX}>{short}</p>
        <h3 className="mt-6 text-sm font-semibold text-ink-900">Long (about 160 words)</h3>
        <div className={BOX}>
          {long.map((paragraph, index) => (
            <p key={paragraph} className={index > 0 ? "mt-3" : ""}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-ink-950">{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-ink-700">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-950">Logos</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Both files are PNGs with a transparent background. Please use them as they are, without changing the colors or the proportions.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-4">
            <div className="flex h-28 items-center justify-center rounded-lg bg-ink-50">
              <Image src="/images/logo-128.png" alt="PiCraft logo" width={64} height={64} />
            </div>
            <p className="mt-3 text-sm font-medium text-ink-900">Logo, 128×128 px</p>
            <a
              href="/images/logo-128.png"
              download="picraft-logo-128.png"
              className="mt-1 inline-block text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Download PNG
            </a>
          </div>
          <div className="rounded-xl border border-ink-200 p-4">
            <div className="flex h-28 items-center justify-center rounded-lg bg-ink-50">
              <Image src="/images/wordmark-2x.png" alt="PiCraft wordmark" width={243} height={56} />
            </div>
            <p className="mt-3 text-sm font-medium text-ink-900">Wordmark, 486×112 px</p>
            <a
              href="/images/wordmark-2x.png"
              download="picraft-wordmark-486.png"
              className="mt-1 inline-block text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Download PNG
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-950">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          . Use the same address to report a spec that is out of date.
        </p>
      </section>
    </ProsePage>
  );
}
