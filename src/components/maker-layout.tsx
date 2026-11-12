import type { ReactNode } from "react";

import { RichText } from "./rich-text";

/**
 * The top of every maker and generator page. The page is a workbench: the title and one line, then the form and the
 * place where the result appears, side by side on a desktop and one after the other on a phone. Nothing sits between
 * the visitor and the form. How it works and the longer text come after the workbench, for whoever wants them.
 */
export function MakerLayout({
  badges,
  title,
  summary,
  form,
  steps,
  intro,
  note,
}: {
  badges: ReactNode;
  title: string;
  /** One line under the title: what the maker does. */
  summary: string;
  /** The workbench: the form and the result area. */
  form: ReactNode;
  steps?: { title: string; description: string }[];
  intro: string[];
  /** A line under the intro, for pages that need to say where they sit in a family of pages. */
  note?: ReactNode;
}) {
  return (
    <div className="mt-4 sm:mt-6">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">{badges}</div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-950 sm:mt-3 sm:text-3xl lg:text-4xl">{title}</h1>
        <p className="mt-2 text-base leading-snug text-ink-700">{summary}</p>
      </header>

      <div id="create" className="mt-5 scroll-mt-20 sm:mt-6">
        {form}
      </div>

      <div className="mt-12 grid gap-x-10 gap-y-8 border-t border-ink-100 pt-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {steps && steps.length > 0 && (
          <section aria-labelledby="how-it-works" className="lg:order-2">
            <h2 id="how-it-works" className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              How it works
            </h2>
            <ol className="mt-3 space-y-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-ink-900">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-ink-500">
                      <RichText text={step.description} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        <div className="space-y-3 text-sm leading-relaxed text-ink-700 lg:order-1">
          {intro.map((paragraph) => (
            <p key={paragraph}>
              <RichText text={paragraph} />
            </p>
          ))}
          {note && <p className="text-ink-500">{note}</p>}
        </div>
      </div>
    </div>
  );
}
