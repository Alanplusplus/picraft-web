import "server-only";

import { after } from "next/server";

/**
 * Feishu (Lark) group notifications for the operator, sent through a custom bot webhook.
 *
 *   FEISHU_WEBHOOK_URL   https://open.feishu.cn/open-apis/bot/v2/hook/<token>; without it nothing is sent
 *
 * Used for payment events (the checkout being opened, Waffo's callbacks). A notification is a side effect: it never
 * throws, never delays the answer to the visitor or to Waffo, and a Feishu outage cannot break a payment.
 */

export type NoticeTone = "blue" | "green" | "orange" | "red" | "grey";

export interface FeishuNotice {
  title: string;
  /** The colour of the card's header: green for money in, orange for a refund or a cancellation, red for trouble. */
  tone?: NoticeTone;
  /** Shown before the title so a test-mode payment cannot be mistaken for a real one. */
  test?: boolean;
  /** [label, value] lines; a line without a value is left out. */
  rows: Array<[string, string | number | null | undefined]>;
}

const TIMEOUT_MS = 5000;

function webhookUrl(): string {
  return process.env.FEISHU_WEBHOOK_URL?.trim() || "";
}

/** The time in China, where the group reads it. */
function stamp(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** One line of the card; a buyer can type anything into a name or an email, so keep it to one line of bounded length. */
function oneLine(value: string | number): string {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

/** Sends the card now and says whether Feishu took it. Never throws. */
export async function sendFeishu(notice: FeishuNotice): Promise<boolean> {
  const url = webhookUrl();
  if (!url) return false;

  const lines = notice.rows
    .filter((row): row is [string, string | number] => row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== "")
    .map(([label, value]) => `**${label}**：${oneLine(value)}`);
  lines.push(`**时间**：${stamp()}`);

  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `${notice.test ? "[测试] " : ""}${notice.title}` },
      template: notice.tone ?? "blue",
    },
    elements: [{ tag: "div", text: { tag: "lark_md", content: lines.join("\n") } }],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ msg_type: "interactive", card }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // A refused message (for example a keyword or signature rule on the bot) still answers HTTP 200, with a code.
    const body = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
    if (!res.ok || (typeof body?.code === "number" && body.code !== 0)) {
      console.error("[feishu] rejected:", res.status, body?.code, body?.msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[feishu] failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Sends the card after the response has gone out (or in the background, outside a request). */
export function notifyFeishu(notice: FeishuNotice): void {
  if (!webhookUrl()) return;
  const send = () => sendFeishu(notice);
  try {
    after(send);
  } catch {
    void send();
  }
}
