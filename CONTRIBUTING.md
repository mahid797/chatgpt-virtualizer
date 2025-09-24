> Thanks for your interest in contributing to ChatGPT Virtualizer! This guide provides comprehensive information for developers wanting to contribute to this Chrome extension project.


## 📋 Table of Contents
- [📋 Table of Contents](#-table-of-contents)
- [🧰 Prerequisites](#-prerequisites)
  - [Required Software](#required-software)
- [🔧 Development Setup](#-development-setup)
  - [Initial Setup](#initial-setup)
  - [Build Commands](#build-commands)
- [🏗 Project Architecture](#-project-architecture)
- [⚙️ Technical Implementation](#️-technical-implementation)
  - [**Virtualization lifecycle**](#virtualization-lifecycle)
- [📝 Code Style \& Guidelines](#-code-style--guidelines)
- [🧪 Testing Procedures](#-testing-procedures)
  - [Where to debug](#where-to-debug)
  - [PR Test Checklist](#pr-test-checklist)
- [🔁 Contribution Workflow](#-contribution-workflow)
  - [Before opening your PR](#before-opening-your-pr)

## 🧰 Prerequisites
> **Philosophy:** We maintain a lightweight, privacy-first approach with zero analytics, no remote calls, and minimal dependencies.

### Required Software
- **Node.js**: ≥ 18.17 (LTS recommended)
- **npm**: Included with Node.js
- **Chrome**: 120+ (for Manifest V3 support)
- **Git**: Latest version

VS Code + ESLint + TypeScript extensions recommended.

## 🔧 Development Setup

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/mahid797/chatgpt-virtualizer.git
   cd chatgpt-virtualizer
   npm install
   ```

2. **Development Build (Watch Mode)**
   ```bash
   npm run dev
   ```
   This starts `tsup` in watch mode with:
   - Source maps for debugging
   - Automatic rebuilds on file changes
   - Asset copying (CSS tokens, manifest, popup files)
   - Icon validation

3. **Load Extension in Chrome**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked** → select the `dist/` directory
   - Note the extension ID for debugging

4. **Verify Installation**
   Open ChatGPT, click the extension icon, enable on the tab, confirm chevrons appear.

### Build Commands

| Command             | Purpose                      | Output               | Use Case             |
| ------------------- | ---------------------------- | -------------------- | -------------------- |
| `npm run dev`       | Development build with watch | `dist/` + sourcemaps | Active development   |
| `npm run build`     | Production build             | `dist/` minified     | Distribution/testing |
| `npm run typecheck` | Type validation only         | No output            | CI/validation        |

---

## 🏗 Project Architecture

**Minimal directory map**
```text
src/
├─ content/                    # Injected into ChatGPT pages
│  ├─ content-script.ts        # Entry; starts/stops virtualizer, wires messages
│  └─ styles.css               # Placeholder & chevron visuals (lightweight, scoped)
│
├─ features/
│  ├─ background/              # MV3 service worker (no persistent background page)
│  │  ├─ service-worker.ts     # Message routing, lifecycle, tab enablement state
│  │  ├─ command-handler.ts    # Keyboard command handlers (expand/collapse)
│  │  └─ tab-manager.ts        # Per-tab enable/disable (session-scoped)
│  └─ popup/                   # Toolbar popup
│     ├─ popup.html            # UI layout
│     ├─ popup.css             # Design tokens + cascade layers
│     └─ popup.ts              # Settings, stats, and bulk actions wiring
│
├─ core/                       # Virtualization engine
│  ├─ virtualization/          # Attach/detach, tail policy, pins, bulk ops
│  ├─ dom/                     # Selectors, light DOM helpers
│  └─ messaging/               # Types/handlers for internal messages
│
├─ shared/                     # Cross-cutting utilities
│  ├─ storage/                 # chrome.storage schema/helpers (keepRecent, debug, etc.)
│  ├─ messaging/               # Protocol & client helpers
│  └─ utils/                   # Small helpers & constants
│
└─ styles/                     # Design tokens
      ├─ tokens.core.css          # Base colors/spacing/typography
      ├─ tokens.content.css       # Content-script theming
      └─ tokens.popup.css         # Popup theming & component scales
```

**Responsibilities**
   - **Content script**: discovers turns, swaps heavy subtrees with placeholders, renders chevrons, enforces tail policy, respects pins.
   - **Background SW**: forwards popup/shortcut commands to the active ChatGPT tab; tracks per-tab enablement (session-scoped).
   - **Popup**: edits `keepRecent`, triggers bulk actions, shows live stats (visible/total/pinned).

**Message flow (MV3)**
  - Popup → Background: user actions
  - Background → Content (active tab): forward commands
  - Content → Background: stats/status
  - Background → Popup: responses/errors

---

## ⚙️ Technical Implementation

### **Virtualization lifecycle**
- **Discovery**: find `article[data-turn-id]` as turns; derive role/index metadata.
- **Collapse**: store the heavy subtree, insert a compact placeholder (≈3–5 nodes), place an external chevron button.
- **Expand**: restore the stored subtree; update `aria-expanded` and pin dot if pinned.
- **Tail policy**: keep the newest **N = keepRecent** attached; older detach unless explicitly pinned.
- **Pins**: Shift-click chevron to pin (keeps attached); Alt-click to clear pin. Bulk ops always respect pins.
- **Performance**: MutationObserver + rAF batching; minimal placeholder DOM; cleanup on disable/navigation.

**Storage model**
- **Persistent (chrome.storage.local)**:
  - `keepRecent: number` — tail policy (default `3`)
  - `minPlaceholderHeight: number` — layout guard for collapsed turns (default `64`)
  - `debug: boolean` — enables debug affordances (default `false`)
- **Session-scoped (not persisted)**:
  - Per-tab “enabled” state is held by the background worker and queried by the popup.

**Commands & shortcuts**
- Background listens to Chrome Commands and maps to content actions:
  - **Expand all** → expand every turn (pins continue to matter later)
  - **Collapse above viewport** → collapse strictly above first visible turn
- Default shortcuts are shown in the popup and can be customized at `chrome://extensions/shortcuts`.

**Styling**
- Minimal CSS, token-driven. Content styles live in `src/content/styles.css` and `src/styles/tokens.content.css`.  
  Popup uses cascade layers and tokens from `src/features/popup/popup.css` + `src/styles/tokens.popup.css`.

**Error handling**
- Always guard Chrome APIs with `chrome.runtime.lastError` in callbacks.
- Service worker can be asleep; popup retries via message round-trips and shows disabled UI when tab isn’t enabled.

---

## 📝 Code Style & Guidelines

- **TypeScript strict mode**: All strict flags enabled, no `any` types
- **Descriptive naming**: Use clear, self-documenting variable/function names
- **JSDoc comments**: Document public APIs and complex logic
- **Design token usage**: Use CSS custom properties from `src/styles/` tokens
- **Conventional Commits**: `feat(scope): …`, `fix(scope): …`, `docs: …`, `style: …` (keep PR titles consistent).
- **Imports**: use path aliases (e.g., `@/core/...`, `@/shared/...`) per `tsconfig.json` to avoid deep relative paths.


---

## 🧪 Testing Procedures

Before submitting a PR:
- **Test locally**: Verify your changes work in Chrome with the extension loaded
- **Keep last N**: change value, click **Apply**, verify immediate effect.
- Bulk actions:
  - **Collapse above viewport**.
  - **Expand all turns**.
  - **Collapse above…** with `#N` and `data-turn-id`.
- Disabled state:
  - When the tab is disabled, buttons/fields appear greyed and do not hover.

- UI polish:
  - Labels align with inputs; “turns” is snug to the number field.
  - Primary/secondary/ghost variants render correctly.
  - Help dialog opens/closes and content is readable.
  - Stats line updates when enabled on a valid ChatGPT tab.
  
### Where to debug
- **Service worker logs**: `chrome://extensions` → your extension → **Service worker** link.
- **Popup/content logs**: DevTools Console on the popup window and on the ChatGPT tab.


### PR Test Checklist

- Popup: toggle **Enable on this tab**; when disabled, buttons are greyed out and have no hover.
- **Keep last N**: change value, click **Apply**, confirm tail policy updates immediately.
- Bulk actions: **Expand all**, **Collapse above viewport**, **Collapse above…** (`#N` and `data-turn-id`) work and respect pins.
- In-page: chevrons toggle; **Shift-click** pins; **Alt-click** clears pin; pinned turns persist across bulk ops.
- Works on both `chat.openai.com` and `chatgpt.com`.
- No console errors in **background**, **popup**, or **content**.
- `npm run typecheck` and `npm run build` both succeed.
- Shortcuts respond: `Ctrl/Cmd+Shift+9` (expand), `Ctrl/Cmd+Shift+8` (collapse above viewport).

---

## 🔁 Contribution Workflow

1. **Fork & Clone**: Fork the repository and clone your fork
```bash
# Fork on GitHub first
git clone https://github.com/YOUR-USERNAME/chatgpt-virtualizer.git
cd chatgpt-virtualizer
git remote add upstream https://github.com/mahid797/chatgpt-virtualizer.git
```

2. **Setup**:

```bash
npm install
npm run dev
```

3. **Branch**:

```bash
git checkout -b feature/description
# or for bug fixes:
git checkout -b fix/issue-description
```

4. **Code**: Make changes following our [Code Style & Guidelines](#code-style--guidelines).

5. **Test**: Verify changes work locally using the [Testing Procedures](#testing-procedures).

6. **Submit**: Push your branch and open a pull request with a clear description.

### Before opening your PR

- Rebase on latest `upstream/main`:

  ```bash
  git fetch upstream
  git rebase upstream/main
  ```
- Verify locally:

  ```bash
  npm run typecheck && npm run build
  ```

**PR template (short)**

- **Summary**: what/why
- **Changes**: bullet list
- **Testing**: steps + results (include shortcuts, pins, bulk ops)
- **Screenshots**: if UI changed
---

**🚀 Release (maintainers)**

1. Bump version in `package.json`.
2. `npm run build` → verify `dist/`.
3. Zip `dist/` for the Chrome Web Store.
4. Update release notes.

---

**🙌 Thanks**

Your contributions keep long ChatGPT threads snappy for everyone.
Questions? Open an issue or start a discussion.