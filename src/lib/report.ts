/** What a visitor can report. The keys must match REPORT_CATEGORIES in backend/app/services/moderation.py. */
export const REPORT_CATEGORIES: { value: string; label: string }[] = [
  { value: "child_safety", label: "Content that endangers or sexualises a child" },
  { value: "sexual", label: "Sexual or nude content" },
  { value: "deepfake", label: "A fake of a real person (face swap, impersonation, someone's likeness)" },
  { value: "privacy", label: "My photo or personal information was used without my permission" },
  { value: "violence_hate", label: "Violence, gore, hate or self-harm" },
  { value: "copyright", label: "Copyright or trademark infringement" },
  { value: "other", label: "Something else" },
];

export const REPORT_DETAILS_MIN = 10;
export const REPORT_DETAILS_MAX = 4000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A design's reference as found in the link of a report; anything else is ignored. */
export function cleanTaskId(value: unknown): string {
  return typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim().toLowerCase() : "";
}
