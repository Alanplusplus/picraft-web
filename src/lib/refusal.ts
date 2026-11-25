/**
 * What to call a generation request that was turned away before a task existed, for analytics and for the message.
 *
 * Two different things used to be counted together as `generate_fail`: a request that the safety check or the pause
 * stopped (the visitor's input was refused, nothing broke) and a request that could not be made because something was
 * wrong (no credits, the network, a busy service). In production the first kind was a third of all submits, from a
 * handful of visitors who never made an image, and it made the success rate look like a fault. `generate_blocked`
 * now carries the first kind; `generate_fail` is left for what is really a failure.
 *
 * The server says why in `data.reason` (the safety check, the pause and the free-credit limit all do); the HTTP-like
 * `code` of the envelope is the fallback.
 */
export interface RefusalData {
  reason?: string;
  /** Waffo Prompt Sift's id of the verdict, shown to the visitor so a mistake can be looked up. */
  request_id?: string;
}

export interface Refusal {
  event: "generate_blocked" | "generate_fail";
  reason: string;
  /** The visitor's input was stopped by the safety check or the pause; show the way to ask for a second look. */
  appealable: boolean;
  requestId?: string;
}

export function describeRefusal(code: number, data: unknown): Refusal {
  const info = (data && typeof data === "object" ? data : {}) as RefusalData;
  const requestId = typeof info.request_id === "string" ? info.request_id.slice(0, 64) : undefined;

  if (code === 422) return { event: "generate_blocked", reason: "moderation", appealable: true, requestId };
  if (code === 429 && info.reason === "paused") return { event: "generate_blocked", reason: "paused", appealable: true };

  const failure = (reason: string): Refusal => ({ event: "generate_fail", reason, appealable: false });
  if (code === 402) return failure("no_credits");
  if (code === 0) return failure("network");
  if (code === 429) return failure("rate_limited");
  if (code === 503) return failure(info.reason === "free_limit" ? "free_limit" : "unavailable");
  return failure("rejected");
}
