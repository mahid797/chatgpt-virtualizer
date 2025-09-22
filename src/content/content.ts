import type { Settings } from "../common/constants";
import { getSettings, onSettingsChanged } from "../common/storage";
import { startVirtualizer, type VirtualizerHandle } from "./virtualization";
import { injectDebugStyles } from "./injector";

function applyEnabledState(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute("data-cgpt-virt", "on");
  } else {
    root.removeAttribute("data-cgpt-virt");
  }
}

let handle: VirtualizerHandle | null = null;
let current: Settings | null = null;

async function boot() {
  current = await getSettings();

  // Optional: lightweight debug visuals
  if (current.debug) injectDebugStyles();

  applyEnabledState(current.enabled);

  if (current.enabled) {
    handle = startVirtualizer(current);
  }

  // React to future changes
  onSettingsChanged((next) => {
    const wasEnabled = !!current?.enabled;
    current = next;

    if (next.debug) injectDebugStyles();
    applyEnabledState(next.enabled);

    if (next.enabled && !wasEnabled) {
      // turn on
      handle?.destroy();
      handle = startVirtualizer(next);
    } else if (!next.enabled && wasEnabled) {
      // turn off
      handle?.destroy();
      handle = null;
    } else if (next.enabled && handle) {
      // live-tune parameters (keepRecent, overscan, minPlaceholderHeight, debug)
      handle.updateSettings(next);
    }
  });
}

boot().catch(console.error);
