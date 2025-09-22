import { getSettings, onSettingsChanged } from "../common/storage";

function applyEnabledState(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute("data-cgpt-virt", "on");
  } else {
    root.removeAttribute("data-cgpt-virt");
  }
}

async function boot() {
  // Apply current setting on load
  const { enabled } = await getSettings();
  applyEnabledState(enabled);

  // React to future toggles from the popup
  onSettingsChanged((next) => applyEnabledState(next.enabled));

  // Placeholder hooks; real virtualization comes later
  // (observer.ts / virtualization.ts will subscribe to enabled state)
}

boot().catch(console.error);
