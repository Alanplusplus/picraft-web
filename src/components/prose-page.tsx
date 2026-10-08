import { LEGAL_UPDATED } from "@/lib/site";

export interface ProseSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

/** A plain text page: title, intro and headed sections. Used for legal, about and contact pages. */
export function ProsePage({
  title,
  intro,
  sections,
  numbered = true,
  showUpdated = true,
  children,
}: {
  title: string;
  intro: string[];
  sections: ProseSection[];
  numbered?: boolean;
  showUpdated?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">{title}</h1>
      {showUpdated && <p className="mt-2 text-sm text-ink-500">Last updated: {LEGAL_UPDATED}</p>}
      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-700">
        {intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {sections.map((section, index) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-ink-950">
            {numbered ? `${index + 1}. ` : ""}
            {section.heading}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-ink-700">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {children}
    </article>
  );
}
