import Link from "next/link";

import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import {
  APPEAL_REPLY_BUSINESS_DAYS,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  MIN_AGE,
  MODEL_DISCLOSURE,
  REPORT_REPLY_BUSINESS_DAYS,
  REPORT_URGENT_HOURS,
  SAFETY_LOG_RETENTION_DAYS,
  SITE_NAME,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Acceptable Use Policy",
  description: `What you may not upload or create with ${SITE_NAME}, how requests are checked, how to report abuse, and what happens when the rules are broken.`,
  path: "/aup",
});

const operator = LEGAL_ENTITY ? `${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}` : SITE_NAME;

const SECTIONS: ProseSection[] = [
  {
    id: "prohibited",
    heading: "Prohibited content",
    paragraphs: [
      `You may not upload, ask for or create any of the following with ${SITE_NAME}, in a photo, in the text you type or in the image that comes back:`,
    ],
    items: [
      "Sexual and nude content (NSFW). Pornography, sexually explicit or suggestive images, nudity, fetish content and sexual instructions in text.",
      "Violence and gore. Graphic violence, gore, torture or mutilation, content that glorifies or incites violence, and content that encourages self-harm or suicide.",
      "Hate speech. Content that attacks, demeans or incites hostility towards people because of race, ethnicity, nationality, religion, sex, gender identity, sexual orientation, disability or age, and hate symbols used to promote hatred.",
      "Child sexual abuse material and anything that endangers a child. Any sexual or suggestive image or text involving a minor, whether real, drawn or AI-generated, and any content that exploits, endangers or grooms a child. We report this to the authorities.",
      "Deepfakes, impersonation and fakes of real people. Putting one person's face on another body (face swap), undressing or sexualising a person in a photo, imitating the face or identity of a real person, including a celebrity, politician or other public figure, placing a real person in a fabricated scene, event or statement, or claiming that something comes from a real person, brand or organisation.",
      "Copyright and trademark infringement. Photos or artwork you have no right to use, content that copies or closely imitates protected artwork, characters, logos or brand identities, and designs that pass themselves off as the official product of a brand you do not represent.",
    ],
  },
  {
    id: "also",
    heading: "Also not allowed",
    items: [
      "Content that promotes terrorism or mass violence, instructions for weapons or explosives, scams, phishing, fake reviews, or other fraud.",
      "Passports, identity cards, driving licences, official certificates, currency, or any document meant to deceive, and photos of such documents, licence plates or other people's private information.",
      "Presenting an AI image as a real photograph in order to mislead buyers, renters, clients, insurers or authorities, for example a listing photo that hides the real condition of a product or a property.",
      "Anything that is illegal where you live or where the people in your photos live.",
      "Trying to get around our checks or limits: coded or reworded instructions, prompt-injection techniques, many devices or identities, or sending the same request again and again after it was refused.",
    ],
  },
  {
    id: "photos",
    heading: "Photos of people",
    paragraphs: [
      `${SITE_NAME} can restyle and edit the photos you upload, so we ask more of you when a photo shows a person.`,
    ],
    items: [
      "Upload only photos you took yourself or have permission to use, and only when every person who can be recognised in them has agreed to it. By adding a photo you confirm this; the notice under every photo field says so.",
      "Do not upload photos of children. Photos in which a child is the subject are not accepted.",
      "Do not use another person's photo to make something that person has not agreed to: a face swap, a nude or sexual version, an intimate or romantic scene with someone else, a fabricated statement, or a fake endorsement.",
      "Do not ask for the likeness of a real public figure, living or dead.",
      `${SITE_NAME} is not a face-swap tool and has no “undress” or voice-cloning feature. We do not offer these and will not add them. Trying to use the service this way is not allowed, and the people who do lose access (see Enforcement).`,
    ],
  },
  {
    id: "moderation",
    heading: "How we check content",
    paragraphs: ["Two safety systems stand between a request and an image:"],
    items: [
      "Your text. Before a request starts, the text you typed is checked by Waffo Prompt Sift, an automated content-safety service. If a request is blocked or held for review, nothing is generated and no credit is used.",
      `The models. The image models we use, ${MODEL_DISCLOSURE}, apply their own safety systems to the text and the photos they receive and to the images they make, and decline harmful requests. When a model declines, nothing is shown and your credits are returned.`,
      "Repeat attempts. When requests from one account are blocked several times in a day, we pause generating for that account for 24 hours, and we may review it.",
      `Records. We keep a log of requests that Prompt Sift blocked or held for review (the time, the account reference, the category and the check's request ID, but not your text) for ${SAFETY_LOG_RETENTION_DAYS} days, so we can spot abuse and show how we apply this policy.`,
    ],
  },
  {
    id: "limits",
    heading: "What the checks cannot do",
    paragraphs: [
      "Automated checks are not perfect. They can refuse something harmless and they can miss something harmful. If a request is refused and you think it should not have been, change the wording or email us. If you see something that got through, please report it: we act on every report.",
    ],
  },
  {
    id: "ai",
    heading: "AI disclosure",
    paragraphs: [
      `Every image made with ${SITE_NAME} is generated by AI and is marked as such on the page where you receive it. The images are made by ${MODEL_DISCLOSURE}.`,
      `${SITE_NAME} is an independent product. It is not made, endorsed or sponsored by Google, OpenAI or Waffo. Waffo is our payment provider and its content-safety service checks the text of your requests.`,
      `${SITE_NAME} has no public feed of what its users make. The designs on our website are examples that we made ourselves. A design is only visible to someone else if you share its link or save it to a service such as Pinterest.`,
    ],
  },
  {
    id: "reporting",
    heading: "Reporting abuse",
    paragraphs: [
      `If you see a design that breaks this policy, or a photo of you that someone used without your permission, use the report form or email ${SUPPORT_EMAIL} with the subject “Report abuse”. Say what is wrong and where you saw it, with a link if you have one.`,
    ],
    items: [
      `If a report names a design and is about a child, sexual content, a fake of a real person or a photo used without permission, the design is taken down at once, before anyone has looked at it, and a person reviews the report within ${REPORT_URGENT_HOURS} hours.`,
      `Every other report is reviewed by a person within ${REPORT_REPLY_BUSINESS_DAYS} business days.`,
      "Reports are confidential. We do not tell the person who made the design who reported it, and we do not retaliate against anyone who reports in good faith.",
      "If a child is in immediate danger, call your local emergency number first.",
    ],
  },
  {
    id: "enforcement",
    heading: "Enforcement",
    paragraphs: ["What we do depends on how serious the violation is, and we may combine these steps:"],
    items: [
      "Refuse the request, with no credit used.",
      "Take down the content and delete the files and the photos it was made from.",
      "Pause generating for 24 hours after repeated blocked requests.",
      "End access permanently, on the first violation if it is serious (child safety, sexual content made from a real person's photo, face swaps, impersonation). The credits that are left are lost and are not refunded, and the device is blocked from starting a new account.",
      "Report the case to the authorities, and keep the evidence for them. We do this at once when a child is involved, and wherever the law requires it.",
    ],
  },
  {
    id: "appeals",
    heading: "Appeals",
    paragraphs: [
      `If you think we made a mistake, for example we ended your access or took a design down by error, email ${SUPPORT_EMAIL} with the subject “Appeal”, your reference ID (shown at the bottom of My files) and what happened. A person who was not involved in the first decision looks at it and answers within ${APPEAL_REPLY_BUSINESS_DAYS} business days. We do not restore content that shows a child in a sexual way, nudity of a real person or a fake of a real person.`,
    ],
  },
];

export default function AupPage() {
  return (
    <ProsePage
      title="Acceptable Use Policy"
      intro={[
        `This policy applies to ${SITE_NAME}, operated by ${operator}. It covers everything you give to the service and everything it makes for you: the photos you upload, the text you type and the images that come back. It is part of the Terms of Service, and using ${SITE_NAME} means you agree to follow it.`,
        `You must be at least ${MIN_AGE} years old to use ${SITE_NAME}.`,
      ]}
      sections={SECTIONS}
    >
      <section id="contact" className="mt-8 scroll-mt-24">
        <h2 className="text-lg font-semibold text-ink-950">{SECTIONS.length + 1}. Changes and contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          We may update this policy. The date at the top shows the current version, and a change that makes the rules
          stricter is announced on the site. Using {SITE_NAME} after a change means you accept it. This policy is part of
          the{" "}
          <Link href="/terms" className="font-medium text-brand-700 hover:underline">
            Terms of Service
          </Link>
          , and what we do with your data is explained in the{" "}
          <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Questions about this policy: {SUPPORT_EMAIL}. To report something, use the{" "}
          <Link href="/report" className="font-medium text-brand-700 hover:underline">
            report form
          </Link>
          .
        </p>
      </section>
    </ProsePage>
  );
}
