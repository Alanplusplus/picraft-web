#!/usr/bin/env node
/**
 * Make one original Pinterest pin image (2:3) and save the original file, unchanged, to /tmp/pins/<id>.<png|jpg>.
 * Usage: node scripts/gen-pin.mjs <job.json>
 * The job file is a JSON object: { "id": "kebab-case-id", "prompt": "...", "resolution": "1K" | "2K" }; default 1K (flare model).
 * Keep the job file outside the repo (for example in /tmp). The image is never resized or re-encoded, so
 * Pinterest gets the full-quality original. After it looks right, upload it with backend/scripts/upload_pin_images.py
 * and add an entry with kind "image" (and the printed width and height) to src/data/pins/daily.json.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = "/tmp/pins";
const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
const MODEL = "gpt-image-2-5-flare-text-to-image";

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const file = path.resolve(ROOT, "..", "backend", ".env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

const token = readEnv("KIE_API_TOKEN");
if (!token) throw new Error("Set KIE_API_TOKEN (env var or backend/.env) before running this script.");

async function kie(method, p, body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${KIE_BASE}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`KIE ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generate(prompt, resolution) {
  const created = await kie("POST", "/createTask", {
    model: MODEL,
    input: { prompt, aspect_ratio: "2:3", resolution },
  });
  if (created.code !== 200 || !created.data?.taskId) throw new Error(`KIE create: ${JSON.stringify(created)}`);
  for (let i = 0; i < 60; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const status = await kie("GET", `/recordInfo?taskId=${created.data.taskId}`);
    if (status.code !== 200 || !status.data) continue;
    if (status.data.state === "success") return (JSON.parse(status.data.resultJson || "{}").resultUrls || [])[0];
    if (status.data.state === "fail") throw new Error(`KIE: ${status.data.failMsg}`);
  }
  throw new Error("KIE timeout");
}

const jobFile = process.argv[2];
if (!jobFile) throw new Error("Usage: node scripts/gen-pin.mjs <job.json>");
const job = JSON.parse(fs.readFileSync(jobFile, "utf8"));
if (!/^[a-z0-9-]+$/.test(job.id ?? "")) throw new Error("job.id must use a-z, 0-9 and -");
if (!job.prompt) throw new Error("job.prompt is required");

fs.mkdirSync(OUT_DIR, { recursive: true });
const url = await generate(job.prompt, job.resolution ?? "1K");
if (!url) throw new Error("No image URL returned");
const raw = path.join(OUT_DIR, `${job.id}.download`);
execSync(`curl -4 -sL -o ${JSON.stringify(raw)} ${JSON.stringify(url)}`, { timeout: 90000 });
const meta = await sharp(raw).metadata();
if (meta.format !== "png" && meta.format !== "jpeg") throw new Error(`Unexpected image format: ${meta.format}`);
const out = path.join(OUT_DIR, `${job.id}.${meta.format === "png" ? "png" : "jpg"}`);
fs.renameSync(raw, out);
console.log(`Wrote ${out} (${meta.format}, width ${meta.width}, height ${meta.height})`);
