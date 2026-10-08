import type { Account, Envelope, TaskView } from "./types";

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
  task: (taskId: string) => request<TaskView>(`/api/task/${encodeURIComponent(taskId)}`),
  history: () => request<{ items: TaskView[] }>("/api/history"),
};
