import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { FILE_RETENTION_DAYS, LEGAL_ADDRESS, LEGAL_ENTITY, MODEL_DISCLOSURE, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

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
      `${SITE_NAME} is a set of AI image tools. The general ones are a text to image generator and an image to image generator. The rest are makers built around a thing people actually need to produce: a photo in a trending look, a birthday invitation, a restaurant menu, a YouTube thumbnail, a sticker, a product photo for a marketplace listing. A maker is a short form instead of a blank prompt box, and it asks for the details that matter, such as names, dates, prices or what is on the sticker.`,
      "Either way, PiCraft returns finished files in the sizes and formats you will use them in: JPGs in the shape you choose, print PDFs with bleed, transparent PNGs, pure white product images, thumbnails under the upload limit.",
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
      `PiCraft uses third-party AI image models to create the artwork: ${MODEL_DISCLOSURE}. PiCraft is an independent product and is not made or endorsed by those companies. Every image is AI-generated and labelled that way. AI can make mistakes in text, details and small parts, so we ask you to proofread every name, date, price and phone number before you print, and to compare product and property images with the real thing.`,
      "Marketplaces and listing services have rules about edited and AI-generated images. Some MLS systems and states, for example, require you to label virtually staged photos. The maker pages explain these rules in plain language, but you remain responsible for following them.",
    ],
  },
  {
    heading: "Safety and photos of people",
    paragraphs: [
      "PiCraft is built for making things, not for faking people. There is no face swap, no undress feature and no voice cloning, and we will not add them. Before anything is generated, the text of a request is checked by Waffo Prompt Sift, and the image models apply their own safety systems to what they receive and make; a request that is blocked or declined costs you nothing. You must own the photos you upload or have permission from the people in them, and photos of children are not accepted.",
      "Anyone can report a design or a photo of themselves, and a reported design is taken down at once while we look at it. The Acceptable Use Policy explains the rules, how fast we answer and what happens to accounts that break them.",
    ],
  },
  {
    heading: "Pricing and payments",
    paragraphs: [
      "Everyone starts with free credits. After that you can buy a credit pack (a one-time payment, credits that never expire) or subscribe weekly or monthly (renews until you cancel; the credits of each period expire with it). Waffo, our merchant of record, handles the payment, the tax and the receipt. Refunds follow Waffo's refund policy. See the pricing page for the prices and the terms for the details.",
    ],
  },
  {
    heading: "Privacy and data",
    paragraphs: [
      `You don't need an account, and we don't ask for your name. If you buy credits, our payment provider Waffo asks for your email address to send the receipt. Your files are deleted automatically after ${FILE_RETENTION_DAYS} days, and you can ask us to delete them sooner. Read the Privacy Policy for the details.`,
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
        `${SITE_NAME} is a set of AI image tools: describe an image or upload a photo, or use a maker built for one job, and download a finished file at the right size.`,
      ]}
      sections={SECTIONS}
      numbered={false}
      showUpdated={false}
    />
  );
}
