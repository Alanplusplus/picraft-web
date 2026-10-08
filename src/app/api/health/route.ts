import { NextResponse } from "next/server";

import { backendIsReady } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Point the uptime monitor here. It answers 200 only when the web app, the API and the database all respond. */
export async function GET() {
  const ready = await backendIsReady();
  return NextResponse.json({ status: ready ? "ok" : "unavailable" }, { status: ready ? 200 : 503 });
}
