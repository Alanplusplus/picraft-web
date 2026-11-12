import "server-only";

import { emailEnabled } from "./account-token";
import { SUPPORT_EMAIL } from "./site";

/**
 * One plain-text email to the people who run PiCraft, for things that need a human soon (an abuse report).
 * It goes to REPORT_NOTIFY_EMAIL, or the support address, from the sender of the restore-link emails. Without the
 * Resend settings it does nothing: the report is still stored in the database and logged.
 */
export async function notifyOperator(subject: string, lines: string[]): Promise<void> {
  if (!emailEnabled()) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ACCOUNT_FROM_EMAIL,
      to: process.env.REPORT_NOTIFY_EMAIL || SUPPORT_EMAIL,
      subject,
      text: lines.join("\n"),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}`);
}
