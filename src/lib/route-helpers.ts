import "server-only";

import { NextResponse } from "next/server";

import { SITE_URL } from "./site";

/** An answer in the same envelope the browser client reads for every other route (always HTTP 200). */
export function reply<T>(code: number, message: string, data: T | null = null) {
  return NextResponse.json({ code, message, data }, { headers: { "Cache-Control": "no-store" } });
}

/** The visitor's IP as the platform reports it, for rate limits. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip")) || "unknown";
}

/**
 * The origin to build absolute links and redirects with. In production it is the public site address, because the
 * request URL can carry an internal host behind a proxy; in development it is whatever the browser used.
 */
export function siteOrigin(request: { nextUrl: { origin: string } }): string {
  return process.env.NODE_ENV === "production" ? SITE_URL : request.nextUrl.origin;
}

/** Only a path on this site may be a return address, so it cannot be used as an open redirect. */
export function safeReturnPath(input: unknown, fallback = "/pricing"): string {
  if (typeof input !== "string" || !input.startsWith("/") || input.startsWith("//") || input.includes("\\")) {
    return fallback;
  }
  return input.split(/[?#]/)[0].slice(0, 200) || fallback;
}
