"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m3.5 5.25 3.5 3.5 3.5-3.5" />
    </svg>
  );
}

/**
 * A button that opens a panel of links under it (the "Resources" menu, the account menu).
 *
 * It is a disclosure, not an ARIA menu: the panel holds ordinary links in the tab order. Escape, a click outside and
 * tabbing out all close it, and so does moving to another page. The links stay in the page's HTML while it is closed,
 * so crawlers see them.
 */
export function Dropdown({
  button,
  buttonClassName,
  align = "left",
  width = "w-64",
  children,
}: {
  /** What the button shows next to the chevron. */
  button: React.ReactNode;
  buttonClassName: (open: boolean) => string;
  align?: "left" | "right";
  width?: string;
  children: React.ReactNode;
}) {
  // Open only for the page it was opened on, so navigating closes it without an effect.
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);

  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpenedOn(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenedOn(null);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className={buttonClassName(open)}
      >
        {button}
        <Chevron open={open} />
      </button>
      <div
        id={id}
        hidden={!open}
        onClick={(event) => {
          // A click on a link closes the panel, also when the link leads to the page that is already open.
          if ((event.target as HTMLElement).closest("a")) close();
        }}
        className={`absolute top-full z-40 mt-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-menu ${width} ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
