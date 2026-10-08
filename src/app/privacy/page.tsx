import { ProsePage, type ProseSection } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { FILE_RETENTION_DAYS, LEGAL_ADDRESS, LEGAL_ENTITY, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${SITE_NAME} handles the text and photos you submit, the files we generate, our service providers, how long we keep data and how to ask us to delete it.`,
  path: "/privacy",
});

const operator = LEGAL_ENTITY
  ? `${LEGAL_ENTITY}${LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}`
  : `${SITE_NAME} (picraft.ai)`;

const SECTIONS: ProseSection[] = [
  {
    heading: "Information we collect",
    paragraphs: [
      `You do not need an account to use ${SITE_NAME}, and we do not ask for your name, email address or payment details. We collect only what is needed to create your designs and run the service.`,
    ],
    items: [
      "Content you provide: the text you type into a maker and any photos you upload (for example a product photo or a picture of yourself for a thumbnail).",
      "Files we generate: the images and print files created from your content, so that you can download them again from My files.",
      "A device identifier: an ID generated in your browser from a combination of its technical characteristics (such as browser version, screen size and time zone) and kept in local storage. We use it only to give each device its free credits once, to link your browser to its file history and to prevent abuse. It is not used for advertising.",
      "A session cookie that identifies your anonymous account, with its credit balance and file history.",
      "Technical data: IP address, browser type, request times and error details in our server logs, used for security, abuse prevention and troubleshooting.",
      "Messages you send us: if you email us, we receive your email address and what you write.",
    ],
  },
  {
    heading: "How we use it",
    items: [
      "To generate your designs and deliver the files to you.",
      "To show your file history, keep your credit balance and prevent abuse of free credits.",
      "To keep the service secure, fix errors and understand, in aggregate, which makers people use. Visit statistics, where enabled, come from a cookie-free analytics tool and do not identify you.",
      "To answer your messages and requests.",
      "We do not sell your personal information, we do not share it for advertising, and we do not use your uploads or designs to train AI models.",
    ],
    paragraphs: [
      "If you are in the European Economic Area or the United Kingdom, our legal bases are: providing the service you asked for, our legitimate interests in security, abuse prevention and improving the service, and your consent where the law requires it.",
    ],
  },
  {
    heading: "Who we share it with",
    paragraphs: [
      "We share data only with service providers that help us run PiCraft, and only as needed for the purpose described.",
    ],
    items: [
      "AI image generation: your text and uploaded photos are sent to kie.ai, an API platform that runs the AI image models that create your design. It also keeps uploaded photos in temporary storage so the models can read them, and deletes them under its own policy.",
      "Cloud storage: generated files are stored with Alibaba Cloud Object Storage Service (Singapore region) and served through time-limited download links.",
      "Image processing: for stickers and t-shirt designs, the generated artwork (not your uploaded photos) is sent to Volcengine, a cloud service operated by ByteDance, to remove the background.",
      "Hosting, security and analytics providers that process technical data on our behalf.",
      "Authorities or other parties when the law requires it or to protect our rights, users or the public.",
    ],
  },
  {
    heading: "International transfers",
    paragraphs: [
      "Our providers operate in several countries, including Singapore, China and the United States, so your data may be processed outside the country where you live. Where the law requires it, we rely on appropriate safeguards for these transfers.",
    ],
  },
  {
    heading: "How long we keep it",
    items: [
      `Generated files, and the temporary working copies used for background removal, are deleted automatically after ${FILE_RETENTION_DAYS} days. Uploaded photos kept by our image-generation provider are deleted by that provider under its own retention policy.`,
      "Records of your generations (the text you entered and references to the files) are kept until you ask us to delete them. My files shows the ones from the last 90 days.",
      "Credit records (when free credits were granted or used) are kept after a deletion request, so that free credits cannot be claimed again by the same device.",
      "The session cookie expires after 180 days. The device identifier stays in your browser until you clear its site data.",
      "Server logs are kept only as long as needed for security and troubleshooting.",
    ],
  },
  {
    heading: "Your choices and rights",
    items: [
      `Delete your data: email ${SUPPORT_EMAIL} with the reference ID shown at the bottom of My files (or links to the files you want removed) and we will delete the related files and records within 30 days.`,
      "Clear your browser data: this removes the device identifier and session cookie. You will lose access to your file history and any unused free credits.",
      "Your rights: depending on where you live (for example under the GDPR, the UK GDPR or California law) you may have the right to access, correct, delete, export or restrict the use of your data, to object to its use and to withdraw consent. Contact us to use these rights. You can also complain to your local data protection authority.",
      "California residents: we do not sell or share personal information as those terms are defined in California law.",
    ],
  },
  {
    heading: "Cookies and local storage",
    paragraphs: [
      "We use only what the service needs to work. We do not use advertising or cross-site tracking cookies.",
    ],
    items: [
      "pc_session (cookie, first-party, up to 180 days): signs your anonymous account in so your credits and files are available.",
      "pc_device_fp (local storage, kept until you clear site data): your device identifier, described above.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "All traffic to PiCraft uses HTTPS, and download links expire after a limited time. Anyone who has a download link can open it until it expires, so share links only with people you trust. No online service can be perfectly secure, so please avoid uploading images that you consider highly sensitive.",
    ],
  },
  {
    heading: "Children",
    paragraphs: [
      `${SITE_NAME} is not directed to children under 13 and we do not knowingly collect their personal information. If you believe a child has provided us with data, contact us and we will delete it.`,
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "If we change this policy we will update the date at the top of this page and, for significant changes, tell you on the site.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      `Questions or requests about privacy: ${SUPPORT_EMAIL}.`,
      `This service is operated by ${operator}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy Policy"
      intro={[
        `This policy explains what ${SITE_NAME} collects when you use picraft.ai, why we collect it, who it is shared with and the choices you have.`,
      ]}
      sections={SECTIONS}
    />
  );
}
