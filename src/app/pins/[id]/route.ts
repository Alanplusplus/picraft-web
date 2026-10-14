import type { NextRequest } from "next/server";
import sharp from "sharp";

import { getAllPins, pinSourceFile, type PinItem } from "@/lib/pinterest";

/**
 * Pin images for the Pinterest RSS feeds, rendered once at build time. Pinterest recommends a 2:3
 * image and may cut off taller ones, so a 9:16 example is trimmed to 2:3 around its center; shapes
 * between 1:1 and 2:3 are only resized. The source examples are WebP, which the feed converts to JPEG.
 */
export const dynamicParams = false;

let byId: Map<string, PinItem> | null = null;

function pins(): Map<string, PinItem> {
  if (!byId) byId = new Map(getAllPins().map((pin) => [pin.id, pin]));
  return byId;
}

export function generateStaticParams() {
  return [...pins().keys()].map((id) => ({ id }));
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/pins/[id]">) {
  const { id } = await ctx.params;
  const pin = pins().get(id);
  if (!pin) return new Response("Not found", { status: 404 });

  const image = await sharp(pinSourceFile(pin))
    .resize({ width: pin.width, height: pin.height, fit: "cover", position: "centre" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // The id is a hash of the example URL, and example URLs change whenever the image does.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
