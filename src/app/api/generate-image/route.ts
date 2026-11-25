import { NextResponse } from "next/server";

import { getSessionToken, proxy } from "@/lib/backend";
import { sanitizeGaIds } from "@/lib/ga-ids";
import { screenPrompt } from "@/lib/moderation";
import { clientIp } from "@/lib/route-helpers";
import type { ImageRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as (Partial<ImageRequest> & { ga?: unknown }) | null;
  if (!body?.mode) return NextResponse.json({ code: 400, message: "Missing generator.", data: null });

  // Waffo Prompt Sift looks at the prompt before it reaches a model or costs a credit.
  const token = await getSessionToken();
  if (token && typeof body.prompt === "string") {
    const screened = await screenPrompt(body.prompt.slice(0, 10_000), {
      token,
      ip: clientIp(request),
      scene: body.mode === "image" ? "image-to-image" : "text-to-image",
    });
    if (!screened.ok) return NextResponse.json({ code: screened.code, message: screened.message, data: screened.data });
  }
  return proxy("/v1/image-generations", {
    method: "POST",
    body: {
      mode: body.mode,
      prompt: body.prompt ?? "",
      model: body.model ?? "",
      aspect_ratio: body.aspect_ratio ?? "auto",
      resolution: body.resolution ?? "1K",
      images: Array.isArray(body.images) ? body.images.filter((url) => typeof url === "string").slice(0, 16) : [],
      transparent: body.transparent === true,
      animation:
        body.animation && typeof body.animation === "object"
          ? { frames: Number(body.animation.frames), speed: String(body.animation.speed ?? "normal") }
          : null,
      ga: sanitizeGaIds(body.ga),
    },
  });
}
