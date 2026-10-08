#!/usr/bin/env node
/**
 * Generate before/after examples for Photos-to-spec scenes:
 *   amazon-product-photo, real-estate-listing-photo
 *
 * 1. Generate "before" source images with kie-image text-to-image
 * 2. Upload them to get public URLs
 * 3. Use kie-image image-to-image to generate the "after" result
 * 4. Save both images and write JSON with `before` + `url` fields
 */
import { createHash } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXAMPLES_DIR = path.join(ROOT, "public", "examples");
const DATA_DIR = path.join(ROOT, "src", "data", "scenes");

const CONCURRENCY = 4;

// ---- APIs ----
const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const file = path.resolve(ROOT, "..", "backend", ".env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}
const KIE_TOKEN = readEnv("KIE_API_TOKEN");
if (!KIE_TOKEN) throw new Error("Set KIE_API_TOKEN (env var or backend/.env) before running this script.");

async function kieRequest(method, p, body) {
  const h = { Authorization: `Bearer ${KIE_TOKEN}` };
  if (body) h["Content-Type"] = "application/json";
  const res = await fetch(`${KIE_BASE}${p}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`KIE ${res.status}: ${await res.text()}`);
  return res.json();
}

async function kieGenerate(prompt, ar, model = "gpt-image-2-5-flare-text-to-image") {
  const resp = await kieRequest("POST", "/createTask", { model, input: { prompt, aspect_ratio: ar, resolution: "1K" } });
  if (resp.code !== 200 || !resp.data?.taskId) throw new Error(`KIE create: ${JSON.stringify(resp)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const s = await kieRequest("GET", `/recordInfo?taskId=${resp.data.taskId}`);
    if (s.code !== 200 || !s.data) continue;
    if (s.data.state === "success") { const r = JSON.parse(s.data.resultJson || "{}"); return (r.resultUrls || [])[0]; }
    if (s.data.state === "fail") throw new Error(`KIE: ${s.data.failMsg}`);
  }
  throw new Error("KIE timeout");
}

async function kieI2I(prompt, sourceUrl, ar) {
  const resp = await kieRequest("POST", "/createTask", {
    model: "gpt-image-2-5-flare-image-to-image",
    input: { prompt, aspect_ratio: ar, resolution: "1K", input_urls: [sourceUrl] },
  });
  if (resp.code !== 200 || !resp.data?.taskId) throw new Error(`KIE i2i create: ${JSON.stringify(resp)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const s = await kieRequest("GET", `/recordInfo?taskId=${resp.data.taskId}`);
    if (s.code !== 200 || !s.data) continue;
    if (s.data.state === "success") { const r = JSON.parse(s.data.resultJson || "{}"); return (r.resultUrls || [])[0]; }
    if (s.data.state === "fail") throw new Error(`KIE i2i: ${s.data.failMsg}`);
  }
  throw new Error("KIE i2i timeout");
}

async function uploadFile(filePath) {
  const uploadScript = path.join(process.env.HOME, ".cursor/skills/upload-image/upload.mjs");
  const result = execSync(`node ${JSON.stringify(uploadScript)} ${JSON.stringify(filePath)}`, { encoding: "utf8", timeout: 30000 }).trim();
  return result;
}

function downloadWebp(url, webpPath) {
  const pngPath = webpPath.replace(/\.webp$/, ".png");
  execSync(`curl -4 -sL -o ${JSON.stringify(pngPath)} ${JSON.stringify(url)}`, { timeout: 60000 });
  execSync(`cwebp -q 80 ${JSON.stringify(pngPath)} -o ${JSON.stringify(webpPath)}`, { timeout: 30000, stdio: "pipe" });
  fs.unlinkSync(pngPath);
}

// ---- Scene data ----

const SCENES = {
  "amazon-product-photo": {
    beforeAR: "1:1", afterAR: "1:1",
    w: 800, h: 800,
    items: [
      { beforePrompt: "A photo of a stainless steel insulated water bottle (750ml) sitting on a wooden kitchen counter, next to a fruit bowl and a towel, warm indoor light, phone camera quality, slightly cluttered background",
        afterPrompt: "Create a professional e-commerce photo of Stainless steel insulated water bottle, 750 ml using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.",
        alt: "Product Photo: water bottle, main image" },

      { beforePrompt: "A photo of a matte black ceramic coffee mug on a messy desk with papers and a keyboard visible, fluorescent office lighting, casual phone photo quality",
        afterPrompt: "Create a professional e-commerce photo of Matte black ceramic coffee mug, 12 oz using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.",
        alt: "Product Photo: coffee mug, main image" },

      { beforePrompt: "A photo of a pair of white wireless earbuds in their charging case, placed on a bed sheet, natural daylight from a window, casual product shot, phone camera quality",
        afterPrompt: "Create a professional e-commerce photo of Wireless earbuds with charging case using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.",
        alt: "Product Photo: wireless earbuds, main image" },

      { beforePrompt: "A photo of a small green succulent plant in a white ceramic pot, placed on a bathroom shelf next to toiletries, soft indoor light, phone camera quality, cluttered scene",
        afterPrompt: "Create a professional e-commerce photo of Small succulent plant in white ceramic pot using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nLifestyle image: the product in a realistic, tasteful everyday setting where it would naturally be used, soft natural light, shallow depth of field, the product is the clear hero and fully visible, no text.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.",
        alt: "Product Photo: succulent plant, lifestyle" },

      { beforePrompt: "A photo of brown leather wallet on a wooden table, slightly worn, next to keys and loose change, warm afternoon light from a window, casual phone photo quality",
        afterPrompt: "Create a professional e-commerce photo of Full-grain leather bifold wallet using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nDetail image: a close-up that highlights the product's materials, texture and craftsmanship on a clean light backdrop, macro lens look, no text.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.",
        alt: "Product Photo: leather wallet, detail" },
    ],
  },

  "real-estate-listing-photo": {
    beforeAR: "4:3", afterAR: "4:3",
    w: 800, h: 600,
    items: [
      { beforePrompt: "A real phone photo of a moderately messy living room with a grey sofa, coffee table with magazines and remote controls scattered, a lamp that's off, daylight through windows but underexposed, slightly tilted angle, toys on the floor, typical home listing photo taken by an agent with their phone",
        afterPrompt: "Edit this for a property listing.\nEnhance it like a professional real estate photograph: bright, balanced exposure, straightened vertical lines, clean neutral white balance, crisp detail, a pleasant blue sky visible through windows or outdoors. Do not add, remove or change any furniture, fixtures or architecture.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.",
        alt: "Real Estate: living room, enhanced" },

      { beforePrompt: "A phone photo of a cluttered kitchen with dishes in the sink, towels on the counter, a fruit bowl, notes on the fridge, kids drawings on the wall, warm overhead light but slightly dark corners, typical agent phone photo quality",
        afterPrompt: "Edit this for a property listing.\nRemove clutter and personal items such as loose papers, cables, toiletries, toys, fridge magnets and laundry, while keeping all furniture, fixtures, walls, floors and architecture exactly the same. Then enhance exposure and white balance like a professional listing photo.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.",
        alt: "Real Estate: kitchen, decluttered" },

      { beforePrompt: "A phone photo of an empty bedroom with hardwood floors, white walls, a large window with basic blinds, a closet door ajar, bare walls, no furniture at all, standard phone camera quality, slightly dark",
        afterPrompt: "Edit this for a property listing.\nVirtually stage this empty or sparsely furnished room with tasteful, realistic, modern furniture and decor that suits the room type, correctly scaled and lit to match the room. Keep the walls, windows, floors, doors and all architecture exactly the same.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.",
        alt: "Real Estate: bedroom, virtually staged" },

      { beforePrompt: "A phone photo of a colonial-style house exterior during daytime, front yard with a lawn and trees, bright midday sun creating harsh shadows, blue sky, a car in the driveway, typical real estate agent phone photo",
        afterPrompt: "Edit this for a property listing.\nConvert this exterior photo into a virtual twilight shot: deep blue dusk sky with a soft warm glow on the horizon, warm interior lights glowing through the windows and exterior lights on. Keep the building, landscaping and architecture exactly the same.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.",
        alt: "Real Estate: exterior, twilight conversion" },

      { beforePrompt: "A phone photo of a bathroom with a white vanity, mirror, toilet, and shower with glass door, some toiletries on the counter, towels hanging unevenly, moderate lighting, phone camera quality",
        afterPrompt: "Edit this for a property listing.\nRemove clutter and personal items such as loose papers, cables, toiletries, toys, fridge magnets and laundry, while keeping all furniture, fixtures, walls, floors and architecture exactly the same. Then enhance exposure and white balance like a professional listing photo.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.",
        alt: "Real Estate: bathroom, decluttered" },
    ],
  },
};

// ---- Pipeline: generate before → upload → i2i → save both ----

async function processOne(slug, index, item, config) {
  const tag = `${slug}[${index}]`;
  console.log(`[START] ${tag}`);
  try {
    // Step 1: Generate "before" image
    console.log(`  [${tag}] Generating source image...`);
    const beforeUrl = await kieGenerate(item.beforePrompt, config.beforeAR);
    if (!beforeUrl) throw new Error("No before URL");

    // Step 2: Download before image and upload for public URL
    const ts = Date.now();
    const beforePng = path.join(EXAMPLES_DIR, `${slug}_before_${ts}_${index}.png`);
    const beforeWebp = path.join(EXAMPLES_DIR, `${slug}_before_${ts}_${index}.webp`);
    execSync(`curl -4 -sL -o ${JSON.stringify(beforePng)} ${JSON.stringify(beforeUrl)}`, { timeout: 60000 });
    execSync(`cwebp -q 80 ${JSON.stringify(beforePng)} -o ${JSON.stringify(beforeWebp)}`, { timeout: 30000, stdio: "pipe" });

    // Step 3: Upload before image to get public URL for i2i
    console.log(`  [${tag}] Uploading source for i2i...`);
    const publicUrl = await uploadFile(beforePng);
    fs.unlinkSync(beforePng);

    // Step 4: Generate "after" using image-to-image
    console.log(`  [${tag}] Generating result via i2i...`);
    const afterUrl = await kieI2I(item.afterPrompt, publicUrl, config.afterAR);
    if (!afterUrl) throw new Error("No after URL");

    // Step 5: Download after image
    const afterWebp = path.join(EXAMPLES_DIR, `${slug}_after_${ts}_${index}.webp`);
    downloadWebp(afterUrl, afterWebp);

    console.log(`[DONE] ${tag}`);
    return {
      slug, index,
      result: {
        url: `/examples/${slug}_after_${ts}_${index}.webp`,
        before: `/examples/${slug}_before_${ts}_${index}.webp`,
        alt: item.alt,
        width: config.w,
        height: config.h,
        approved: true,
      },
    };
  } catch (err) {
    console.error(`[FAIL] ${tag}: ${err.message}`);
    return { slug, index, result: null };
  }
}

async function main() {
  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });

  const tasks = [];
  for (const [slug, config] of Object.entries(SCENES)) {
    for (let i = 0; i < config.items.length; i++) {
      tasks.push({ slug, index: i, item: config.items[i], config });
    }
  }

  console.log(`Total: ${tasks.length} photo tasks, concurrency: ${CONCURRENCY}`);

  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const t = tasks[idx++];
      results.push(await processOne(t.slug, t.index, t.item, t.config));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const bySlug = {};
  for (const r of results) { if (r.result) (bySlug[r.slug] ??= []).push(r); }

  for (const [slug, items] of Object.entries(bySlug)) {
    const jsonPath = path.join(DATA_DIR, `examples-${slug}.json`);
    const data = { items: items.sort((a, b) => a.index - b.index).map(i => i.result) };
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`Wrote ${jsonPath}: ${data.items.length} items`);
  }

  const failed = results.filter(r => !r.result);
  if (failed.length) { console.log(`\n${failed.length} failed:`); failed.forEach(f => console.log(`  - ${f.slug}[${f.index}]`)); }
  console.log(`\nDone! ${results.length - failed.length}/${results.length} succeeded.`);
}

main().catch(console.error);
