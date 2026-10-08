import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { FILE_RETENTION_DAYS, LEGAL_ADDRESS, LEGAL_ENTITY, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  absoluteTitle: "About PiCraft – How It Works & Where Specs Come From",
  description: `${SITE_NAME} turns a short form into finished, correctly sized files: invitations, menus, cards, thumbnails and stickers. See how it works and where specs come from.`,
  path: "/about",
});

const operator = LEGAL_ENTITY
  ? `${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}`
  : `${SITE_NAME} (picraft.ai)`;

const SECTIONS: ProseSection[] = [
  {
    heading: "What PiCraft is",
    paragraphs: [
      `${SITE_NAME} is a set of single-purpose makers. Each one is built around a thing people actually need to produce: a birthday invitation, a restaurant menu, a business card, a YouTube thumbnail, a sticker, a product photo for a marketplace listing. Instead of a blank prompt box, you get a short form that asks for the details that matter, such as names, dates, prices or what is on the sticker.`,
      "You answer a few plain questions, and PiCraft returns finished files in the sizes and formats you will use them in: print PDFs with bleed, transparent PNGs, pure white product images, thumbnails under the upload limit.",
    ],
  },
  {
    heading: "Why we built it",
    paragraphs: [
      "General AI image tools are good at making pictures, but a picture is rarely the finished job. A wedding invitation needs a bleed and a safe area for the print shop. An Amazon main image needs a pure white background. A sticker needs a transparent edge. Most people lose more time on these details than on the design itself.",
      `${SITE_NAME} handles the details so that the first file you download is the one you can use.`,
    ],
  },
  {
    heading: "How a maker works",
    items: [
      "You fill in a form. Each field has a clear label and a limit, so the design stays readable.",
      "PiCraft turns your answers into design instructions for an AI image model, including the rules for that kind of file, such as where text may sit so that nothing is trimmed.",
      "The model creates the artwork. Where needed, PiCraft removes the background, sets a pure white backdrop, adds bleed, resizes and builds the PDF.",
      "You download every file for that design at once, with a preview.",
    ],
  },
  {
    heading: "Where the sizes and rules come from",
    paragraphs: [
      "The specs on each maker page come from the platform or the print industry that sets them, such as YouTube, LinkedIn, Amazon KDP and Amazon seller guidance, or standard business card and paper sizes. Where an official page is available we link to it at the bottom of the maker page, and every page shows the date it was last updated.",
      "Platforms change their requirements from time to time. If you find a spec that is out of date, tell us and we will fix it.",
    ],
  },
  {
    heading: "How we use AI, and what we ask of you",
    paragraphs: [
      "PiCraft uses third-party AI image models to create the artwork. AI can make mistakes in text, details and small parts, so we ask you to proofread every name, date, price and phone number before you print, and to compare product and property images with the real thing.",
      "Marketplaces and listing services have rules about edited and AI-generated images. Some MLS systems and states, for example, require you to label virtually staged photos. The maker pages explain these rules in plain language, but you remain responsible for following them.",
    ],
  },
  {
    heading: "Privacy and data",
    paragraphs: [
      `You don't need an account, and we don't ask for your name or email address. Your files are deleted automatically after ${FILE_RETENTION_DAYS} days, and you can ask us to delete them sooner. Read the Privacy Policy for the details.`,
    ],
  },
  {
    heading: "Who runs PiCraft",
    paragraphs: [`${SITE_NAME} is operated by ${operator}. Write to us at ${SUPPORT_EMAIL}, or use the Contact page.`],
  },
];

export default function AboutPage() {
  return (
    <ProsePage
      title="About PiCraft"
      intro={[
        `${SITE_NAME} turns a short form into finished, correctly sized files, without a prompt to write and without a file to fix afterwards.`,
      ]}
      sections={SECTIONS}
      numbered={false}
      showUpdated={false}
    />
  );
}
