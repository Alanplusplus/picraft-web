import { NextResponse } from "next/server";

import { proxy } from "@/lib/backend";

const MAX_BASE64_LENGTH = 17 * 1024 * 1024;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { image_base64?: string };
  if (!body.image_base64 || body.image_base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ code: 400, message: "Please upload an image up to 12 MB.", data: null });
  }
  return proxy("/v1/uploads", { method: "POST", body: { image_base64: body.image_base64 } });
}
