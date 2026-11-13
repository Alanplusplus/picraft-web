import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * Daily IndexNow submission: the sitemap URLs whose `lastModified` falls in the last two days (new pages and
 * pages whose text really changed). `?days=` widens the window (at most 30) and `?all=1` sends every URL, for
 * example after the key was set up. Vercel calls it from the schedule in vercel.json with
 * `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET the route is closed, like the Waffo reconcile route.
 *
 * Pages without a real date (pricing, about, contact) are only sent with `?all=1`.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = request.nextUrl.searchParams.get("all") === "1";
  const days = Math.min(30, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 2));
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const urls = sitemap()
    .filter((entry) => all || (entry.lastModified !== undefined && new Date(entry.lastModified).getTime() >= since))
    .map((entry) => entry.url);

  try {
    const result = await submitToIndexNow(urls);
    const ok = result.status === 200 || result.status === 202;
    if (!ok) console.error(`[cron/indexnow] IndexNow answered ${result.status} for ${urls.length} URLs`);
    return NextResponse.json({ all, days, candidates: urls.length, status: result.status }, { status: ok ? 200 : 502 });
  } catch (e) {
    console.error("[cron/indexnow] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Submission failed" }, { status: 502 });
  }
}
