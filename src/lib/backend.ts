import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { Envelope } from "./types";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8040").replace(/\/$/, "");
const SERVICE_SECRET = process.env.SERVICE_SECRET ?? "";

export const SESSION_COOKIE = "pc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180;

interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
}

const WEAK_SECRET = SERVICE_SECRET.length < 32 || SERVICE_SECRET.toLowerCase().startsWith("change-me");

export async function callBackend<T>(path: string, options: CallOptions = {}): Promise<Envelope<T>> {
  if (process.env.NODE_ENV === "production" && WEAK_SECRET) {
    console.error("SERVICE_SECRET is missing or weak. Set a random value of at least 32 characters.");
    return { code: 503, message: "PiCraft is temporarily unavailable. Please try again.", data: null };
  }
  const headers: Record<string, string> = { "X-Service-Secret": SERVICE_SECRET };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["X-Session-Token"] = options.token;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    return { code: 503, message: "PiCraft is temporarily unavailable. Please try again.", data: null };
  }

  if (res.status === 401) return { code: 401, message: "Your session expired. Please refresh the page.", data: null };
  if (!res.ok) return { code: res.status, message: "Something went wrong. Please try again.", data: null };
  return (await res.json()) as Envelope<T>;
}

/** True when the backend and its database answer within five seconds. Used by the uptime probe. */
export async function backendIsReady(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health/ready`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionToken(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionToken(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Forwards an authenticated request to the backend and relays its envelope. */
export async function proxy(path: string, options: Omit<CallOptions, "token"> = {}): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ code: 401, message: "Your session expired. Please refresh the page.", data: null });
  }
  const result = await callBackend(path, { ...options, token });
  if (result.code === 401) await clearSessionToken();
  return NextResponse.json(result);
}
