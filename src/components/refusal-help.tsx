import Link from "next/link";

import { APPEAL_REPLY_BUSINESS_DAYS, SUPPORT_EMAIL } from "@/lib/site";

/**
 * Under the message of a request that the safety check stopped. The check is not perfect, so the visitor is told how
 * to ask for a second look, the way the Acceptable Use Policy describes appeals: an email with the subject "Appeal".
 * The reference is Prompt Sift's id of the verdict: it finds the record of the decision, which holds the refused text,
 * so the second look is a look at what was actually written.
 */
export function RefusalHelp({ requestId }: { requestId?: string }) {
  const subject = encodeURIComponent("Appeal");
  const body = encodeURIComponent(
    `Hi, I think my request was stopped by mistake.${requestId ? `\n\nReference ID: ${requestId}` : ""}\n\nWhat I was trying to make:\n`,
  );
  return (
    <p className="text-xs leading-relaxed text-ink-700">
      Think this was a mistake? Email{" "}
      <a className="font-medium underline" href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
        {SUPPORT_EMAIL}
      </a>{" "}
      with the subject “Appeal”
      {requestId ? (
        <>
          {" "}
          and the reference <span className="font-mono">{requestId}</span>
        </>
      ) : null}
      , and a person will answer within {APPEAL_REPLY_BUSINESS_DAYS} business days (
      <Link className="underline" href="/aup#appeals">
        how appeals work
      </Link>
      ). Nothing was generated and no credit was used.
    </p>
  );
}
