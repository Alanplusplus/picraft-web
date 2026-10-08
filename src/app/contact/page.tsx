import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { LEGAL_ADDRESS, LEGAL_ENTITY, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  absoluteTitle: "Contact PiCraft – Help, Deletion & Copyright Requests",
  description: `Contact ${SITE_NAME} for help with a design, a deletion request, a copyright complaint or feedback. Email ${SUPPORT_EMAIL}.`,
  path: "/contact",
});

const SECTIONS: ProseSection[] = [
  {
    heading: "Email us",
    paragraphs: [
      `Write to ${SUPPORT_EMAIL}. We read every message and reply as soon as we can. Plain text is fine, and screenshots help.`,
    ],
  },
  {
    heading: "Help with a design",
    paragraphs: ["Tell us which maker you used and what went wrong. It helps to include:"],
    items: [
      "your Reference ID, shown at the bottom of My files;",
      "the details you entered, so we can reproduce the problem;",
      "a screenshot or the downloaded file, if the output looks wrong.",
    ],
  },
  {
    heading: "Delete my data",
    paragraphs: [
      `Email us with your Reference ID (or links to the files you want removed) and we will delete the related files and records within 30 days. The Privacy Policy explains what we keep and for how long.`,
    ],
  },
  {
    heading: "Copyright and content complaints",
    paragraphs: [
      `If you believe something made with ${SITE_NAME} infringes your rights, send the link to the file, a description of your work, your contact details and a statement that you are authorised to act. The Terms of Service describe how we handle complaints.`,
    ],
  },
  {
    heading: "Feedback and new makers",
    paragraphs: [
      "Tell us which thing you wish PiCraft could make, or which platform spec we have out of date. We use these messages to decide what to build and what to fix next.",
    ],
  },
  ...(LEGAL_ENTITY
    ? [
        {
          heading: "Company details",
          paragraphs: [`${SITE_NAME} is operated by ${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}.`],
        },
      ]
    : []),
];

export default function ContactPage() {
  return (
    <ProsePage
      title="Contact"
      intro={[`Questions, problems or ideas? Here is how to reach ${SITE_NAME}.`]}
      sections={SECTIONS}
      numbered={false}
      showUpdated={false}
    >
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="mt-10 inline-block rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800"
      >
        Email {SUPPORT_EMAIL}
      </a>
    </ProsePage>
  );
}
