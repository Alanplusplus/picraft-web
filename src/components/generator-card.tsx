import Image from "next/image";

import { type Generator, generatorPath } from "@/lib/generators";

import { TrackedLink } from "./tracked-link";

/**
 * A card for one of the two free-form generators. Looks like a maker card, but opens the generator's own page.
 * `wide` lays the picture beside the text, for the home page where only two of them stand in a row.
 */
export function GeneratorCard({ generator, wide = false }: { generator: Generator; wide?: boolean }) {
  return (
    <TrackedLink
      href={generatorPath(generator)}
      event="maker_select"
      eventParams={{ scene: generator.slug }}
      className={`group card-link flex h-full overflow-hidden ${wide ? "flex-col sm:flex-row" : "flex-col"}`}
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden bg-ink-100 ${wide ? "sm:aspect-auto sm:w-[44%] sm:shrink-0" : "w-full"}`}
      >
        <Image
          src={`/images/generators/${generator.slug}.webp`}
          alt={generator.name}
          width={600}
          height={450}
          sizes={wide ? "(min-width: 1024px) 25vw, (min-width: 640px) 22vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${wide ? "sm:absolute sm:inset-0" : ""}`}
        />
      </div>
      <div className={`flex flex-1 flex-col p-4 ${wide ? "sm:justify-center sm:p-6" : ""}`}>
        <span className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {generator.badge}
        </span>
        <h3 className={`mt-2 font-semibold text-ink-950 group-hover:text-brand-700 ${wide ? "sm:text-lg" : ""}`}>
          {generator.name}
        </h3>
        {wide && (
          <span aria-hidden className="mt-4 hidden text-sm font-semibold text-brand-700 sm:block">
            Open it →
          </span>
        )}
      </div>
    </TrackedLink>
  );
}
