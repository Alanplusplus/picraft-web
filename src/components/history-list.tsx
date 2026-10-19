"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api-client";
import { FILE_RETENTION_DAYS, SUPPORT_EMAIL } from "@/lib/site";
import type { TaskView } from "@/lib/types";

import { ResultFiles } from "./result-files";
import { useSession } from "./session-provider";

export function HistoryNotice() {
  const { account } = useSession();
  return (
    <div className="mt-10 rounded-2xl bg-ink-50 p-5 text-sm leading-relaxed text-ink-700">
      <p>
        Files are kept for {FILE_RETENTION_DAYS} days and then deleted automatically, so download the ones you want to
        keep.
      </p>
      {account && (
        <p className="mt-2">
          Reference ID: <code className="rounded bg-white px-1.5 py-0.5 text-xs text-ink-950">{account.user_id}</code>.
          Include it when you email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          about your files or to ask us to delete them.
        </p>
      )}
    </div>
  );
}

export function HistoryList({ scenes }: { scenes: Record<string, { name: string; summary: string }> }) {
  const { ready, account } = useSession();
  const [items, setItems] = useState<TaskView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !account) return;
    api.history().then((res) => {
      if (res.code === 200 && res.data) setItems(res.data.items);
      else setError(res.message);
    });
  }, [ready, account?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="text-sm text-brand-700">{error}</p>;
  if (!items) return <p className="text-sm text-ink-500">Loading…</p>;
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-700">
        Nothing here yet.{" "}
        <Link href="/create" className="font-medium text-brand-700 hover:underline">
          Make something
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {items.map((item) => (
        <li key={item.task_id} className="rounded-2xl border border-ink-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link href={`/create/${item.scene}`} className="font-semibold text-ink-950 hover:text-brand-700">
              {scenes[item.scene]?.name ?? item.scene}
            </Link>
            <span className="text-xs text-ink-500">{new Date(item.created_at * 1000).toLocaleString()}</span>
          </div>
          {item.status === "done" ? (
            <ResultFiles
              task={item}
              source="history"
              compact
              share={
                scenes[item.scene]
                  ? {
                      sceneName: scenes[item.scene].name,
                      summary: scenes[item.scene].summary,
                      path: `/create/${item.scene}`,
                    }
                  : undefined
              }
            />
          ) : item.status === "failed" ? (
            <p className="text-sm text-ink-500">{item.error}</p>
          ) : (
            <p className="text-sm text-ink-500">Still designing… refresh in a moment.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
