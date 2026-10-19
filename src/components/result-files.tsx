"use client";

import { trackEvent } from "@/lib/analytics";
import { type PinShare, pinterestSaveUrl } from "@/lib/pinterest-save";
import type { TaskView } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PinterestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
    </svg>
  );
}

export function ResultFiles({
  task,
  source,
  share,
  compact = false,
}: {
  task: TaskView;
  /** Where the files are shown, so downloads can be told apart: right after a generation or from My files. */
  source: "generator" | "history";
  /** What a pin saved from this design says and links to. Without it there is no Save to Pinterest button. */
  share?: PinShare;
  compact?: boolean;
}) {
  const transparent = task.files.some((f) => f.format === "png");
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {task.preview_url && (
        <a href={task.preview_url} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.preview_url}
            alt="Your generated design"
            className={`mx-auto max-h-[480px] w-auto rounded-lg border border-ink-200 ${transparent ? "checkerboard" : ""}`}
          />
        </a>
      )}
      {task.preview_url && share && (
        <div className="flex flex-col items-center gap-1.5">
          <a
            href={pinterestSaveUrl(task.preview_url, share)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("result_save_pin", { scene: task.scene, style: share.styleLabel, source })
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#e60023] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ad081b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60023]"
          >
            <PinterestIcon />
            Save to Pinterest
          </a>
          <p className="text-center text-xs text-ink-500">
            Opens Pinterest with a description and a link to this maker. You can edit both before you save.
          </p>
        </div>
      )}
      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
        {task.files.map((file) => (
          <li key={`${file.id}-${file.format}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-900">{file.label}</p>
              <p className="text-xs text-ink-500">
                {file.format.toUpperCase()} · {file.width}×{file.height} · {formatBytes(file.bytes)}
              </p>
            </div>
            <a
              href={file.url}
              download
              onClick={() =>
                trackEvent("result_download", { scene: task.scene, file: file.id, format: file.format, source })
              }
              className="shrink-0 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
