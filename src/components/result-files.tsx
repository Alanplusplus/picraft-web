"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { versionLabel } from "@/lib/edits";
import { type PinShare, pinterestSaveUrl } from "@/lib/pinterest-save";
import type { TaskView } from "@/lib/types";

import { CompareSlider } from "./compare-slider";
import { ImageActions } from "./image-actions";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PinterestIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
    </svg>
  );
}

/**
 * A finished design: the picture, the files to download (the first one is the main one), what can be done with the
 * picture next (AI edit, enlarge, cut out, free editor) and, quietly underneath, the report link and Save to
 * Pinterest. `before` is the visitor's own photo, which adds a Result / Compare switch.
 * `layout` only changes how tall the picture may be: next to the form, or on its own in the My files window.
 *
 * An enlarged or cut-out picture is a new design. It is added to a row of versions under the picture, so the
 * visitor can go back to the one before; the new design also reaches My files, and `onNewVersion` tells the page.
 */
export function ResultFiles({
  task: first,
  source,
  share,
  before,
  layout = "stage",
  onNewVersion,
}: {
  task: TaskView;
  /** Where the files are shown, so downloads can be told apart: right after a generation or from My files. */
  source: "generator" | "history";
  /** What a pin saved from this design says and links to. Without it there is no Save to Pinterest link. */
  share?: PinShare;
  before?: string | null;
  layout?: "stage" | "dialog";
  onNewVersion?: (task: TaskView) => void;
}) {
  const [view, setView] = useState<"result" | "compare">("result");
  // The preview link can be dead: past its expiry on a tab left open for days, or the file was already deleted.
  const [broken, setBroken] = useState(false);
  // The design as it was made, then every edit of it; `chosen` is the id of the one on show (the newest when empty).
  const [versions, setVersions] = useState<TaskView[]>([first]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const task = versions.find((item) => item.task_id === chosen) ?? versions[versions.length - 1];
  const transparent = task.files.some((f) => f.format === "png");
  const canCompare = Boolean(before && versions[0] === task && task.preview_url && task.files[0]);
  const comparing = canCompare && view === "compare";
  const pictureHeight = layout === "dialog" ? "max-h-[min(60vh,620px)]" : "max-h-[min(48vh,440px)]";

  return (
    <div className={layout === "dialog" ? "space-y-3" : "panel space-y-3 p-4 sm:p-5"}>
      {canCompare && (
        <div
          role="group"
          aria-label="What to show"
          className="mx-auto flex w-fit rounded-full bg-ink-100 p-0.5 text-xs font-medium"
        >
          {(["result", "compare"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className={`rounded-full px-3.5 py-1 transition ${
                view === item ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {item === "result" ? "Result" : "Compare with original"}
            </button>
          ))}
        </div>
      )}

      {comparing && before && task.preview_url ? (
        <>
          <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-ink-200">
            <CompareSlider
              before={before}
              beforeAlt="Your original photo"
              after={task.preview_url}
              afterAlt="The result"
              width={task.files[0].width}
              height={task.files[0].height}
              sizes="(min-width: 640px) 576px, 100vw"
              unoptimized
            />
          </div>
          <p className="text-center text-xs text-ink-500">
            Drag to compare. The original is cropped to the shape of the result.
          </p>
        </>
      ) : broken ? (
        <p className="rounded-xl bg-ink-50 px-4 py-10 text-center text-sm text-ink-500">
          This preview can&apos;t be loaded any more. Reload the page to get a fresh link. Files are deleted after a
          while.
        </p>
      ) : (
        task.preview_url && (
          <a href={task.preview_url} target="_blank" rel="noopener noreferrer" className="block" title="Open full size">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.preview_url}
              alt="Your generated design"
              onError={() => setBroken(true)}
              className={`mx-auto ${pictureHeight} w-auto max-w-full rounded-xl border border-ink-200 transition-opacity ${transparent ? "checkerboard" : ""} ${editing ? "opacity-40" : ""}`}
            />
          </a>
        )
      )}

      {versions.length > 1 && (
        <div role="group" aria-label="Versions of this image" className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
          {versions.map((item, index) => (
            <button
              key={item.task_id}
              type="button"
              aria-pressed={item === task}
              disabled={editing}
              onClick={() => {
                setChosen(item.task_id);
                setBroken(false);
              }}
              className={`rounded-full border px-3 py-1 font-medium transition disabled:opacity-50 ${
                item === task ? "border-ink-950 bg-ink-950 text-white" : "border-ink-300 bg-white text-ink-700 hover:border-ink-500"
              }`}
            >
              {versionLabel(item, index)}
            </button>
          ))}
        </div>
      )}

      <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
        {task.files.map((file, index) => (
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
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                index === 0
                  ? "bg-brand-600 text-white shadow-brand hover:bg-brand-700"
                  : "border border-ink-300 bg-white text-ink-900 hover:bg-ink-50"
              }`}
            >
              Download
            </a>
          </li>
        ))}
      </ul>

      <ImageActions
        key={task.task_id}
        task={task}
        source={source}
        onBusyChange={setEditing}
        onResult={(next) => {
          setVersions((prev) => [...prev, next]);
          setChosen(next.task_id);
          setBroken(false);
          setView("result");
          onNewVersion?.(next);
        }}
      />

      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-500">
        <span>Made with AI</span>
        {task.preview_url && share && (
          <a
            href={pinterestSaveUrl(task.preview_url, share)}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens Pinterest with a description and a link to this page. You can edit both before you save."
            onClick={() => trackEvent("result_save_pin", { scene: task.scene, style: share.styleLabel, source })}
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-ink-800 hover:underline"
          >
            <PinterestIcon />
            Save to Pinterest
          </a>
        )}
      </p>
    </div>
  );
}
