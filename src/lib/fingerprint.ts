"use client";

const PREFIX = "pc_";
const STORAGE_KEY = "pc_device_fp";

export async function getFingerprint(): Promise<string> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  let raw: string;
  try {
    // Loaded on demand: returning visitors already have an id and never download this library.
    const { default: FingerprintJS } = await import("@fingerprintjs/fingerprintjs");
    const agent = await FingerprintJS.load();
    raw = (await agent.get()).visitorId;
  } catch {
    raw = `fb_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  const value = `${PREFIX}${raw}`;
  localStorage.setItem(STORAGE_KEY, value);
  return value;
}
