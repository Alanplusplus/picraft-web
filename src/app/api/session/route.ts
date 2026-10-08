import { NextResponse } from "next/server";

import { callBackend, getSessionToken, setSessionToken } from "@/lib/backend";
import type { Account } from "@/lib/types";

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (token) {
    const me = await callBackend<Account>("/v1/me", { token });
    if (me.code === 200 && me.data) return NextResponse.json({ code: 200, message: "success", data: { account: me.data } });
  }

  const { fingerprint } = (await request.json().catch(() => ({}))) as { fingerprint?: string };
  if (!fingerprint) return NextResponse.json({ code: 400, message: "Missing device id.", data: null });

  const result = await callBackend<{ token: string; account: Account }>("/v1/auth/anonymous", {
    method: "POST",
    body: { fingerprint },
  });
  if (result.code !== 200 || !result.data) return NextResponse.json({ ...result, data: null });

  await setSessionToken(result.data.token);
  return NextResponse.json({ code: 200, message: "success", data: { account: result.data.account } });
}
