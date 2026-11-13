import { after, NextRequest, NextResponse } from "next/server";
import type { WebhookEvent, WebhookEventData } from "@waffo/pancake-ts";

import { notifyFeishu, type FeishuNotice, type NoticeTone } from "@/lib/feishu";
import { readGaIds } from "@/lib/ga-ids";
import { grantPayment, refundPayment, syncSubscription, toCents, type SubscriptionStatus } from "@/lib/payments";
import { findPack, findPlan, formatPrice } from "@/lib/pricing";
import { parseOrderExternalId, verifyWaffoWebhook, waffoEnvironment } from "@/lib/waffo";
import { logReconcile, reconcilePayments } from "@/lib/waffo-reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Who bought what, from the order number (always present) or the metadata written at checkout. */
function readOrder(data: WebhookEventData) {
  const external = parseOrderExternalId(data.orderMerchantExternalId);
  const userId = external?.userId ?? data.orderMetadata?.user_id;
  const pack = external ? external.pack : findPack(data.orderMetadata?.pack);
  const plan = external ? external.plan : pack ? null : findPlan(data.orderMetadata?.plan);
  return { userId, pack, plan };
}

/** Subscription events that only change where the subscription stands. */
const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  "subscription.activated": "active",
  "subscription.renewed": "active",
  "subscription.recovered": "active",
  "subscription.uncanceled": "active",
  "subscription.plan_changed": "active",
  "subscription.canceling": "canceling",
  "subscription.past_due": "past_due",
  "subscription.canceled": "canceled",
};

/**
 * Waffo's one callback address. It checks the signature and the store, then:
 *   order.completed                  a pack was paid: grant the credits
 *   subscription.payment_succeeded   one period of a subscription was paid (the first, or a renewal): grant that
 *                                    period's credits, which expire and replace what is left of the last period
 *   subscription.*                   activated, renewed, canceling, canceled, past due...: remember where the
 *                                    subscription stands, for the account page
 *   refund.succeeded                 a full refund: take back the credits of that payment that are still unused
 * Everything downstream is idempotent. A temporary failure answers 500 so Waffo retries; an event that no retry can
 * fix (not our order, an event we do not use) answers 200.
 *
 * Every event that passed the signature is also sent to the operator's Feishu group (lib/feishu.ts), together with what
 * was done about it; a card in red means a person has to look.
 */
