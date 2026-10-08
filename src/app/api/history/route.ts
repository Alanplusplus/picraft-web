import { proxy } from "@/lib/backend";

export async function GET() {
  return proxy("/v1/history");
}
