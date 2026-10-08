import type { ContentItem, SceneContent } from "@/lib/scenes";

const H2 = "text-2xl font-bold tracking-tight text-ink-950";

function Cards({ items }: { items: ContentItem[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-ink-200 p-5">
          <h3 className="font-semibold text-ink-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand-700">
      <path d="M4 9.5l3.2 3.2L14 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** What the maker produces and how it works. Shown right after the examples. */
export function SceneOverview({ name, content }: { name: string; content: SceneContent }) {
  return (
    <>
      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>{content.overview.heading}</h2>
        <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-700">
          {content.overview.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className={H2}>What you get with the {name}</h2>
        <Cards items={content.whatYouGet} />
      </section>
    </>
  );
}

/** Use cases, tips, style guide, checklist, limits and sources. Shown after the spec table. */
export function SceneGuide({ name, content }: { name: string; content: SceneContent }) {
  return (
    <>
      <section className="mt-16">
        <h2 className={H2}>What people use the {name} for</h2>
        <Cards items={content.useCases} />
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>Tips for better results</h2>
        <ol className="mt-6 space-y-5">
          {content.tips.map((tip, index) => (
            <li key={tip.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink-950">{tip.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{tip.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {content.styleGuide && (
        <section className="mt-16">
          <h2 className={H2}>{content.styleGuide.heading}</h2>
          {content.styleGuide.intro && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-700">{content.styleGuide.intro}</p>
          )}
          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {content.styleGuide.items.map((item) => (
              <div key={item.title} className="border-l-2 border-brand-200 pl-4">
                <dt className="font-semibold text-ink-950">{item.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-700">{item.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>{content.checklist.heading}</h2>
        <ul className="mt-6 space-y-3">
          {content.checklist.items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className={H2}>What the {name} can&apos;t do</h2>
        <ul className="mt-6 list-disc space-y-3 pl-5 text-sm leading-relaxed text-ink-700">
          {content.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      {content.sources && content.sources.length > 0 && (
        <section className="mt-16 max-w-3xl">
          <h2 className={H2}>Official guidelines</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-700">
            The sizes and rules above follow these official pages. Platforms change their requirements, so check the
            source before you submit your file.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {content.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
