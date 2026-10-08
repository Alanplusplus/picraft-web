import type { TaskView } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ResultFiles({ task, compact = false }: { task: TaskView; compact?: boolean }) {
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
