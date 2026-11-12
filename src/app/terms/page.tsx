import { ProsePage, type ProseSection } from "@/components/prose-page";
import { CREDIT_PACKS, formatPrice, planPriceLabel, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import {
  GOVERNING_LAW,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  MIN_AGE,
  MODEL_DISCLOSURE,
  SITE_NAME,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description: `The rules for using ${SITE_NAME}: your content, how you may use the files we generate, acceptable use, credits and purchases, refunds, content checks, copyright complaints and our liability.`,
  path: "/terms",
});

const operator = LEGAL_ENTITY
  ? `${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}`
  : `${SITE_NAME} (picraft.ai)`;

const PACK_LIST = CREDIT_PACKS.map((pack) => `${pack.name} (${pack.credits} credits for ${formatPrice(pack.priceCents)})`).join(", ");
const PLAN_LIST = SUBSCRIPTION_PLANS.map((plan) => `${plan.name} (${plan.credits} credits for ${planPriceLabel(plan)})`).join(", ");

const CREDITS_SECTION: ProseSection = {
  id: "purchases",
  heading: "Credits, purchases and refunds",
  items: [
    "New visitors receive a limited number of free credits. They have no cash value, cannot be transferred and are limited per device.",
    `You can buy credits in two ways. Credit packs: ${PACK_LIST}. Subscriptions: ${PLAN_LIST}. Prices are in US dollars and are shown on the pricing page before you pay. Credits are added once the payment is confirmed, usually within a minute.`,
    "A credit pack is a one-time payment. It is not a subscription: nothing renews by itself and nothing is charged again, so there is nothing to cancel.",
    "A subscription renews automatically at the end of every billing period (every week for the Weekly plan, every month for the Monthly plan) and charges the same price again, using the payment method you gave, until you cancel. You can cancel at any time with the Manage subscription button on the pricing page, which opens Waffo's customer portal where you can also change your card and see receipts. A cancellation takes effect at the end of the period you have already paid for: nothing more is charged and you keep that period's credits until it ends. You can also ask us to cancel by email.",
    "The credits of a subscription are valid for the period you paid for (we add a short buffer so a renewal that is a few hours late does not leave a gap). Unused subscription credits do not roll over: when the subscription renews they are replaced by the new period's credits, and when it ends the rest expire. When you create something, subscription credits are used before credits from packs.",
    "Payments are processed by Waffo, our merchant of record, which collects the payment, handles sales tax and VAT where they apply and sends your receipt. Your card details go to Waffo and never reach us.",
    "A design uses one credit; a larger image can use up to three, and an AI edit of a finished picture (enlarging it, removing its background) uses one or two. The cost is shown before you create it. The free editor in your browser costs nothing. If a generation or an edit fails, or the AI model declines it, we return the credits automatically.",
    "Credits from packs do not expire; credits from a subscription expire as described above. They belong to the account on the browser that bought them; if you change device or clear your browser data you can restore them with the email address used at checkout.",
    `Refunds follow the refund policy of Waffo, our merchant of record, which processes every payment. To ask for a refund, use Waffo's customer portal, or email ${SUPPORT_EMAIL} from the address you used at checkout with the order number from your receipt. An approved refund goes back to the original payment method; card refunds usually arrive within 3 to 10 business days. The credits of a refunded payment that you have not used are removed from your account. A refund does not cancel a subscription by itself: cancel it too if you do not want it to continue.`,
    "Credits that are left when we end your access for breaking the Acceptable Use Policy are lost and are not refunded.",
    "Please contact us before you dispute a charge with your bank. We can usually fix a problem faster, and a dispute can lead to the account being suspended while it is open.",
    "We may change prices, packs, plans or free credits at any time. A change does not affect credits you have already bought, and a new subscription price only applies to renewals after the change is published on the pricing page. Nothing here limits the rights you have under the consumer law where you live.",
  ],
};

const SECTIONS: ProseSection[] = [
  {
    heading: "Who we are and who can use the service",
    paragraphs: [
      `${SITE_NAME} is operated by ${operator}. You must be at least ${MIN_AGE} years old to use it. It is not meant for children, and we close accounts we learn belong to someone younger.`,
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
      "Only upload photos you took or have the right to use. Every person who can be recognised in a photo must have agreed to it being used, and by adding a photo you confirm this. Do not upload photos of children.",
      "You are responsible for what you upload, what you ask for and how you use the result.",
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
    id: "acceptable-use",
    heading: "Acceptable use",
    paragraphs: [
      "Our Acceptable Use Policy is part of these terms. It lists what you may not upload or create, explains how we check requests, photos and results, and says what happens when the rules are broken. In short, you agree not to use the service to:",
    ],
    items: [
      "create sexual or nude content, graphic violence, hate speech, or anything that sexualises or endangers a child;",
      "swap faces, undress or sexualise someone, imitate a real person or a public figure, or create fake statements or endorsements;",
      "create or alter passports, identity documents, official certificates, currency or any document meant to deceive;",
      "infringe the copyright, trademark, privacy or other rights of others;",
      "get around credit limits, for example by creating many accounts or devices, or access the service with bots, scrapers or automated scripts;",
      "probe, overload, reverse engineer or interfere with the service, or try to get around our content checks.",
    ],
  },
  {
    id: "ai-and-checks",
    heading: "AI-generated images and content checks",
    paragraphs: [
      `Every image is generated by AI, by ${MODEL_DISCLOSURE}, and is labelled as such where you receive it. ${SITE_NAME} is independent and is not endorsed by or affiliated with those companies.`,
      "Before a request is generated, its text is checked by our payment provider's content-safety service (Waffo Prompt Sift), and the image models apply safety systems of their own to what they receive and make. We may also review content that is reported. A request that is blocked, or that a model declines, costs you nothing. These checks are not perfect, and you stay responsible for what you create.",
    ],
  },
  {
    id: "reports",
    heading: "Reports and takedowns",
    paragraphs: [
      `Anyone can report a design or a photo through the report page or by email to ${SUPPORT_EMAIL}. We take down a design that is reported for involving a child, sexual content, a fake of a real person or a photo used without permission, at once and until we have reviewed it, and we remove anything that breaks the Acceptable Use Policy. You can appeal a decision as described in that policy.`,
    ],
  },
  {
    heading: "Product images, listings and print files",
    paragraphs: [
      "Product and property images must accurately represent what you sell or list. Disclose edits such as virtual staging where marketplace or local rules require it.",
      "Marketplaces and printers change their requirements. The specifications on our pages are a guide, so check the current rules of the platform or print shop you use before you submit a file.",
    ],
  },
  CREDITS_SECTION,
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
      "We may limit or end your access, with or without notice, if you break these terms or the Acceptable Use Policy, abuse free credits or put the service or other people at risk. For serious violations we end access at once and block the device from starting a new account. You can stop using the service at any time.",
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
      intro={[
        `These terms apply when you use ${SITE_NAME} at picraft.ai. By using the service you agree to them and to the Acceptable Use Policy.`,
      ]}
      sections={SECTIONS}
    />
  );
}
