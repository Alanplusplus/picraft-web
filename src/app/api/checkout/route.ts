import { NextRequest } from "next/server";

import { callBackend, getSessionToken } from "@/lib/backend";
import { sanitizeGaIds } from "@/lib/ga-ids";
import { notifyFeishu, type FeishuNotice } from "@/lib/feishu";
import { findPack, findPlan, formatPrice, planPriceLabel } from "@/lib/pricing";
import { clientIp, reply, safeReturnPath, siteOrigin } from "@/lib/route-helpers";
import { rateLimited } from "@/lib/server-rate-limit";
import { emailEnabled } from "@/lib/account-token";
import type { Account, ClientPackCatalog } from "@/lib/types";
import {
  availablePacks,
  availablePlans,
  createCheckout,
  createSubscriptionCheckout,
  paymentsEnabled,
  productIdFor,
  productIdForPlan,
  waffoEnvironment,
} from "@/lib/waffo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Whether purchases are switched on and which packs and plans can be bought: the page draws its buy buttons from this. */
export async function GET() {
  const data: ClientPackCatalog = {
    enabled: paymentsEnabled(),
    packs: availablePacks(),
    plans: availablePlans(),
    canRestore: emailEnabled(),
  };
  return reply(200, "success", data);
}

/** Starts a Waffo checkout for one pack or one subscription plan and returns the address of the hosted payment page. */
export async function POST(request: NextRequest) {
  if (!paymentsEnabled()) return reply(503, "Credits are not available to buy yet.");
  if (rateLimited(`checkout:${clientIp(request)}`, 10, 10 * 60_000)) {
    return reply(429, "Too many attempts. Please try again in a few minutes.");
  }

  const body = (await request.json().catch(() => ({}))) as { pack?: string; plan?: string; returnPath?: string; ga?: unknown };
  const pack = findPack(body.pack);
  const plan = pack ? null : findPlan(body.plan);
  if (plan ? !productIdForPlan(plan.id) : !pack || !productIdFor(pack.id)) {
    return reply(400, plan ? "That plan isn't available." : "That pack isn't available.");
  }

  const token = await getSessionToken();
  const me = token ? await callBackend<Account>("/v1/me", { token }) : null;
  if (!me || me.code !== 200 || !me.data) return reply(401, "Your session expired. Please refresh the page.");

  // A second subscription on top of a running one would replace the credits of the first, so it is not sold.
  const running = me.data.subscription;
  if (plan && running && (running.status === "active" || running.status === "past_due")) {
    return reply(409, "You already have a subscription. Manage it from your account menu.");
  }

  const returnPath = safeReturnPath(body.returnPath);
  const common = {
    userId: me.data.user_id,
    // Waffo wants an absolute https address, so local development uses the store's default.
    successUrl: process.env.NODE_ENV === "production" ? `${siteOrigin(request)}${returnPath}?purchase=success` : undefined,
    // Without the visitor's consent to analytics the browser sends none.
    ga: sanitizeGaIds(body.ga),
  };
  const bought = plan ?? pack;
  // What the operator's Feishu group is told about this visitor and what they chose.
  const rows: FeishuNotice["rows"] = [
    ["类型", plan ? "订阅" : "积分包"],
    ["商品", bought ? `${bought.name}（${bought.credits} 积分）` : undefined],
    ["价格", plan ? planPriceLabel(plan) : pack ? formatPrice(pack.priceCents) : undefined],
    ["用户ID", me.data.user_id],
    ["当前积分", me.data.credits],
    ["来源页面", returnPath],
    ["国家/地区", request.headers.get("x-vercel-ip-country")],
  ];
  const notice = { test: waffoEnvironment() === "test", rows };
  try {
    const checkout = plan
      ? await createSubscriptionCheckout({ plan, ...common })
      : await createCheckout({ pack: pack!, ...common });
    notifyFeishu({ ...notice, title: "用户打开了收银台", tone: "blue" });
    return reply(200, "success", { url: checkout.url });
  } catch (e) {
    // Usually a product id that does not belong to WAFFO_ENVIRONMENT, or a product that is not published.
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[checkout] could not create a Waffo session for", bought?.id, reason);
    notifyFeishu({ ...notice, title: "收银台打开失败", tone: "red", rows: [...notice.rows, ["原因", reason]] });
    return reply(502, "Couldn't start checkout. Please try again.");
  }
}
