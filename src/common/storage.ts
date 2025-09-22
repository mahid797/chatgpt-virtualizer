/**
 * Thin, typed wrapper around chrome.storage for Settings.
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from "./constants";

/** Read settings (merged with defaults). */
export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const stored = (raw?.[STORAGE_KEYS.SETTINGS] ?? {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** Merge and persist settings. */
export async function setSettings(
  partial: Partial<Settings>
): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

/** Ensure a settings object exists at install/startup. */
export async function ensureSettingsInitialized(): Promise<void> {
  const raw = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  if (!raw || !raw[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    });
  }
}

/** Subscribe to settings changes (chrome.storage event). */
export function onSettingsChanged(cb: (next: Settings) => void): () => void {
  const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
    changes,
    areaName
  ) => {
    if (areaName !== "local") return;
    const entry = changes[STORAGE_KEYS.SETTINGS];
    if (!entry) return;

    // Merge with defaults in case a future version adds new fields.
    const next = {
      ...DEFAULT_SETTINGS,
      ...(entry.newValue as Partial<Settings>),
    };
    cb(next);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
