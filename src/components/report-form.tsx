"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { REPORT_CATEGORIES, REPORT_DETAILS_MAX, REPORT_DETAILS_MIN } from "@/lib/report";
import type { Envelope } from "@/lib/types";

const inputClass =
  "field";

/** The report form. `taskId` is filled in when the address names a design (`/report?task=<id>`); nothing on the site links that way. */
export function ReportForm({ taskId }: { taskId: string }) {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ removed: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!category) {
      setError("Please choose what you are reporting.");
      return;
    }
    if (details.trim().length < REPORT_DETAILS_MIN) {
      setError("Please tell us a little more about what is wrong.");
      return;
    }
    setBusy(true);
    let res: Envelope<{ removed: boolean }>;
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details, email, task_id: taskId, website }),
      });
      res = (await r.json()) as Envelope<{ removed: boolean }>;
    } catch {
      res = { code: 0, message: "Network error. Check your connection and try again.", data: null };
    }
    setBusy(false);
    if (res.code !== 200) {
      setError(res.message);
      return;
    }
    trackEvent("report_submit", { category });
    setDone({ removed: Boolean(res.data?.removed) });
  }

  if (done) {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-ink-200 bg-ink-50 p-5 text-sm leading-relaxed text-ink-700">
        <p className="font-semibold text-ink-950">Thank you. Your report was received.</p>
        <p className="mt-2">
          {done.removed
            ? "The design you named has been taken down while we look at it. "
            : "A person at PiCraft will look at it. "}
          If you left an email address we may write to you with questions; we do not share your report with the person
          who made the design.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 panel p-5 sm:p-6">
      <div>
        <label htmlFor="r-category" className="mb-1 block text-sm font-medium text-ink-900">
          What are you reporting? <span className="text-brand-700">*</span>
        </label>
        <select
          id="r-category"
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Choose one…</option>
          {REPORT_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {taskId && (
        <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700">
          You are reporting the design with reference <code className="text-ink-950">{taskId}</code>.
        </p>
      )}

      <div>
        <label htmlFor="r-details" className="mb-1 block text-sm font-medium text-ink-900">
          What is wrong? <span className="text-brand-700">*</span>
        </label>
        <textarea
          id="r-details"
          className={inputClass}
          rows={5}
          minLength={REPORT_DETAILS_MIN}
          maxLength={REPORT_DETAILS_MAX}
          required
          placeholder={
            taskId
              ? "Tell us what you see and why it should not be here."
              : "Tell us what you saw and where. A link helps."
          }
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="r-email" className="mb-1 block text-sm font-medium text-ink-900">
          Your email <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <input
          id="r-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          placeholder="Only so we can ask you a question"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Hidden from people; a program that fills in every field gives itself away. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="r-website">Website</label>
        <input id="r-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-brand-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary"
      >
        {busy ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
