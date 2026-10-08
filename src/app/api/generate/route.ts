import { NextResponse } from "next/server";

import { proxy } from "@/lib/backend";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    scene?: string;
    fields?: Record<string, string>;
    images?: Record<string, string>;
  } | null;
  if (!body?.scene) return NextResponse.json({ code: 400, message: "Missing scene.", data: null });
  return proxy("/v1/generations", {
    method: "POST",
    body: { scene: body.scene, fields: body.fields ?? {}, images: body.images ?? {} },
  });
}
