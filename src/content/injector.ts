/**
 * Optional style injector for debug/experimentation.
 * Not required for normal operation (styles.css is loaded via manifest).
 */

let injected = false;

/** Inject an additional debug stylesheet once (safe to call multiple times). */
export function injectDebugStyles() {
  if (injected) return;
  injected = true;

  const style = document.createElement("style");
  style.id = "cgptv-debug-styles";
  style.textContent = `
    :root[data-cgpt-virt="on"] .cgptv-placeholder {
      outline: 1px dashed rgba(0,0,0,.25);
      position: relative;
      background-image: linear-gradient(
        135deg,
        rgba(0,0,0,.035) 25%,
        transparent 25%,
        transparent 50%,
        rgba(0,0,0,.035) 50%,
        rgba(0,0,0,.035) 75%,
        transparent 75%,
        transparent
      );
      background-size: 16px 16px;
    }
    :root[data-cgpt-virt="on"] .cgptv-placeholder::after {
      content: "detached";
      position: absolute;
      top: 4px;
      right: 8px;
      font: 10px/1 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: rgba(0,0,0,.45);
      background: rgba(255,255,255,.6);
      border-radius: 999px;
      padding: 2px 6px;
    }
  `;
  document.head.appendChild(style);
}
