import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { waffoConfigured } from "@/lib/waffo";
import { logReconcile, reconcilePayments } from "@/lib/waffo-reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * Daily reconciliation: Waffo's succeeded payments against the credits granted here; a missing grant is made and
 * logged. Vercel calls it from the schedule in vercel.json and sends `Authorization: Bearer $CRON_SECRET`; any other
 * scheduler can do the same. Without CRON_SECRET the route is closed.
 *
 * Payments younger than 10 minutes are skipped, so it does not race a webhook that is still arriving. It looks back
 * 72 hours by default; `?hours=` changes that (at most 168).
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!waffoConfigured()) return NextResponse.json({ skipped: "waffo not configured" });

  const hours = Math.min(168, Math.max(1, Number(request.nextUrl.searchParams.get("hours")) || 72));
  try {
    const report = await reconcilePayments({ lookbackHours: hours, minAgeMinutes: 10 });
    logReconcile(report, "cron");
    return NextResponse.json({
      hours,
      checked: report.checked,
      settled: report.settled,
      granted: report.granted.length,
      unmatched: report.unmatched.length,
      failed: report.failed.length,
    });
  } catch (e) {
    // A broken reconciliation must not be silent, or it protects nothing.
    console.error("[cron/waffo-reconcile] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Reconcile failed" }, { status: 500 });
  }
}
