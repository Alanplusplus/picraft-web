import "server-only";

import fs from "node:fs";
import path from "node:path";

import { stripInline } from "./inline";
import { MIN_EXAMPLES_TO_INDEX, MIN_FAQ_TO_INDEX, MIN_WORDS_TO_INDEX, type SceneContent } from "./scenes";
import type { ClientGenerator, GeneratorMode, ImageModel } from "./types";

/**
 * The two free-form generators, text to image and image to image. They are not scenes: there is no
 * template, no style menu and no fixed output size. The visitor picks the model, the shape and the
 * resolution, and the file comes back as the model made it.
 *
 * Page text lives in `<slug>.json`, `content-<slug>.json` and `examples-<slug>.json`; the models and what
 * each accepts live in `models.json`, which the backend reads too (keep `backend/generators/models.json` identical).
 */
const DATA_DIR = path.join(process.cwd(), "src", "data", "generators");

export interface Generator {
  slug: "text-to-image" | "image-to-image";
  mode: GeneratorMode;
  name: string;
  summary: string;
  badge: string;
  indexable: boolean;
  seo: { title: string; description: string; h1: string; intro: string[] };
  steps: { title: string; description: string }[];
  /** Notes under the table of models and shapes. */
  specNotes: string[];
  faq: { q: string; a: string }[];
  /** Slugs of makers (scenes) to show under "More makers". */
  related: string[];
  /** Placeholder text of the description box. */
  placeholder: string;
  /** Help line under the description box. */
  help: string;
}

export interface GeneratorExample {
  url: string;
  alt: string;
  width: number;
  height: number;
  approved: boolean;
  /** What was typed, word for word. */
  prompt: string;
  /** Id of the model it was made with, as in models.json. */
  model: string;
  aspectRatio: string;
  resolution: string;
  /** One reference image: shown as a before / after slider. */
  before?: string;
  beforeAlt?: string;
  /** Two or more reference images: shown next to the result. */
  references?: { url: string; alt: string }[];
}

interface ModelsFile {
  maxPromptLength: number;
  defaultModel: string;
  models: ImageModel[];
}

const SLUGS: Generator["slug"][] = ["text-to-image", "image-to-image"];

let modelsCache: ModelsFile | null = null;
let cache: Generator[] | null = null;

/** Production reads each file once. In development they are read again on every call, so editing a JSON file (a new
 * model, a new FAQ) shows up without restarting `next dev`. */
const CACHE_FILES = process.env.NODE_ENV === "production";

export function getModels(): ModelsFile {
  if (CACHE_FILES && modelsCache) return modelsCache;
  modelsCache = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "models.json"), "utf8")) as ModelsFile;
  return modelsCache;
}

/** Text to image first, then image to image. */
export function getGenerators(): Generator[] {
  if (CACHE_FILES && cache) return cache;
  cache = SLUGS.map((slug) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${slug}.json`), "utf8")) as Generator);
  return cache;
}

export function getGenerator(slug: string): Generator | undefined {
  return getGenerators().find((generator) => generator.slug === slug);
}

export function generatorPath(generator: Pick<Generator, "slug">): string {
  return `/${generator.slug}`;
}

export function getGeneratorExamples(slug: string): GeneratorExample[] {
  const file = path.join(DATA_DIR, `examples-${slug}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { items?: GeneratorExample[] };
  return (data.items ?? []).filter((item) => item.approved);
}

export function getGeneratorContent(slug: string): SceneContent | undefined {
  const file = path.join(DATA_DIR, `content-${slug}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SceneContent;
}

export function modelName(model: Pick<ImageModel, "name" | "version">): string {
  return `${model.name} ${model.version}`;
}

function collectText(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) if (key !== "url") collectText(item, out);
  }
  return out;
}

/** Words a visitor can read on the page, outside the form. The model table counts because it is on the page. */
export function generatorWordCount(generator: Generator, content: SceneContent | undefined): number {
  const models = getModels().models.map((model) => [modelName(model), model.maker, model.blurb]);
  const text = stripInline(
    collectText([generator.steps, generator.specNotes, generator.faq, models, content]).join(" "),
  );
  return text.split(/\s+/).filter(Boolean).length;
}

/** Why a generator page is not indexable yet. An empty list means it is. Same bars as the maker pages. */
export function generatorIssues(generator: Generator): string[] {
  const issues: string[] = [];
  if (!generator.indexable) issues.push("disabled with indexable=false in the generator file");

  const examples = getGeneratorExamples(generator.slug).length;
  if (examples < MIN_EXAMPLES_TO_INDEX) issues.push(`needs ${MIN_EXAMPLES_TO_INDEX} approved examples (has ${examples})`);
  if (generator.faq.length < MIN_FAQ_TO_INDEX) {
    issues.push(`needs ${MIN_FAQ_TO_INDEX} FAQ entries (has ${generator.faq.length})`);
  }

  const content = getGeneratorContent(generator.slug);
  if (!content) {
    issues.push(`needs a content-${generator.slug}.json file`);
  } else {
    const missing = [
      ["whatYouGet", content.whatYouGet?.length >= 3],
      ["useCases", content.useCases?.length >= 3],
      ["tips", content.tips?.length >= 5],
      ["checklist", content.checklist?.items?.length >= 5],
      ["limits", content.limits?.length >= 3],
    ]
      .filter(([, ok]) => !ok)
      .map(([name]) => name);
    if (missing.length > 0) issues.push(`content is missing or too short: ${missing.join(", ")}`);
  }

  const words = generatorWordCount(generator, content);
  if (words < MIN_WORDS_TO_INDEX) issues.push(`needs ${MIN_WORDS_TO_INDEX} words of page text (has ${words})`);
  return issues;
}

export function isGeneratorIndexable(generator: Generator): boolean {
  return generatorIssues(generator).length === 0;
}

/** Prints which generator pages are held back and why. */
export function logGeneratorIndexability(only?: string): void {
  for (const generator of getGenerators().filter((item) => !only || item.slug === only)) {
    const issues = generatorIssues(generator);
    if (issues.length > 0) console.info(`[seo] ${generator.slug} is noindex: ${issues.join("; ")}`);
  }
}

export function toClientGenerator(generator: Generator): ClientGenerator {
  const { maxPromptLength, defaultModel, models } = getModels();
  return {
    slug: generator.slug,
    mode: generator.mode,
    name: generator.name,
    summary: generator.summary,
    placeholder: generator.placeholder,
    help: generator.help,
    maxPromptLength,
    defaultModel,
    models,
  };
}
