#!/usr/bin/env node
/**
 * Phase 2: Upload existing "before" images and run image-to-image to generate "after" results.
 * Before images were already generated and saved as webp+png in examples/.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXAMPLES_DIR = path.join(ROOT, "public", "examples");
const DATA_DIR = path.join(ROOT, "src", "data", "scenes");
const UPLOAD_SCRIPT = path.join(process.env.HOME, ".cursor/skills/upload-image/upload.mjs");

const CONCURRENCY = 3;

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

function downloadWebp(url, webpPath) {
  const pngPath = webpPath.replace(/\.webp$/, ".png");
  execSync(`curl -4 -sL -o ${JSON.stringify(pngPath)} ${JSON.stringify(url)}`, { timeout: 60000 });
  execSync(`cwebp -q 80 ${JSON.stringify(pngPath)} -o ${JSON.stringify(webpPath)}`, { timeout: 30000, stdio: "pipe" });
  fs.unlinkSync(pngPath);
}

async function uploadFile(filePath) {
  const result = execSync(`node ${JSON.stringify(UPLOAD_SCRIPT)} ${JSON.stringify(filePath)}`, { encoding: "utf8", timeout: 60000 }).trim();
  return result;
}

// Map of before files we found, keyed by slug_index
function findBeforeFiles() {
  const files = fs.readdirSync(EXAMPLES_DIR);
  const map = {};
  for (const f of files) {
    const m = f.match(/^(.+?)_before_(\d+)_(\d+)\.png$/);
    if (m) {
      const [, slug, ts, idx] = m;
      map[`${slug}_${idx}`] = { slug, index: parseInt(idx), ts, pngPath: path.join(EXAMPLES_DIR, f), webpPath: path.join(EXAMPLES_DIR, f.replace(".png", ".webp")) };
    }
  }
  return map;
}

// After prompts for each scene/index
const AFTER_PROMPTS = {
  "amazon-product-photo": {
    0: { ar: "1:1", prompt: "Create a professional e-commerce photo of Stainless steel insulated water bottle, 750 ml using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.", alt: "Product Photo: water bottle, main image", w: 800, h: 800 },
    1: { ar: "1:1", prompt: "Create a professional e-commerce photo of Matte black ceramic coffee mug, 12 oz using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.", alt: "Product Photo: coffee mug, main image", w: 800, h: 800 },
    2: { ar: "1:1", prompt: "Create a professional e-commerce photo of Wireless earbuds with charging case using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nAmazon main image: the product alone, centered on a pure white background, filling about 85% of the frame, soft even studio lighting, only a very subtle natural contact shadow, no props, no added text, no added logos.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.", alt: "Product Photo: wireless earbuds, main image", w: 800, h: 800 },
    3: { ar: "1:1", prompt: "Create a professional e-commerce photo of Small succulent plant in white ceramic pot using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nLifestyle image: the product in a realistic, tasteful everyday setting where it would naturally be used, soft natural light, shallow depth of field, the product is the clear hero and fully visible, no text.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.", alt: "Product Photo: succulent plant, lifestyle", w: 800, h: 800 },
    4: { ar: "1:1", prompt: "Create a professional e-commerce photo of Full-grain leather bifold wallet using this image.\nKeep the product exactly as it is: same shape, proportions, colors, materials, labels, printed text and logos. Do not redesign it, add parts or remove parts.\nDetail image: a close-up that highlights the product's materials, texture and craftsmanship on a clean light backdrop, macro lens look, no text.\nPhotorealistic commercial product photography, sharp focus across the whole product, accurate color, high resolution. No watermark.", alt: "Product Photo: leather wallet, detail", w: 800, h: 800 },
  },
  "real-estate-listing-photo": {
    0: { ar: "4:3", prompt: "Edit this for a property listing.\nEnhance it like a professional real estate photograph: bright, balanced exposure, straightened vertical lines, clean neutral white balance, crisp detail, a pleasant blue sky visible through windows or outdoors. Do not add, remove or change any furniture, fixtures or architecture.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.", alt: "Real Estate: living room, enhanced", w: 800, h: 600 },
    1: { ar: "4:3", prompt: "Edit this for a property listing.\nRemove clutter and personal items such as loose papers, cables, toiletries, toys, fridge magnets and laundry, while keeping all furniture, fixtures, walls, floors and architecture exactly the same. Then enhance exposure and white balance like a professional listing photo.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.", alt: "Real Estate: kitchen, decluttered", w: 800, h: 600 },
    2: { ar: "4:3", prompt: "Edit this for a property listing.\nVirtually stage this empty or sparsely furnished room with tasteful, realistic, modern furniture and decor that suits the room type, correctly scaled and lit to match the room. Keep the walls, windows, floors, doors and all architecture exactly the same.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.", alt: "Real Estate: bedroom, virtually staged", w: 800, h: 600 },
    3: { ar: "4:3", prompt: "Edit this for a property listing.\nConvert this exterior photo into a virtual twilight shot: deep blue dusk sky with a soft warm glow on the horizon, warm interior lights glowing through the windows and exterior lights on. Keep the building, landscaping and architecture exactly the same.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.", alt: "Real Estate: exterior, twilight conversion", w: 800, h: 600 },
    4: { ar: "4:3", prompt: "Edit this for a property listing.\nRemove clutter and personal items such as loose papers, cables, toiletries, toys, fridge magnets and laundry, while keeping all furniture, fixtures, walls, floors and architecture exactly the same. Then enhance exposure and white balance like a professional listing photo.\nPhotorealistic, natural real estate photography look with a wide-angle feel. No people, no text, no watermark.", alt: "Real Estate: bathroom, decluttered", w: 800, h: 600 },
  },
};

async function processOne(beforeInfo, afterConfig) {
  const tag = `${beforeInfo.slug}[${beforeInfo.index}]`;
  console.log(`[START] ${tag}`);
  try {
    console.log(`  [${tag}] Uploading source...`);
    const publicUrl = await uploadFile(beforeInfo.pngPath);
    console.log(`  [${tag}] Source uploaded: ${publicUrl.slice(0, 60)}...`);

    console.log(`  [${tag}] Running i2i...`);
    const afterUrl = await kieI2I(afterConfig.prompt, publicUrl, afterConfig.ar);
    if (!afterUrl) throw new Error("No after URL");

    const afterFilename = `${beforeInfo.slug}_after_${beforeInfo.ts}_${beforeInfo.index}`;
    const afterWebp = path.join(EXAMPLES_DIR, `${afterFilename}.webp`);
    downloadWebp(afterUrl, afterWebp);

    const beforeWebpName = path.basename(beforeInfo.webpPath);
    console.log(`[DONE] ${tag}`);
    return {
      slug: beforeInfo.slug,
      index: beforeInfo.index,
      result: {
        url: `/examples/${afterFilename}.webp`,
        before: `/examples/${beforeWebpName}`,
        alt: afterConfig.alt,
        width: afterConfig.w,
        height: afterConfig.h,
        approved: true,
      },
    };
  } catch (err) {
    console.error(`[FAIL] ${tag}: ${err.message}`);
    return { slug: beforeInfo.slug, index: beforeInfo.index, result: null };
  }
}

async function main() {
  const beforeFiles = findBeforeFiles();
  console.log(`Found ${Object.keys(beforeFiles).length} before images`);

  const tasks = [];
  for (const [key, beforeInfo] of Object.entries(beforeFiles)) {
    const scenePrompts = AFTER_PROMPTS[beforeInfo.slug];
    if (!scenePrompts || !scenePrompts[beforeInfo.index]) {
      console.log(`Skip ${key}: no after prompt`);
      continue;
    }
    tasks.push({ beforeInfo, afterConfig: scenePrompts[beforeInfo.index] });
  }
  tasks.sort((a, b) => `${a.beforeInfo.slug}_${a.beforeInfo.index}`.localeCompare(`${b.beforeInfo.slug}_${b.beforeInfo.index}`));

  console.log(`Total: ${tasks.length} i2i tasks, concurrency: ${CONCURRENCY}`);

  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const t = tasks[idx++];
      results.push(await processOne(t.beforeInfo, t.afterConfig));
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
