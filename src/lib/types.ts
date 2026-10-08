export type FieldType = "text" | "textarea" | "select" | "image";

export interface SceneOption {
  value: string;
  label: string;
}

export interface SceneField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  maxLines?: number;
  rows?: number;
  placeholder?: string;
  help?: string;
  default?: string;
  options?: SceneOption[];
}

export interface OutputSummary {
  id: string;
  label: string;
  when?: Record<string, string | string[]>;
}

/** The subset of a scene that is safe and useful to ship to the browser. */
export interface ClientScene {
  slug: string;
  name: string;
  cost: number;
  fields: SceneField[];
  outputs: OutputSummary[];
}

export interface Account {
  user_id: string;
  credits: number;
}

export interface TaskFile {
  id: string;
  label: string;
  url: string;
  format: "jpg" | "png" | "pdf";
  width: number;
  height: number;
  bytes: number;
}

export interface TaskView {
  task_id: string;
  scene: string;
  status: "processing" | "done" | "failed";
  preview_url: string | null;
  files: TaskFile[];
  error: string | null;
  created_at: number;
}

export interface Envelope<T> {
  code: number;
  message: string;
  data: T | null;
}
