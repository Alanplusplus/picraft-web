import type { Metadata } from "next";

import { HistoryList, HistoryNotice } from "@/components/history-list";
import { getScenes } from "@/lib/scenes";
import { FILE_RETENTION_DAYS } from "@/lib/site";

export const metadata: Metadata = {
  title: "My files",
  description: `Your recent PiCraft designs on this device, kept for ${FILE_RETENTION_DAYS} days. This page is private and not indexed.`,
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  const scenes = Object.fromEntries(
    getScenes().map((scene) => [scene.slug, { name: scene.name, summary: scene.summary }]),
  );
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">My files</h1>
      <p className="mt-2 text-sm text-ink-500">Everything you&apos;ve made on this device.</p>
      <div className="mt-8">
        <HistoryList scenes={scenes} />
      </div>
      <HistoryNotice />
    </div>
  );
}
