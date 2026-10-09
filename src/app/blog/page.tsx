import { Breadcrumb } from "@/components/breadcrumb";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { getGuides, guidePath, isGuideIndexable } from "@/lib/guides";
import { breadcrumbLd, collectionLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";

const TITLE = "PiCraft Blog: Print, Platform and Design File Guides";
const DESCRIPTION =
  "Practical guides on bleed and print files, YouTube thumbnails, product photos, stickers, t-shirt files and invitations, from the team behind PiCraft.";

export const metadata = pageMetadata({ absoluteTitle: TITLE, description: DESCRIPTION, path: "/blog" });

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Blog", path: "/blog" },
];

export default function BlogPage() {
  const posts = getGuides("blog").filter(isGuideIndexable);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd(CRUMBS),
          collectionLd({
            name: "PiCraft blog",
            description: DESCRIPTION,
            path: "/blog",
            items: posts.map((post) => ({ name: post.h1, path: guidePath(post) })),
          }),
        ]}
      />
      <Breadcrumb crumbs={CRUMBS} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">The PiCraft blog</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-700">
        Short, practical guides on the parts of design work that are not the picture: print files, platform rules and
        the checks that save you a reprint. Where a platform publishes its rules, we link to them. Looking for exact
        dimensions? See the size guides.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <GuideCard key={post.slug} guide={post} showDate />
        ))}
      </div>
    </div>
  );
}
