import Script from "next/script";

import { PLAUSIBLE_DOMAIN, PLAUSIBLE_SRC } from "@/lib/site";

/** Cookie-free visit statistics. Renders nothing unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. */
export function Analytics() {
  if (!PLAUSIBLE_DOMAIN) return null;
  return <Script defer data-domain={PLAUSIBLE_DOMAIN} src={PLAUSIBLE_SRC} strategy="afterInteractive" />;
}
