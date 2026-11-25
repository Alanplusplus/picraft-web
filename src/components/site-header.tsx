"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SITE_NAME } from "@/lib/site";

import { AccountMenu } from "./account-menu";
import { Dropdown } from "./dropdown";

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-1.5">
      <Image src="/images/logo-64.png" alt="" width={28} height={28} className="h-7 w-7" priority />
      <Image
        src="/images/wordmark.png"
        alt={SITE_NAME}
        width={122}
        height={28}
        className="h-5 w-auto sm:h-6"
        priority
      />
    </Link>
  );
}

interface NavItem {
  href: string;
  label: string;
}

/** The things people come to do. They stay in the bar. */
const PRIMARY_LINKS: NavItem[] = [
  { href: "/text-to-image", label: "Text to image" },
  { href: "/image-to-image", label: "Image to image" },
  { href: "/create", label: "All makers" },
  { href: "/pricing", label: "Pricing" },
];

/** Reading and reference pages. They share one menu so the bar stays short; the footer lists them too. */
const RESOURCE_LINKS: NavItem[] = [
  { href: "/sizes", label: "Size guides" },
  { href: "/tools", label: "Free tools" },
  { href: "/gallery", label: "Gallery" },
  { href: "/blog", label: "Blog" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const BAR_ITEM = "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition";

function NavLink({ href, label }: NavItem) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${BAR_ITEM} ${active ? "bg-ink-100 text-ink-950" : "text-ink-700 hover:bg-ink-100 hover:text-ink-950"}`}
    >
      {label}
    </Link>
  );
}

function ResourcesMenu() {
  const pathname = usePathname();
  const active = RESOURCE_LINKS.some((link) => isActive(pathname, link.href));
  return (
    <Dropdown
      button="Resources"
      buttonClassName={(open) =>
        `${BAR_ITEM} flex items-center gap-1 ${
          active || open ? "bg-ink-100 text-ink-950" : "text-ink-700 hover:bg-ink-100 hover:text-ink-950"
        }`
      }
      width="w-44"
    >
      <ul>
        {RESOURCE_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-950 transition hover:bg-ink-50 aria-[current=page]:bg-brand-50"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </Dropdown>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-ink-700"
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </>
      ) : (
        <>
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </>
      )}
    </svg>
  );
}

function MobileGroup({ title, links, onNavigate }: { title: string; links: NavItem[]; onNavigate: () => void }) {
  return (
    <div>
      <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{title}</p>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-100"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader() {
  // The menu is open only for the page it was opened on, so navigating closes it without an effect.
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;
  const setMenuOpen = (open: boolean) => setOpenedOn(open ? pathname : null);
  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
          <ResourcesMenu />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white hover:bg-ink-50 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-ink-200 bg-paper lg:hidden">
          <nav aria-label="Main" className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
            <MobileGroup title="Create" links={PRIMARY_LINKS.slice(0, 3)} onNavigate={close} />
            <MobileGroup
              title="Account"
              links={[PRIMARY_LINKS[3], { href: "/history", label: "My files" }]}
              onNavigate={close}
            />
            <MobileGroup title="Resources" links={RESOURCE_LINKS} onNavigate={close} />
          </nav>
        </div>
      )}
    </header>
  );
}
