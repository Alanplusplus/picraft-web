import { proxy } from "@/lib/backend";

export async function GET(_request: Request, ctx: RouteContext<"/api/task/[id]">) {
  const { id } = await ctx.params;
  return proxy(`/v1/tasks/${encodeURIComponent(id)}`);
}
