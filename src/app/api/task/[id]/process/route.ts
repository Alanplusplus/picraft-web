import { NextResponse } from "next/server";

import { proxy } from "@/lib/backend";

/** An edit of a finished design that costs credits: upscale 2x or 4x, or cut out the subject. */
export async function POST(request: Request, ctx: RouteContext<"/api/task/[id]/process">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { op?: unknown; file?: unknown } | null;
  if (typeof body?.op !== "string") return NextResponse.json({ code: 400, message: "Missing edit.", data: null });
  return proxy(`/v1/tasks/${encodeURIComponent(id)}/process`, {
    method: "POST",
    body: { op: body.op, file: typeof body.file === "string" ? body.file : null },
  });
}
