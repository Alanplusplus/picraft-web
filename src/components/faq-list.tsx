import { RichText } from "./rich-text";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
      {items.map((item) => (
        <details key={item.q} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-900">
            {item.q}
            <span className="text-ink-500 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            <RichText text={item.a} />
          </p>
        </details>
      ))}
    </div>
  );
}
