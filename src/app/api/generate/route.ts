import { NextResponse } from "next/server";

import { getSessionToken, proxy } from "@/lib/backend";
import { collectSceneText, screenPrompt } from "@/lib/moderation";
import { clientIp } from "@/lib/route-helpers";
import { getScene } from "@/lib/scenes";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    scene?: string;
    fields?: Record<string, string>;
    images?: Record<string, string>;
  } | null;
  if (!body?.scene) return NextResponse.json({ code: 400, message: "Missing scene.", data: null });

  // Waffo Prompt Sift looks at what the visitor typed before anything reaches the models or costs a credit.
  const token = await getSessionToken();
  if (token) {
    const screened = await screenPrompt(collectSceneText(getScene(body.scene), body.fields), {
      token,
      ip: clientIp(request),
      scene: body.scene,
    });
    if (!screened.ok) return NextResponse.json({ code: screened.code, message: screened.message, data: null });
  }
  return proxy("/v1/generations", {
    method: "POST",
    body: { scene: body.scene, fields: body.fields ?? {}, images: body.images ?? {} },
  });
}
