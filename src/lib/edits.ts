import type { TaskFile, TaskView } from "./types";

/**
 * The edits of a finished design that cost credits and run on the server (backend/app/services/edits.py). The free
 * ones (crop, rotate, resize, adjust, convert) run in the browser, see lib/image-edit.ts.
 */
export type EditOp = "upscale2" | "upscale4" | "cutout";

export interface EditInfo {
  op: EditOp;
  /** On the button. */
  label: string;
  /** In the progress line and in the credits window. */
  doing: string;
  cost: number;
  /** What comes out, for the credits window. */
  result: string;
}

export const EDITS: Record<EditOp, EditInfo> = {
  upscale2: { op: "upscale2", label: "Enlarge 2×", doing: "Enlarging 2×", cost: 1, result: "A JPG and a lossless PNG at twice the size" },
  upscale4: { op: "upscale4", label: "Enlarge 4×", doing: "Enlarging 4×", cost: 2, result: "A JPG at four times the size" },
  cutout: { op: "cutout", label: "Remove background", doing: "Removing the background", cost: 1, result: "A transparent PNG of the subject" },
};

/** Kept in step with the limits in backend/app/services/edits.py. */
const MIN_ENLARGE_SIDE = 256;
const MAX_ENLARGED_PIXELS = 36_000_000;

/** The formats an edit can start from. A PDF is not a picture and an animated GIF cannot be edited as one. */
const EDITABLE_FORMATS = ["png", "jpg", "webp"];

/** The picture an edit works on: the first file that is a still image (never a PDF or a GIF). */
export function primaryImage(task: TaskView): TaskFile | null {
  return task.files.find((file) => EDITABLE_FORMATS.includes(file.format)) ?? null;
}

/** Why an edit cannot be done on this picture, or null when it can. */
export function whyNot(op: EditOp, file: TaskFile): string | null {
  if (op === "cutout") {
    return Math.min(file.width, file.height) < 32 ? "This image is too small to cut a subject out of." : null;
  }
  if (Math.min(file.width, file.height) < MIN_ENLARGE_SIDE) {
    return `This image is too small to enlarge (at least ${MIN_ENLARGE_SIDE} px on the shorter side).`;
  }
  const scale = op === "upscale4" ? 4 : 2;
  if (file.width * file.height * scale * scale > MAX_ENLARGED_PIXELS) {
    return "This image is already large; the enlarged copy would be too big.";
  }
  return null;
}

/** What a version of a design is called in the row of versions: the first one, or the edit that made it. */
export function versionLabel(task: TaskView, index: number): string {
  if (index === 0) return "First version";
  if (task.scene === "cutout") return "No background";
  if (task.scene === "upscale") {
    const factor = task.files[0]?.label.match(/^(\d)×/)?.[1];
    return factor ? `Enlarged ${factor}×` : "Enlarged";
  }
  return "Edited";
}
