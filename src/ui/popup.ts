import { getSettings, setSettings } from "../common/storage";

async function init() {
  const checkbox = document.getElementById("enabled") as HTMLInputElement;
  const settings = await getSettings();
  checkbox.checked = !!settings.enabled;

  checkbox.addEventListener("change", async () => {
    await setSettings({ enabled: checkbox.checked });
    // No messaging needed; content reacts to storage changes.
    window.close();
  });
}

init().catch(console.error);
