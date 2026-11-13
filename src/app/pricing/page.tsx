import Link from "next/link";

import { FaqList } from "@/components/faq-list";
import { PurchasePanel } from "@/components/purchase-panel";
import { SUBSCRIPTION_PLANS, planPriceLabel } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Pricing – Buy AI Image Credits",
  description: `${SITE_NAME} credits from $2.99 for 30 designs: packs that never expire, or a weekly or monthly plan you can cancel any time. A failed generation is refunded automatically.`,
  path: "/pricing",
});

/** What every credit includes. The same list for all packs and plans: they only differ in how many credits they hold and how long they last. */
const INCLUDED = [
  "Every maker (photo trends, invitations, thumbnails, stickers, product photos and more) and both AI image generators, text to image and image to image",
  "Nano Banana 2.1 by Google and GPT Image 2.5 by OpenAI, up to 4K with Nano Banana",
  "Finished files at the right size: JPG, transparent PNG and print PDF, ready to download",
  "Edit tools under every finished picture: AI edit, enlarge 2× or 4×, remove the background, and a free editor for crop, resize, adjust and convert",
  "Files kept for 90 days in My files, with a link back to every design",
  "Automatic refund of the credits when a generation fails or the AI model declines it",
];

const COSTS = [
  ["A design from a maker", "1 credit"],
  ["An image at 1K (text to image or image to image)", "1 credit"],
  ["An image at 2K", "2 credits"],
  ["An image at 4K", "3 credits"],
  ["Enlarge a picture 2× with AI", "1 credit"],
  ["Enlarge a picture 4× with AI", "2 credits"],
  ["Remove the background of a picture", "1 credit"],
  ["Crop, rotate, resize, adjust and convert in the free editor", "Free"],
];

const FAQ = [
  {
    q: "What does a credit buy?",
    a: "One credit makes one design with any of the makers (a sticker, a thumbnail, an invitation, a product photo), or one 1K image in the text to image and image to image generators. A 2K image uses 2 credits and a 4K image 3. Enlarging a picture 2× or removing its background costs 1 credit and enlarging it 4× costs 2, while the free editor (crop, rotate, resize, adjust, convert) never costs anything. The cost is always shown on the button before you create anything.",
  },
  {
    q: "Packs or a subscription: which should I pick?",
    a: "A pack is a single payment and its credits stay on your account until you use them, which suits occasional use. A subscription tops up your credits every week or month on its own, which suits steady work: a launch week, a campaign, a shop with new listings all the time. Its credits only last for the period you paid for: whatever is left at the end is gone, and the next period starts again from the full amount.",
  },
  {
    q: "Do credits expire?",
    a: "Credits from a pack never expire. Credits from a subscription are valid for the period you paid for: they do not roll over, the next payment replaces what is left, and when the subscription ends the rest expire. You always use subscription credits first, so the credits that never expire are kept for later.",
  },
  {
    q: "How does the subscription renew, and how do I cancel it?",
    a: `The Weekly plan renews every week and the Monthly plan every month, at the same price, until you cancel. Cancel in one click with Manage subscription (it appears above once you have a plan, and opens Waffo's customer portal, where you can also change your card and see receipts). The cancellation takes effect at the end of the period you have paid for: you keep its credits until then and nothing more is charged. If you can't get in, email ${SUPPORT_EMAIL} and we'll cancel it for you.`,
  },
  {
    q: "What if a generation fails?",
    a: "The credits come back automatically and the screen tells you why it failed, so you can change the wording or the photo and try again.",
  },
  {
    q: "Can I get a refund?",
    a: `Refunds follow the refund policy of Waffo, our merchant of record. To ask for one, use Waffo's customer portal, or email ${SUPPORT_EMAIL} from the address you used at checkout with the order number from your receipt. An approved refund goes back to the original payment method (card refunds usually arrive within 3 to 10 business days), and the credits of that payment that you haven't used are taken off your balance. A refund doesn't cancel a subscription by itself, so cancel it too if you don't want it to renew.`,
  },
  {
    q: "Who handles the payment?",
    a: "Waffo, our merchant of record. You pay on their secure page with a card or a local payment method, they collect sales tax or VAT where it applies and send your receipt. Your card details never reach PiCraft.",
  },
  {
    q: "I bought credits on another device. Can I get them back?",
    a: `Yes. Credits and subscriptions belong to the browser that bought them. Email ${SUPPORT_EMAIL} from the address you used at checkout and we'll restore them. Where the "Restore them by email" option is shown above, you can also get a link by yourself that works for 30 minutes.`,
  },
  {
    q: "What am I not allowed to make?",
    a: "Nothing sexual or nude, nothing violent or hateful, nothing that sexualises or endangers a child, no photos of children, no face swaps or fakes of real people, and nothing that infringes someone else's rights. Requests are checked before anything is made, and a blocked or declined request costs nothing. The Acceptable Use Policy lists the rules.",
  },
  {
    q: "Can I use the images commercially?",
    a: "Generally yes. The Terms of Service explain what you can do with the files and what you are responsible for checking.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Pricing</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
        Everyone starts with free credits and needs no account. When they run out, buy a credit pack (a one-time
        payment, credits that never expire) or subscribe weekly or monthly and have credits added for you (renews until you
        cancel, credits valid for the period you paid for). Prices are in US dollars, and a generation that fails is
        refunded automatically.
      </p>

      <div className="mt-8">
        <PurchasePanel returnPath="/pricing" source="pricing" />
      </div>

      <section className="mt-14 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink-950">Included with every credit</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
            {INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink-950">What a credit buys</h2>
          <dl className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-200 text-sm">
            {COSTS.map(([what, cost]) => (
              <div key={what} className="flex justify-between gap-4 px-3 py-2">
                <dt className="text-ink-700">{what}</dt>
                <dd className="shrink-0 font-medium text-ink-950">{cost}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-500">The cost is always shown on the button before you create anything.</p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-ink-50 p-5 text-sm leading-relaxed text-ink-700">
        <h2 className="text-base font-semibold text-ink-950">Billing at a glance</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Credit packs: a single payment, charged once. No billing cycle, no renewal, and the credits never expire.
          </li>
          <li>
            Subscriptions: {SUBSCRIPTION_PLANS.map((plan) => `${plan.name} ${planPriceLabel(plan)}`).join(", ")}. They renew
            automatically at the end of each period, at the same price, until you cancel. Cancel at any time with Manage
            subscription: it ends at the close of the period you paid for.
          </li>
          <li>Subscription credits: valid for the period you paid for, not carried over, and used before pack credits.</li>
          <li>Payment: by Waffo, our merchant of record, with a card or a local payment method. Tax is added where it applies.</li>
          <li>
            Refunds: they follow Waffo&apos;s refund policy. Ask in Waffo&apos;s customer portal or by email to {SUPPORT_EMAIL}. See the{" "}
            <Link href="/terms#purchases" className="underline">
              terms of purchase
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-ink-950">Questions</h2>
        <FaqList items={FAQ} />
        <p className="mt-6 text-sm text-ink-700">
          More in the{" "}
          <Link href="/terms#purchases" className="underline">
            terms of purchase
          </Link>{" "}
          , the{" "}
          <Link href="/aup" className="underline">
            acceptable use policy
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          , or write to {SUPPORT_EMAIL}.
        </p>
      </section>
    </div>
  );
}
