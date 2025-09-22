/**
 * Debug-only style injector.
 * Keeps placeholders visually discoverable without heavy overlays or labels.
 * Safe to call multiple times (idempotent).
 */

const DEBUG_STYLE_ID = 'cgptv-debug-styles';

export function injectDebugStyles() {
	if (document.getElementById(DEBUG_STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = DEBUG_STYLE_ID;
	style.textContent = `
    :root[data-cgpt-virt="on"] .cgptv-placeholder {
      background: rgba(120,120,120,0.08) !important;
    }
    :root[data-cgpt-virt="on"] .cgptv-placeholder::before {
      opacity: 1 !important;
    }
    :root[data-cgpt-virt="on"] article[data-turn-id] {
      position: relative;
    }
    :root[data-cgpt-virt="on"] .cgptv-btn.cgptv-toggle {
      box-shadow: 0 0 0 1px rgba(0,0,0,0.15), 0 1px 2px rgba(0, 0, 0, 0.2);
    }
  `;
	document.head.appendChild(style);
}
