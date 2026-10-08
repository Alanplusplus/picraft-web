import "server-only";

import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

/** Size of every Open Graph and Twitter share image. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  ink950: "#0f1115",
  ink700: "#3d424c",
  brand700: "#c23314",
  brand50: "#fff4f0",
};

const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const cache = new Map<string, string>();

/** Reads an image from public/images and returns it as a PNG data URI, which the share-image renderer accepts. */
export async function imageDataUri(relativePath: string, width: number): Promise<string> {
  const key = `${relativePath}@${width}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const file = path.join(IMAGES_DIR, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing share-image source: ${file}`);
  const png = await sharp(file).resize({ width }).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  cache.set(key, uri);
  return uri;
}
