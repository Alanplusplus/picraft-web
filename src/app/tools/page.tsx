import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { getGuide, isGuideIndexable } from "@/lib/guides";
import { breadcrumbLd, collectionLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { getTools, isToolIndexable, toolPath } from "@/lib/tools";

const TITLE = "Free Design Tools: Check Image Size, Ratio and Print Specs";
const DESCRIPTION =
  "Free PiCraft tools that run in your browser: check an image against YouTube, Amazon, MLS and print specs, and download guide templates. No sign-up needed.";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Free tools", path: "/tools" },
];

export function generateMetadata() {
  const indexable = getTools().some(isToolIndexable);
  return pageMetadata({ absoluteTitle: TITLE, description: DESCRIPTION, path: "/tools", noindex: !indexable });
}

export default function ToolsPage() {
  const tools = getTools().filter(isToolIndexable);
  const guideSlugs = [...new Set(tools.flatMap((tool) => tool.presets.map((preset) => preset.guide)))];
  const guides = guideSlugs
    .flatMap((slug) => {
      const guide = getGuide("size", slug);
      return guide && isGuideIndexable(guide) ? [guide] : [];
    })
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(CRUMBS),
          collectionLd({
            name: "PiCraft free tools",
            description: DESCRIPTION,
            path: "/tools",
            items: tools.map((tool) => ({ name: tool.h1, path: toolPath(tool) })),
          }),
        ]}
      />
      <Breadcrumb crumbs={CRUMBS} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Free tools for design files</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-ink-700">
        <p>
          A file that looks fine on screen can still be rejected: a thumbnail over the size limit, a product photo that
          is not white enough, a print file at too low a resolution. These tools check the part that has numbers in it.
          They run in your browser, they do not ask you to sign in, and the files you check are never uploaded.
        </p>
        <p>
          Every number comes from the{" "}
          <Link href="/sizes" className="font-medium text-brand-700 underline underline-offset-2">
            PiCraft size guides
          </Link>
          , which link the official page each figure was checked against.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={toolPath(tool)}
            className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-md"
          >
            <span className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Free tool</span>
            <h2 className="mt-3 font-semibold text-ink-950 group-hover:text-brand-700">{tool.h1}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{tool.description}</p>
          </Link>
        ))}
      </div>

      {guides.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-ink-950">Size guides behind the checker</h2>
          <p className="mt-1 text-sm text-ink-500">Read these when you want the reasons behind a number.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
