import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { Analytics } from "@/components/analytics";
import { SessionProvider } from "@/components/session-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo";
import {
  BING_SITE_VERIFICATION,
  GOOGLE_SITE_VERIFICATION,
  PINTEREST_VERIFICATION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  verification: {
    google: GOOGLE_SITE_VERIFICATION || undefined,
    other:
      BING_SITE_VERIFICATION || PINTEREST_VERIFICATION
        ? {
            ...(BING_SITE_VERIFICATION ? { "msvalidate.01": BING_SITE_VERIFICATION } : {}),
            ...(PINTEREST_VERIFICATION ? { "p:domain_verify": PINTEREST_VERIFICATION } : {}),
          }
        : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#ff5a36",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="min-h-screen font-sans">
        <SessionProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
