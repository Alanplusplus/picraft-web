import {
  generatorPath,
  getGenerators,
  getModels,
  isGeneratorIndexable,
  modelName,
} from "@/lib/generators";
import { getGuides, guidePath, isGuideIndexable } from "@/lib/guides";
import { CREDIT_PACKS, formatPrice, SUBSCRIPTION_PLANS, planPriceLabel } from "@/lib/pricing";
import { getScenesByCategory, isIndexable } from "@/lib/scenes";
import {
  absoluteUrl,
  CATEGORIES,
  categoryPath,
  FILE_RETENTION_DAYS,
  MIN_AGE,
  MODEL_DISCLOSURE,
  SITE_NAME,
  SUPPORT_EMAIL,
  UPLOAD_RETENTION_DAYS,
} from "@/lib/site";
import { getTools, isToolIndexable, toolPath } from "@/lib/tools";

/** Keeps a list item on one line. */
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const link = (name: string, path: string, note?: string) =>
  `- [${clean(name)}](${absoluteUrl(path)})${note ? `: ${clean(note)}` : ""}`;

/**
 * The text of /llms.txt, in the format of llmstxt.org: a title, a short summary, then lists of the pages worth
 * reading. It is built from the same data as the sitemap and leaves out the pages held back from the index, so it
 * never points at something the site does not want found, and it needs no upkeep when a page is added.
 *
 * Every number in it comes from a file the site already uses (prices, credits, retention, models), so it cannot
 * disagree with the pages. The only measured figures are the generation times, taken from production runs.
 */
export function buildLlmsTxt(): string {
  const models = getModels().models;
  const generators = getGenerators().filter(isGeneratorIndexable);
  const sizeGuides = getGuides("size").filter(isGuideIndexable);
  const posts = getGuides("blog").filter(isGuideIndexable);
  const tools = getTools().filter(isToolIndexable);

  const lines: string[] = [];
  const add = (...parts: string[]) => lines.push(...parts);

  add(
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is a website of AI image tools for specific jobs. It has two general image generators, text to image and image to image, and makers that turn a photo or a few details into a file with the right size and format for a thumbnail, a listing photo, an invitation, a sticker or a print-on-demand shirt. It works in the browser with no account.`,
    "",
    `The images are made by ${MODEL_DISCLOSURE}. ${SITE_NAME} is an independent site and is not affiliated with either company.`,
    "",
    "## Facts",
    "",
    `- Start: every visitor gets free credits and needs no account. More credits are bought on ${absoluteUrl("/pricing")}.`,
    `- Price: ${CREDIT_PACKS.map((pack) => `${pack.name} ${pack.credits} credits for ${formatPrice(pack.priceCents)} (one payment, never expire)`).join("; ")}. Subscriptions: ${SUBSCRIPTION_PLANS.map((plan) => `${plan.name} ${plan.credits} credits, ${planPriceLabel(plan)}`).join("; ")}.`,
    `- Credits per image: ${models
      .map(
        (model) =>
          `${modelName(model)} costs ${Object.entries(model.credits)
            .map(([resolution, credits]) => `${credits} at ${resolution}`)
            .join(", ")}${
            model.animation
              ? ` (an animated GIF: ${Object.entries(model.animation.credits)
                  .map(([frames, credits]) => `${credits} for ${frames} frames`)
                  .join(", ")})`
              : ""
          }`,
      )
      .join("; ")}.`,
    `- A generation that fails is refunded automatically. Prompts are checked by an automated safety check first; a request it stops makes no image and uses no credit.`,
    `- Time: at 1K an image usually takes 10 to 35 seconds with any model (measured on the live site in November 2026); 2K and 4K take longer.`,
    `- Files: generated files are kept for ${FILE_RETENTION_DAYS} days, uploaded reference photos for ${UPLOAD_RETENTION_DAYS} days. Users must be ${MIN_AGE} or older.`,
    `- Models: ${models.map((model) => `${modelName(model)} (${model.maker}): ${model.blurb}`).join(" ")}`,
    `- Contact: ${SUPPORT_EMAIL}`,
    "",
  );

  if (generators.length) {
    add("## Image generators", "");
    for (const generator of generators) add(link(generator.seo.h1, generatorPath(generator), generator.summary));
    add("");
  }

  add("## Makers", "", "Each maker turns a photo or a few details into a file at the exact size and format a place asks for.", "");
  for (const category of CATEGORIES) {
    const scenes = getScenesByCategory(category.id).filter(isIndexable);
    if (!scenes.length) continue;
    add(`### ${category.name}`, "", link(`${category.name}: all makers`, categoryPath(category.id), category.description));
    for (const scene of scenes) add(link(scene.seo.h1, `/create/${scene.slug}`, scene.summary));
    add("");
  }

  if (sizeGuides.length) {
    add("## Size guides", "", "The exact pixel sizes, file limits and rules of a platform, with sources.", "");
    for (const guide of sizeGuides) add(link(guide.h1, guidePath(guide), guide.summary));
    add("");
  }

  if (tools.length) {
    add("## Free tools", "", "Run in the browser, no credits needed.", "");
    for (const tool of tools) add(link(tool.h1, toolPath(tool), tool.summary));
    add("");
  }

  if (posts.length) {
    add("## Guides", "");
    for (const post of posts) add(link(post.h1, guidePath(post), post.summary));
    add("");
  }

  add(
    "## Optional",
    "",
    link("Pricing and credits", "/pricing"),
    link("About", "/about"),
    link("Acceptable use policy", "/aup"),
    link("Terms", "/terms"),
    link("Privacy", "/privacy"),
    link("Sitemap", "/sitemap.xml"),
    "",
  );

  return lines.join("\n");
}
