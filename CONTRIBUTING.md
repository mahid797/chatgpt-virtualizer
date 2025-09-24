# Contributing to ChatGPT Virtualizer

Thanks for your interest in contributing! This guide covers **development setup**, **project structure**, **coding style**, and the **PR checklist**.

> We keep the footprint small: no analytics, no remote calls, no heavy UI frameworks.

---

## 🧰 Prerequisites

- **Node.js ≥ 18.17**
- **npm** (comes with Node)
- **Chrome 120+**

---

## 🔧 Local Development

1. **Clone & install**
   ```bash
   git clone https://github.com/mahid797/chatgpt-virtualizer.git
   cd chatgpt-virtualizer
   npm install
   ```

2. **Dev build (watch)**

   ```bash
   npm run dev
   ```

   This starts `tsup` in watch mode and writes outputs to `dist/` (including copied CSS tokens, popup assets, and manifest).

3. **Load the extension**

   * Open `chrome://extensions`
   * Enable **Developer mode**
   * **Load unpacked** → select the `dist/` directory

4. **Production build**

   ```bash
   npm run build
   ```

5. **Type-check**

   ```bash
   npm run typecheck
   ```

---

## 🏗 Project Architecture

```
src/
├── content/                   # Content script (in-page behavior)
│   ├── content-script.ts      # Entry point
│   └── styles.css             # Placeholder + chevron visuals (consumes tokens)
│
├── core/                      # Core logic (no DOM assumptions)
│   ├── dom/                   # DOM helpers & selectors
│   ├── messaging/             # Message handlers
│   └── virtualization/        # Virtualizer engine, state, bulk ops
│
├── features/                  # Browser-facing features
│   ├── background/            # MV3 service worker, commands, tab management
│   └── popup/                 # Popup UI (HTML/CSS/TS)
│
├── shared/                    # Cross-cutting concerns
│   ├── messaging/             # Client/protocol
│   ├── storage/               # Settings + schema
│   └── types/                 # Shared types
│
└── styles/                    # Design tokens (CSS custom properties)
    ├── tokens.core.css        # Base palette & scales
    ├── tokens.content.css     # Content-script specific tokens
    └── tokens.popup.css       # Popup-specific tokens
```

**Build pipeline**
`tsup.config.ts` compiles TS entries and **copies static files** (tokens, popup HTML/CSS, manifest, assets) into `dist/` on each build. The build also validates that `assets/icon.png` exists.

---

## 🎨 UI & CSS Guidelines

We use **plain CSS** with **custom properties** and **cascade layers**—no frameworks.

* **Tokens first**
  Add/modify colors and scales in `src/styles/tokens.*.css`. Avoid hard-coded values in component CSS.
* **Layers**
  `@layer base, components, utilities;` in `popup.css`.
  Keep specificity low; prefer `:where()` for internal parts.
* **Variants**
  Buttons use `data-variant="primary|secondary|ghost"`.
  Disabled buttons **must** be visually greyed and have **no hover**.
* **Accessibility**
  Focus rings use a shared token; respect `prefers-reduced-motion`.
* **Popup structure**
  Labels align via `--form-label-w`. Inputs use `--field-*` tokens (size, radius, focus ring).
* **Help dialog**
  Keep it lightweight and non-blocking; no dependencies.

---

## 🧠 Code Style & Patterns

* **TypeScript**: strict mode enabled; avoid `any`.
* **Path aliases**: `@/core/*`, `@/shared/*`, `@/features/*`, `@/content/*`.
* **Messaging**: always read `chrome.runtime.lastError` inside callbacks to avoid MV3 warnings.
* **Resilience**:

  * Platform detection for shortcuts uses `getPlatformInfo` with UA fallback.
  * Popups should keep working even if the service worker is asleep.

---

## 🧪 Manual Test Checklist

### Popup

* Toggle **Enable on this tab** on/off.
* **Keep last N**: change value, click **Apply**, verify immediate effect.
* Bulk actions:

  * **Collapse above viewport**.
  * **Expand all turns**.
  * **Collapse above…** with `#N` and `data-turn-id`.
* Disabled state:

  * When the tab is disabled, buttons/fields appear greyed and do not hover.
* UI polish:

  * Labels align with inputs; “turns” is snug to the number field.
  * Primary/secondary/ghost variants render correctly.
  * Help dialog opens/closes and content is readable.
  * Stats line updates when enabled on a valid ChatGPT tab.

### In-page behavior

* Chevron toggle expands/collapses.
* **Shift+Click** pins; **Alt+Click** clears pin.
* Tail policy keeps last **N** expanded but always respects pins.
* Works at both `chat.openai.com` and `chatgpt.com`.

---

## 📝 Commit & PR Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

* Keep PRs focused; describe **what** and **why**.
* Add screenshots for UI changes.
* Run `npm run build` (or `npm run dev` while testing) and `npm run typecheck`.
* No telemetry, ads, or network calls—privacy is non-negotiable.

---

## 🚀 Release (maintainers)

1. Bump version in `package.json`.
2. `npm run build` → verify `dist/`.
3. Zip `dist/` for the Chrome Web Store.
4. Update release notes.

---

## 🙌 Thanks

Your contributions keep long ChatGPT threads snappy for everyone.
Questions? Open an issue or start a discussion.