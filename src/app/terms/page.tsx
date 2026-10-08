import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { GOVERNING_LAW, LEGAL_ADDRESS, LEGAL_ENTITY, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description: `The rules for using ${SITE_NAME}: your content, how you may use the files we generate, acceptable use, free credits, copyright complaints and our liability.`,
  path: "/terms",
});

const operator = LEGAL_ENTITY
  ? `${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}`
  : `${SITE_NAME} (picraft.ai)`;

const SECTIONS: ProseSection[] = [
  {
    heading: "Who we are and who can use the service",
    paragraphs: [
      `${SITE_NAME} is operated by ${operator}. You must be at least 13 years old to use it. If you are under the age of majority where you live, you need the permission of a parent or guardian.`,
    ],
  },
  {
    heading: "What the service does",
    paragraphs: [
      `${SITE_NAME} uses AI to create images and print files from the details and photos you provide. AI output can contain mistakes in text, spelling, details and layout, so check every file carefully before you print, publish or submit it.`,
    ],
  },
  {
    heading: "Your content",
    items: [
      "You keep the rights you have in the text and photos you submit.",
      "You give us a limited licence to process your content, send it to the providers named in our Privacy Policy and store the results, only to provide the service to you.",
      "Only upload photos you have the right to use. Do not upload photos of other people without their permission, and do not upload photos of children unless you are their parent or guardian.",
    ],
  },
  {
    heading: "The files we generate",
    items: [
      "We do not claim ownership of the files you generate. Subject to these terms and the law, you may use them for personal and commercial purposes.",
      "AI-generated images may not qualify for copyright protection in some countries, and the service may produce similar results for other people. We do not promise that a result is unique.",
      "AI output can resemble existing works or marks. You are responsible for checking that your use of a design does not infringe trademarks, copyrights or other rights.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: ["You agree not to use the service to:"],
    items: [
      "create unlawful, hateful, harassing, sexually explicit or deceptive content, or content that sexualises or endangers children;",
      "impersonate real people, or create fake endorsements or misleading depictions of real people;",
      "create or alter passports, identity documents, official certificates, currency or any document meant to deceive;",
      "infringe the copyright, trademark, privacy or other rights of others;",
      "get around credit limits, for example by creating many accounts or devices, or access the service with bots, scrapers or automated scripts;",
      "probe, overload, reverse engineer or interfere with the service.",
    ],
  },
  {
    heading: "Product images, listings and print files",
    paragraphs: [
      "Product and property images must accurately represent what you sell or list. Disclose edits such as virtual staging where marketplace or local rules require it.",
      "Marketplaces and printers change their requirements. The specifications on our pages are a guide, so check the current rules of the platform or print shop you use before you submit a file.",
    ],
  },
  {
    heading: "Free credits",
    items: [
      "New visitors receive a limited number of free credits. They have no cash value, cannot be transferred and are limited per device.",
      "A design uses one credit. If a generation fails we return the credit automatically.",
      "We may change, limit or end free credits at any time. If we introduce paid plans, we will describe them clearly before you are charged anything.",
    ],
  },
  {
    heading: "Copyright and content complaints",
    paragraphs: [
      `If you believe something generated or stored by ${SITE_NAME} infringes your rights, email ${SUPPORT_EMAIL} with the link to the file, a description of the work you say is infringed, your contact details and a statement that you are authorised to act. We review complaints promptly, remove content where appropriate and may end access for repeat infringers.`,
    ],
  },
  {
    heading: "Availability and changes",
    paragraphs: [
      "We may change, suspend or stop any part of the service at any time. Files are kept for a limited time as explained in our Privacy Policy, so download anything you want to keep.",
    ],
  },
  {
    heading: "Suspension",
    paragraphs: [
      "We may limit or end your access if you break these terms, abuse free credits or put the service or other people at risk. You can stop using the service at any time.",
    ],
  },
  {
    heading: "No warranty and limit of liability",
    paragraphs: [
      "The service is provided as is and as available, without warranties of any kind, including that it will be uninterrupted, error-free or fit for a particular purpose.",
      `To the extent permitted by law, ${SITE_NAME}'s total liability for any claim relating to the service is limited to the amount you paid us in the 12 months before the claim, which is zero for free use. We are not liable for indirect or consequential losses such as lost profits, or for printing or marketplace rejection costs. Nothing in these terms limits liability that cannot be limited by law.`,
    ],
  },
  {
    heading: "Governing law and changes to these terms",
    paragraphs: [
      ...(GOVERNING_LAW ? [`These terms are governed by the laws of ${GOVERNING_LAW}.`] : []),
      "If we change these terms we will update the date at the top of this page. Using the service after a change means you accept the new terms.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [`Questions about these terms: ${SUPPORT_EMAIL}.`],
  },
];

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of Service"
      intro={[`These terms apply when you use ${SITE_NAME} at picraft.ai. By using the service you agree to them.`]}
      sections={SECTIONS}
    />
  );
}
