import { NextRequest, NextResponse } from "next/server";

import { verifyAccountToken } from "@/lib/account-token";
import { callBackend, setSessionToken } from "@/lib/backend";
import { siteOrigin } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The link in the restore email. A valid token proves the visitor can read the buyer's mailbox, so the browser gets
 * the session of the account that paid with that address, then lands on /pricing with the outcome in the address
 * (`?restore=ok`, `none` or `expired`).
 */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const back = (outcome: string) => NextResponse.redirect(`${origin}/pricing?restore=${outcome}`, 303);

  const email = verifyAccountToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!email) return back("expired");

  const res = await callBackend<{ token: string }>("/v1/internal/accounts/restore", { method: "POST", body: { email } });
  if (res.code !== 200 || !res.data) return back("none");

  await setSessionToken(res.data.token);
  return back("ok");
}
