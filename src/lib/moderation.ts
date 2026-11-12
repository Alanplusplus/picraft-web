import "server-only";

import crypto from "node:crypto";

import { ScanSemanticMode } from "@waffo/pancake-ts";
import { after } from "next/server";

import { callBackend } from "./backend";
import { rateLimited } from "./server-rate-limit";
import type { Scene } from "./scenes";
import { getClient, siftConfigured } from "./waffo";

/**
 * Prompt check before a generation: Waffo Prompt Sift (`contentSafety.scanPrompt` of the official SDK).
 *
 * Every piece of text a visitor writes (a maker's text fields, the prompt of the text to image and image to image
 * generators) is sent to Prompt Sift before the request goes to the backend. Only `allow` lets it through:
 *
 * - `block`   nothing is generated, no credit is used, the visitor is asked to change the wording;
 * - `review`  Waffo wants a closer look (usually settled within the hour); treated like a block for this request;
 * - `service_degraded`, a timeout, a 4xx/5xx or a rate limit: the check could not decide. Waffo's rule is that
 *   nothing is generated without a verdict, so after two retries the request is refused with "try again in a
 *   minute". Set PROMPT_SIFT_FAIL_OPEN=true to let such requests through instead (not recommended).
 *
 * Without WAFFO_MERCHANT_ID and WAFFO_PRIVATE_KEY the check is skipped; the image models' own safety systems still
 * apply. Prompt Sift is the only check PiCraft runs itself. Only the verdict is reported to the backend
 * (moderation_events), never the text. Prompt Sift itself keeps no copy of the text. The check allows 100 requests a
 * minute for the whole merchant, so each session and each address gets a smaller share.
 */

export const BLOCKED_MESSAGE =
  "This request doesn't meet our Acceptable Use Policy, so nothing was generated and no credit was used. Please change your text and try again.";
const REVIEW_MESSAGE =
  "This request needs a closer look before it can be made, so nothing was generated and no credit was used. Please reword it or try again later.";
const UNAVAILABLE_MESSAGE =
  "Our safety check isn't available right now, so nothing was generated and no credit was used. Please try again in a minute.";
const RATE_MESSAGE = "Too many requests. Please wait a moment and try again.";

export type ScreenResult = { ok: true } | { ok: false; code: 422 | 429 | 503; message: string };

/** The text a visitor typed into a maker: only text and textarea fields count, a menu choice is not free text. */
export function collectSceneText(scene: Scene | undefined, fields: Record<string, string> | undefined): string {
  if (!scene || !fields) return "";
  const parts: string[] = [];
  for (const field of scene.fields) {
    if (field.type !== "text" && field.type !== "textarea") continue;
    const value = fields[field.key];
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  }
  return parts.join("\n").slice(0, 10_000);
}

/** Waffo only knows ja, en and zh: kana means Japanese, Han characters mean Chinese, anything else is English. */
function detectLocale(text: string): "ja" | "en" | "zh" {
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  return "en";
}

const RETRY_DELAYS_MS = [1500, 3000];
const SCAN_TIMEOUT_MS = 6000;
// A batch of variants asks the same words several times; one allow is good for ten minutes.
const allowed = new Map<string, number>();
const ALLOW_TTL_MS = 10 * 60 * 1000;
let warnedUnconfigured = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function scanOnce(text: string) {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("scan timeout")), SCAN_TIMEOUT_MS));
  return Promise.race([
    getClient().contentSafety.scanPrompt({ prompt: text, locale: detectLocale(text), semantic: ScanSemanticMode.Enforce }),
    timeout,
  ]);
}

/** Tells the backend what Prompt Sift decided, after the response has gone out. Verdict and ids only. */
function report(
  token: string | undefined,
  verdict: "block" | "review" | "error",
  details: { categories?: string[]; requestId?: string; scene?: string },
) {
  try {
    after(async () => {
      await callBackend("/v1/internal/moderation/events", {
        method: "POST",
        token,
        body: { verdict, categories: details.categories ?? [], request_id: details.requestId, scene: details.scene },
      });
    });
  } catch {
    // outside a request there is nothing to defer; the console line below still records it
  }
}

export async function screenPrompt(
  text: string,
  ctx: { token: string; ip: string; scene?: string },
): Promise<ScreenResult> {
  if (!text.trim()) return { ok: true };
  if (!siftConfigured()) {
    if (!warnedUnconfigured && process.env.NODE_ENV === "production") {
      warnedUnconfigured = true;
      console.error("[moderation] WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY are not set: Waffo Prompt Sift is NOT running");
    }
    return { ok: true };
  }

  const session = crypto.createHash("sha256").update(ctx.token).digest("hex").slice(0, 16);
  const hash = crypto.createHash("sha256").update(`${session}|${text}`).digest("hex");
  const seen = allowed.get(hash);
  if (seen && Date.now() - seen < ALLOW_TTL_MS) return { ok: true };

  if (rateLimited(`sift:session:${session}`, 12, 60_000) || rateLimited(`sift:ip:${ctx.ip}`, 40, 60_000)) {
    return { ok: false, code: 429, message: RATE_MESSAGE };
  }

  const failOpen = process.env.PROMPT_SIFT_FAIL_OPEN === "true";
  const unavailable = (why: string, requestId?: string): ScreenResult => {
    console.error("[moderation] Prompt Sift could not decide:", why);
    report(ctx.token, "error", { requestId, scene: ctx.scene });
    return failOpen ? { ok: true } : { ok: false, code: 503, message: UNAVAILABLE_MESSAGE };
  };

  try {
    let verdict = await scanOnce(text);
    for (const delay of RETRY_DELAYS_MS) {
      if (String(verdict.reasonCode) !== "service_degraded") break;
      await sleep(delay);
      verdict = await scanOnce(text);
    }
    if (String(verdict.reasonCode) === "service_degraded") return unavailable("service_degraded", verdict.requestId);

    const action = String(verdict.action);
    console.info(
      "[moderation]",
      JSON.stringify({ action, reason: String(verdict.reasonCode), categories: verdict.matchedCategories, requestId: verdict.requestId, chars: text.length }),
    );
    if (action === "allow") {
      if (allowed.size > 2000) allowed.clear();
      allowed.set(hash, Date.now());
      return { ok: true };
    }
    const kind = action === "review" ? "review" : "block";
    report(ctx.token, kind, {
      categories: (verdict.matchedCategories ?? []).map(String),
      requestId: verdict.requestId,
      scene: ctx.scene,
    });
    return { ok: false, code: 422, message: kind === "review" ? REVIEW_MESSAGE : BLOCKED_MESSAGE };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 400 || status === 401 || status === 403) {
      console.error("[moderation] Waffo rejected the scan request: check WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY");
    }
    return unavailable(`${status ?? ""} ${e instanceof Error ? e.message : String(e)}`.trim());
  }
}
