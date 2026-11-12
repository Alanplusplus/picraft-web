import { callBackend, getSessionToken } from "@/lib/backend";
import type { TaskView } from "@/lib/types";

const plain = (status: number, text: string) =>
  new Response(text, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });

/**
 * One picture of the visitor's own design, served from this site. The free editor draws it on a canvas, and a picture
 * from another origin (the file storage) would taint the canvas and could not be saved again. The link is never taken
 * from the request: it is read from the design, which is only given to the visitor it belongs to.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/task/[id]/file">) {
  const { id } = await ctx.params;
  const token = await getSessionToken();
  if (!token) return plain(401, "Your session expired. Please refresh the page.");

  const task = await callBackend<TaskView>(`/v1/tasks/${encodeURIComponent(id)}`, { token });
  if (task.code !== 200 || !task.data || task.data.status !== "done") return plain(404, "Design not found.");

  const wanted = new URL(request.url).searchParams.get("file");
  const pictures = task.data.files.filter((file) => file.format !== "pdf");
  const file = pictures.find((item) => item.id === wanted) ?? pictures[0];
  if (!file) return plain(404, "This design has no picture.");

  let upstream: Response;
  try {
    upstream = await fetch(file.url, { cache: "no-store" });
  } catch {
    return plain(502, "The file could not be loaded.");
  }
  if (!upstream.ok || !upstream.body) return plain(404, "The file is no longer available.");

  const type = upstream.headers.get("content-type") ?? "";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type.startsWith("image/") ? type : `image/${file.format === "jpg" ? "jpeg" : file.format}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
