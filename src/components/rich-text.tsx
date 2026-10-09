import Link from "next/link";

import { parseInline } from "@/lib/inline";

const LINK_CLASS = "font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800";

/** Text with `[label](href)` links turned into real links. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (typeof part === "string") return part;
        if (part.href.startsWith("/")) {
          return (
            <Link key={index} href={part.href} className={LINK_CLASS}>
              {part.label}
            </Link>
          );
        }
        return (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {part.label}
          </a>
        );
      })}
    </>
  );
}
