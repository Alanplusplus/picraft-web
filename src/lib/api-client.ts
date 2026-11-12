import type { EditOp } from "./edits";
import type { Account, ClientPackCatalog, ConfirmResult, Envelope, ImageRequest, TaskView } from "./types";

async function request<T>(url: string, body?: unknown): Promise<Envelope<T>> {
  try {
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    return (await res.json()) as Envelope<T>;
  } catch {
    return { code: 0, message: "Network error. Check your connection and try again.", data: null };
  }
}

export const api = {
  session: (fingerprint: string) => request<{ account: Account }>("/api/session", { fingerprint }),
  upload: (imageBase64: string) => request<{ url: string }>("/api/upload", { image_base64: imageBase64 }),
  generate: (scene: string, fields: Record<string, string>, images: Record<string, string>) =>
    request<{ task_id: string; account: Account }>("/api/generate", { scene, fields, images }),
  generateImage: (body: ImageRequest) =>
    request<{ task_id: string; account: Account }>("/api/generate-image", body),
  task: (taskId: string) => request<TaskView>(`/api/task/${encodeURIComponent(taskId)}`),
  /** An edit of a finished design that costs credits (see lib/edits.ts); the answer is a new task to poll. */
  processTask: (taskId: string, op: EditOp, file?: string) =>
    request<{ task_id: string; account: Account }>(`/api/task/${encodeURIComponent(taskId)}/process`, { op, file }),
  history: () => request<{ items: TaskView[] }>("/api/history"),
  packs: () => request<ClientPackCatalog>("/api/checkout"),
  checkout: (item: { pack: string } | { plan: string }, returnPath: string, ga: { clientId?: string; sessionId?: string }) =>
    request<{ url: string }>("/api/checkout", { ...item, returnPath, ga }),
  /** An address of Waffo's customer portal, where the subscription is cancelled or the card changed. */
  subscriptionPortal: () => request<{ url: string }>("/api/subscription/portal", {}),
  confirmPayment: () => request<ConfirmResult>("/api/checkout/confirm", {}),
  sendRestoreLink: (email: string) => request<null>("/api/account/send-link", { email }),
};
