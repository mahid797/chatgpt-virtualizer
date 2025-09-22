/**
 * MV3 service worker (ESM) – initializes settings on install/startup.
 * We keep this minimal; content and popup read/write storage directly.
 */

import { ensureSettingsInitialized } from "../common/storage";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSettingsInitialized();
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureSettingsInitialized();
});