export async function POST(request: NextRequest) {
  if (!process.env.WAFFO_STORE_ID) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

  const rawBody = await request.text();
  let event: WebhookEvent<WebhookEventData>;
  try {
    event = verifyWaffoWebhook(rawBody, request.headers.get("x-waffo-signature"));
  } catch (e) {
    // Right after going live this usually means WAFFO_ENVIRONMENT does not match the API key's, or a wrong store id.
    const reason = e instanceof Error ? e.message : String(e);
    const hint = rejectionHint(rawBody, reason);
    console.error("[waffo] webhook rejected:", reason, hint ?? "");
    // The caller is Waffo (its delivery log shows this answer), so say why: it is the only place a wrong setting shows.
    return NextResponse.json({ error: "Invalid signature", reason, hint }, { status: 400 });
  }

  const outcome: Outcome = {};
  let response: NextResponse;
  try {
    response = await dispatch(event, outcome);
  } catch (e) {
    console.error("[waffo] handler error:", event.eventType, event.eventId, e instanceof Error ? e.message : e);
    outcome.result = `处理异常：${e instanceof Error ? e.message : String(e)}（已返回 500，Waffo 会重试）`;
    outcome.tone = "red";
    response = NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  notifyFeishu(feishuNotice(event, outcome));
  return response;
}

/**
 * Which setting to look at when a webhook is refused. The body is read before it is trusted, only to explain the
 * refusal (it decides nothing): the event says which environment and store it comes from.
 */
function rejectionHint(rawBody: string, reason: string): string | undefined {
  let peek: { mode?: unknown; storeId?: unknown } = {};
  try {
    peek = JSON.parse(rawBody) ?? {};
  } catch {
    return "The body is not JSON.";
  }
  const configured = waffoEnvironment();
  if (reason.includes("unexpected store")) {
    return `The event is for store ${String(peek.storeId)}, which is not the store this site is set up for (WAFFO_STORE_ID).`;
  }
  if (reason.includes("signature (")) {
    if ((peek.mode === "test" || peek.mode === "prod") && peek.mode !== configured) {
      return (
        `The event comes from the ${peek.mode} environment but this site verifies ${configured} webhooks ` +
        `(WAFFO_ENVIRONMENT=${configured}). Use WAFFO_ENVIRONMENT=${peek.mode} together with that environment's API key, ` +
        "store and products, or send the event to a deployment set up for it."
      );
    }
    return "The signature does not match the body: it was changed on the way, or the event did not come from Waffo.";
  }
  if (reason.includes("timestamp")) return "The signature is too old or too new: check the server clock.";
  return undefined;
}

/** What was done about an event, for the Feishu card. `tone` overrides the event's own colour when something needs a look. */
interface Outcome {
  result?: string;
  tone?: NoticeTone;
}

async function dispatch(event: WebhookEvent<WebhookEventData>, outcome: Outcome) {
  const { data, eventType } = event;
  if (eventType === "order.completed") return await onPayment(data, outcome);
  if (eventType === "subscription.payment_succeeded") return await onPayment(data, outcome, event.timestamp);
  if (eventType in SUBSCRIPTION_STATUS) return await onSubscriptionEvent(data, outcome, eventType, event.timestamp);
  if (eventType === "refund.succeeded") return await onRefund(data, outcome);
  if (eventType === "refund.failed") {
    console.error("[waffo] a refund failed:", data.orderId, data.paymentId, data.paymentFailureReason ?? "");
    outcome.result = "退款失败，需要人工处理";
    outcome.tone = "red";
  } else {
    outcome.result = "仅记录，无需处理";
  }
  return NextResponse.json({ received: true });
}

/** `paidAtIso` is given for a subscription payment, whose credits are counted from the time of payment. */
async function onPayment(data: WebhookEventData, outcome: Outcome, paidAtIso?: string) {
  const { userId, pack, plan } = readOrder(data);
  const paymentId = data.paymentId || "";
  if (!paymentId) {
    console.error("[waffo] payment event without a payment id:", data.orderId);
    outcome.result = "回调缺少支付ID，未处理";
    outcome.tone = "red";
    return NextResponse.json({ received: true });
  }

  const paidAtMs = paidAtIso ? Date.parse(paidAtIso) : NaN;
  const result = await grantPayment({
    paymentId,
    orderId: data.orderId,
    pack,
    plan,
    paidAt: Number.isFinite(paidAtMs) ? Math.floor(paidAtMs / 1000) : undefined,
    userId,
    email: data.buyerEmail || undefined,
    chargedAmount: data.chargedAmount,
    currency: data.currency,
    paymentStatus: data.paymentStatus,
    ga: readGaIds(data.orderMetadata),
  });

  switch (result.status) {
    case "unmatched":
      // Nothing was charged (for example the test event of Waffo's dashboard): there is no money to chase.
      if (toCents(data.chargedAmount) === 0) {
        outcome.result = "金额为 0 且不是本站订单（可能是 Waffo 后台的测试推送），已忽略";
        outcome.tone = "grey";
        return NextResponse.json({ received: true });
      }
      // Money was taken but there is nobody to give credits to (an order we did not create, or a deleted account).
      console.error(
        `[waffo] PAYMENT WITHOUT AN ACCOUNT (${result.reason}): ${paymentId}, order ${data.orderId}, ` +
          `${data.chargedAmount ?? "?"} ${data.currency}. Credits were NOT granted: grant by hand or refund.`,
      );
      outcome.result = `已收款但未匹配到账号（${result.reason}），积分未发放，需人工发放或退款`;
      outcome.tone = "red";
      return NextResponse.json({ received: true }); // retrying would not change anything
    case "failed":
      console.error("[waffo] grant rejected:", paymentId, result.message);
      outcome.result = `积分发放失败：${result.message}（已返回 500，Waffo 会重试）`;
      outcome.tone = "red";
      return NextResponse.json({ error: "Grant failed" }, { status: 500 }); // Waffo retries; the grant is idempotent
    case "granted": {
      const charged = result.chargedCents;
      outcome.result = `已发放 ${result.item.credits} 积分（${result.item.name}）`;
      if (charged !== null && charged !== result.item.priceCents) {
        console.warn(
          `[waffo] charged ${formatPrice(charged)} but the price list says ${formatPrice(result.item.priceCents)} for ` +
            `${result.item.id} (payment ${paymentId}). Credits follow the price list; check the product price in Waffo.`,
        );
        outcome.result += `；实收 ${formatPrice(charged)} 与价目表 ${formatPrice(result.item.priceCents)} 不一致，请检查 Waffo 商品价格`;
        outcome.tone = "orange";
      }
      break;
    }
    case "duplicate":
      outcome.result = "重复回调，这笔支付的积分此前已发放";
      outcome.tone = "grey";
      break;
    case "stale":
      outcome.result = "更新的订阅付款已覆盖这一笔，未重复发放";
      outcome.tone = "grey";
      break;
    case "ignored":
      outcome.result = result.reason === "zero_amount" ? "金额为 0，已忽略" : "支付状态不是 succeeded，已忽略";
      outcome.tone = "grey";
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}

async function onSubscriptionEvent(data: WebhookEventData, outcome: Outcome, eventType: string, eventAt: string) {
  const { userId, plan } = readOrder(data);
  if (!userId || !plan) {
    // A subscription this site did not create (or one that predates the order number); nothing to keep.
    console.warn("[waffo] subscription event for an order this site cannot match:", eventType, data.orderId);
    outcome.result = "无法匹配本站的订阅（不是本站创建的订单），已忽略";
    outcome.tone = "orange";
    return NextResponse.json({ received: true });
  }

  const stored = await syncSubscription({
    orderId: data.orderId,
    userId,
    plan,
    status: SUBSCRIPTION_STATUS[eventType],
    periodEnd: data.currentPeriodEnd,
    email: data.buyerEmail || undefined,
    eventAt,
  });
  if (!stored) {
    console.error("[waffo] could not store the subscription state:", eventType, data.orderId);
    outcome.result = "订阅状态同步失败（已返回 500，Waffo 会重试）";
    outcome.tone = "red";
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
  outcome.result = `订阅状态已同步为 ${SUBSCRIPTION_STATUS[eventType]}`;

  // The first payment of a subscription, and a renewal, normally arrive as their own payment event; asking Waffo for
  // this account's recent payments as well means a payment event that goes missing still gives the credits now.
  if (eventType === "subscription.activated" || eventType === "subscription.renewed") {
    const check = async () => {
      try {
        logReconcile(await reconcilePayments({ lookbackHours: 6, userId }), "buyer");
      } catch (e) {
        console.error("[waffo] check after", eventType, "failed:", e instanceof Error ? e.message : e);
      }
    };
    try {
      after(check);
    } catch {
      void check();
    }
  }
  return NextResponse.json({ received: true });
}

async function onRefund(data: WebhookEventData, outcome: Outcome) {
  if (!data.paymentId) {
    outcome.result = "回调缺少支付ID，未处理";
    outcome.tone = "red";
    return NextResponse.json({ received: true });
  }

  // Only a full refund takes credits back; a partial one is left for a person to decide.
  const refunded = toCents(data.refundedAmount);
  const original = toCents(data.originalChargedAmount);
  if (refunded !== null && original !== null && refunded < original) {
    console.warn(
      `[waffo] partial refund of ${data.refundedAmount} on ${data.originalChargedAmount} for payment ${data.paymentId}; credits left as they are.`,
    );
    outcome.result = `部分退款（${data.refundedAmount} / ${data.originalChargedAmount}），积分未收回，需人工决定`;
    outcome.tone = "orange";
    return NextResponse.json({ received: true });
  }

  const result = await refundPayment(data.paymentId);
  if (!result.ok) {
    console.error("[waffo] refund could not be applied:", data.paymentId);
    outcome.result = "退款处理失败，积分未收回（已返回 500，Waffo 会重试）";
    outcome.tone = "red";
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
  if (result.unknown) {
    console.warn("[waffo] refund for a payment this site has no record of:", data.paymentId, data.orderId);
    outcome.result = "本站没有这笔支付的记录，未处理";
    outcome.tone = "orange";
  } else if (result.refunded) {
    console.info(`[waffo] refunded ${data.paymentId}: took back ${result.clawedBack ?? 0} unused credits`);
    outcome.result = `全额退款，已收回 ${result.clawedBack ?? 0} 个未使用的积分`;
  } else {
    outcome.result = "这笔退款此前已处理";
    outcome.tone = "grey";
  }
  return NextResponse.json({ received: true });
}

/** How each event reads in the Feishu group, and the colour of its card. */
const EVENT_NOTICE: Record<string, { title: string; tone: NoticeTone }> = {
  "order.completed": { title: "Waffo 回调：积分包支付成功", tone: "green" },
  "subscription.payment_succeeded": { title: "Waffo 回调：订阅扣款成功", tone: "green" },
  "subscription.activated": { title: "Waffo 回调：订阅已开通", tone: "green" },
  "subscription.renewed": { title: "Waffo 回调：订阅已续期", tone: "green" },
  "subscription.recovered": { title: "Waffo 回调：订阅扣款已恢复", tone: "green" },
  "subscription.uncanceled": { title: "Waffo 回调：订阅取消已撤回", tone: "blue" },
  "subscription.plan_changed": { title: "Waffo 回调：订阅套餐已变更", tone: "blue" },
  "subscription.plan_change_scheduled": { title: "Waffo 回调：订阅套餐变更已预约", tone: "blue" },
  "subscription.plan_change_failed": { title: "Waffo 回调：订阅套餐变更失败", tone: "orange" },
  "subscription.canceling": { title: "Waffo 回调：订阅已申请取消", tone: "orange" },
  "subscription.canceled": { title: "Waffo 回调：订阅已终止", tone: "orange" },
  "subscription.past_due": { title: "Waffo 回调：订阅续费扣款失败", tone: "red" },
  "refund.succeeded": { title: "Waffo 回调：退款成功", tone: "orange" },
  "refund.failed": { title: "Waffo 回调：退款失败", tone: "red" },
};

/** The Feishu card for one webhook event: what happened, who and what it is about, and what this site did. */
function feishuNotice(event: WebhookEvent<WebhookEventData>, outcome: Outcome): FeishuNotice {
  const { data, eventType } = event;
  const { userId, pack, plan } = readOrder(data);
  const bought = plan ?? pack;
  const isRefund = eventType.startsWith("refund.");
  const isPayment = eventType === "order.completed" || eventType === "subscription.payment_succeeded";
  const known = EVENT_NOTICE[eventType];

  // The figure that belongs to this kind of event; `amount` is deprecated in the SDK and means different things.
  const figure = isRefund ? data.refundedAmount : isPayment ? data.chargedAmount : data.planPrice?.total;
  const currency = (data.currency || "USD").toUpperCase();
  const amount = figure ? `${figure} ${currency}` : undefined;
  const originalAmount = isRefund && data.originalChargedAmount ? `${data.originalChargedAmount} ${currency}` : undefined;

  return {
    title: known?.title ?? `Waffo 回调：${eventType}`,
    tone: outcome.tone ?? known?.tone ?? "blue",
    test: event.mode === "test",
    rows: [
      ["事件", eventType],
      ["商品", bought ? `${bought.name}（${bought.credits} 积分）` : data.productName],
      [isRefund ? "退款金额" : "金额", amount],
      ["原支付金额", originalAmount],
      ["买家邮箱", data.buyerEmail],
      ["用户ID", userId],
      ["订单号", data.orderId],
      ["支付ID", data.paymentId],
      ["支付方式", [data.paymentMethod, data.paymentLast4 ? `尾号 ${data.paymentLast4}` : ""].filter(Boolean).join(" ")],
      ["支付状态", data.paymentStatus],
      ["失败原因", data.paymentFailureReason],
      ["退款原因", data.refundReason],
      ["当前周期结束", data.currentPeriodEnd],
      ["处理结果", outcome.result],
    ],
  };
}
