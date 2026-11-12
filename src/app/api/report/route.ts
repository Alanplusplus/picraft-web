import crypto from "node:crypto";

import { after } from "next/server";

import { EMAIL_RE } from "@/lib/account-token";
import { callBackend, getSessionToken } from "@/lib/backend";
import { notifyOperator } from "@/lib/notify";
import { REPORT_CATEGORIES, REPORT_DETAILS_MAX, REPORT_DETAILS_MIN, cleanTaskId } from "@/lib/report";
import { clientIp, reply } from "@/lib/route-helpers";
import { rateLimited } from "@/lib/server-rate-limit";
import { SUPPORT_EMAIL } from "@/lib/site";

/**
 * Anyone can report a design or a photo, with or without a session. The report goes to the backend, which stores it and
 * takes a design down at once when the report is about a child, sexual content, a fake of a real person or someone's
 * own photo. The operators get an email when Resend is set up. The reporter never sees what happened to the design of
 * somebody else.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    category?: string;
    details?: string;
    task_id?: string;
    email?: string;
    website?: string;
  } | null;
  if (!body) return reply(400, "Please describe what you are reporting.");
  // The hidden field of the form: only programs fill it in. Pretend it worked.
  if (body.website) return reply(200, "Thank you. Your report was received.", { report_id: "", removed: false });

  const ip = clientIp(request);
  if (rateLimited(`report:${ip}`, 8, 60 * 60 * 1000)) {
    return reply(429, `Too many reports from this connection. Please email ${SUPPORT_EMAIL} instead.`);
  }

  const category = REPORT_CATEGORIES.find((c) => c.value === body.category);
  if (!category) return reply(400, "Please choose what you are reporting.");
  const details = (body.details ?? "").trim();
  if (details.length < REPORT_DETAILS_MIN) return reply(400, "Please tell us a little more about what is wrong.");
  if (details.length > REPORT_DETAILS_MAX) return reply(400, `Please keep the description under ${REPORT_DETAILS_MAX} characters.`);
  const email = (body.email ?? "").trim();
  if (email && !EMAIL_RE.test(email)) return reply(400, "That email address doesn't look right.");
  const taskId = cleanTaskId(body.task_id);

  const ipHash = crypto
    .createHash("sha256")
    .update(`${ip}|${process.env.SERVICE_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 16);
  const res = await callBackend<{ report_id: string; removed: boolean }>("/v1/internal/reports", {
    method: "POST",
    token: await getSessionToken(),
    body: { category: category.value, details, task_id: taskId || undefined, email: email || undefined, ip_hash: ipHash },
  });
  if (res.code !== 200 || !res.data) {
    return reply(res.code === 400 ? 400 : 503, res.code === 400 ? res.message : `We couldn't save your report. Please email ${SUPPORT_EMAIL}.`);
  }

  const { report_id: reportId, removed } = res.data;
  after(async () => {
    try {
      await notifyOperator(`[PiCraft report] ${category.value}${removed ? " (taken down)" : ""}`, [
        `Report: ${reportId}`,
        `Category: ${category.value} - ${category.label}`,
        `Design: ${taskId || "not given"}${removed ? " (taken down automatically until reviewed)" : ""}`,
        `Reporter email: ${email || "not given"}`,
        "",
        details.slice(0, 1500),
        "",
        "Look it up: SELECT * FROM abuse_reports WHERE report_id = '" + reportId + "';",
      ]);
    } catch (e) {
      console.error("[report] could not email the operators:", e instanceof Error ? e.message : e);
    }
  });
  return reply(200, "Thank you. Your report was received.", { report_id: reportId, removed });
}
