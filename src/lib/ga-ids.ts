/**
 * The Google Analytics browser ids, passed from the browser to the checkout request, into the Waffo order's
 * metadata, and back out of the webhook (or the reconciliation) so the server can report the purchase to GA
 * against the visit that led to it.
 *
 * Only GA's own numeric formats are accepted, because these values travel through a third party and are sent on
 * to GA again.
 */
export interface GaIds {
  clientId?: string;
  sessionId?: string;
}

const CLIENT_ID_RE = /^\d{4,12}\.\d{4,12}$/;
const SESSION_ID_RE = /^\d{6,12}$/;

/** The ids if they look like GA's, otherwise undefined. */
export function sanitizeGaIds(input: unknown): GaIds | undefined {
  if (!input || typeof input !== "object") return undefined;
  const { clientId, sessionId } = input as Record<string, unknown>;
  const ids: GaIds = {};
  if (typeof clientId === "string" && CLIENT_ID_RE.test(clientId)) ids.clientId = clientId;
  if (typeof sessionId === "string" && SESSION_ID_RE.test(sessionId)) ids.sessionId = sessionId;
  return ids.clientId || ids.sessionId ? ids : undefined;
}

/** For the order metadata (Waffo wants string to string). */
export function gaIdsToMetadata(ids: GaIds | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (ids?.clientId) out.ga_cid = ids.clientId;
  if (ids?.sessionId) out.ga_sid = ids.sessionId;
  return out;
}

/** Reads them back from the order metadata, checking them again. */
export function readGaIds(metadata: Record<string, unknown> | undefined): GaIds | undefined {
  if (!metadata) return undefined;
  return sanitizeGaIds({ clientId: metadata.ga_cid, sessionId: metadata.ga_sid });
}
