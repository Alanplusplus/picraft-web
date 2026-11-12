import type { ClientPack, ClientPlan } from "./pricing";

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
  /** One sentence about what the maker does; it is part of the description of a pin saved from a result. */
  summary: string;
  cost: number;
  fields: SceneField[];
  outputs: OutputSummary[];
}

export type GeneratorMode = "text" | "image";

/** A model of the free-form generators, as listed in `data/generators/models.json`. */
export interface ImageModel {
  id: string;
  name: string;
  version: string;
  maker: string;
  engine: string;
  blurb: string;
  maxImages: number;
  /** Credits one image costs, by resolution. */
  credits: Record<string, number>;
  /** The shapes the model makes and the resolutions each is available in. */
  aspectRatios: { value: string; resolutions: string[] }[];
}

/** What the browser needs to draw a generator form. */
export interface ClientGenerator {
  slug: string;
  mode: GeneratorMode;
  name: string;
  summary: string;
  placeholder: string;
  help: string;
  maxPromptLength: number;
  defaultModel: string;
  models: ImageModel[];
}

export interface ImageRequest {
  mode: GeneratorMode;
  prompt: string;
  model: string;
  aspect_ratio: string;
  resolution: string;
  images: string[];
}

/** A customer's subscription, as far as the site shows it. `period_end` is a Unix time. */
export interface AccountSubscription {
  plan: string;
  status: "active" | "canceling" | "past_due";
  period_end: number | null;
}

export interface Account {
  user_id: string;
  /** Everything that can be spent: the credits that never expire plus the subscription's. */
  credits: number;
  /** How many of `credits` come from a subscription and expire at `sub_expires_at` (a Unix time). */
  sub_credits: number;
  sub_expires_at: number | null;
  subscription: AccountSubscription | null;
}

export interface TaskFile {
  id: string;
  label: string;
  url: string;
  format: "jpg" | "png" | "webp" | "pdf";
  width: number;
  height: number;
  bytes: number;
}

export interface TaskView {
  task_id: string;
  scene: string;
  status: "processing" | "done" | "failed";
  preview_url: string | null;
  /** A small picture for lists such as My files. Missing on tasks from an older server. */
  thumb_url?: string | null;
  files: TaskFile[];
  error: string | null;
  /** Why a failed task failed, in a word: blocked, busy, timeout, bad_image, no_image, render, failed, ... */
  error_code?: string | null;
  created_at: number;
}

export interface Envelope<T> {
  code: number;
  message: string;
  data: T | null;
}

/** What /api/checkout says about buying: whether it is on, the packs and the subscription plans, and whether email restore works. */
export interface ClientPackCatalog {
  enabled: boolean;
  packs: ClientPack[];
  plans: ClientPlan[];
  canRestore: boolean;
}

export interface ConfirmResult {
  status: "granted" | "settled" | "none" | "error" | "disabled";
}
