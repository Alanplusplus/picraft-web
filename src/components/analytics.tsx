import Script from "next/script";

import { GA_MEASUREMENT_ID, PLAUSIBLE_DOMAIN, PLAUSIBLE_SRC } from "@/lib/site";

/** Development runs are left out so local testing does not pollute the statistics. */
const GA_ENABLED = Boolean(GA_MEASUREMENT_ID) && process.env.NODE_ENV === "production";

/**
 * Visit statistics. Google Analytics 4 is on by default in production (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) and
 * measures page views, including client-side navigations. Custom events are sent through `trackEvent`
 * in `@/lib/analytics`. Plausible renders only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set.
 */
export function Analytics() {
  return (
    <>
      {PLAUSIBLE_DOMAIN && (
        <Script defer data-domain={PLAUSIBLE_DOMAIN} src={PLAUSIBLE_SRC} strategy="afterInteractive" />
      )}
      {GA_ENABLED && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)});`}
          </Script>
        </>
      )}
    </>
  );
}
