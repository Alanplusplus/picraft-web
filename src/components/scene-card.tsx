import Image from "next/image";
import Link from "next/link";

import type { Scene } from "@/lib/scenes";

export function SceneCard({ scene }: { scene: Scene }) {
  const coverSrc = `/images/scenes/${scene.slug}.webp`;

  return (
    <Link
      href={`/create/${scene.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white transition hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <Image
          src={coverSrc}
          alt={scene.name}
          width={600}
          height={450}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {scene.badge}
        </span>
        <h3 className="mt-2 font-semibold text-ink-950 group-hover:text-brand-700">{scene.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{scene.summary}</p>
      </div>
    </Link>
  );
}
