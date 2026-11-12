import Link from "next/link";

import { ReportForm } from "@/components/report-form";
import { cleanTaskId } from "@/lib/report";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = pageMetadata({
  absoluteTitle: "Report Abuse – Report an Image or a Photo | PiCraft",
  description: `Report a ${SITE_NAME} design or a photo that was used without permission. Content about children, nudity or fakes of real people is taken down at once while we look.`,
  path: "/report",
});

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = (await searchParams).task;
  const taskId = cleanTaskId(Array.isArray(raw) ? raw[0] : raw);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Report abuse</h1>
      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-700">
        <p>
          Use this form to report a design made with {SITE_NAME}, or a photo of you that someone used without your
          permission. It takes a minute and you do not need an account. You can also write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p>
          Reports about a child, sexual content, a fake of a real person or a photo used without permission are
          acted on first: if you name the design, it is taken down at once and stays down until a person has looked at
          it. The{" "}
          <Link href="/aup" className="font-medium text-brand-700 hover:underline">
            Acceptable Use Policy
          </Link>{" "}
          explains what is not allowed, how fast we answer and what happens to accounts that break it.
        </p>
        <p>
          If a child is in danger, or you are being threatened, contact your local emergency number or police first.
        </p>
      </div>
      <ReportForm taskId={taskId} />
    </div>
  );
}
