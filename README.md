# ChatGPT Virtualizer

> ⚡ **A high-performance Chrome extension that virtualizes long ChatGPT conversations for blazing-fast performance**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Chrome Manifest V3 extension that **virtualizes long ChatGPT conversations** so the page stays fast, even on giant threads. It mounts only the turns you need, and collapses the rest into lightweight, accessible placeholders you can quickly expand.

> **Status:** Production-ready. No analytics, no remote calls. Everything runs locally in your browser.

---

## 🚀 Features

- ⚡ **Virtualized turns** — Offscreen turns become compact placeholders; expand on demand
- 🎛️ **Per-tab enable** — Turn the virtualizer on/off for just the current ChatGPT tab
- 📌 **Smart pinning** — Keep key turns expanded (pins are respected by bulk operations & tail policy)
- 🧭 **Bulk actions** — Expand all; collapse everything **above the viewport**; collapse above N or a specific turn index/id
- 🧰 **Popup UI** — Adjust "Keep last N turns" and trigger bulk actions
- 🧪 **Debug hooks** — `window.__cgptVirt` exposes a small API for power users
- 🛟 **Accessible by design** — ARIA states, focus visibility, and animated chevron with motion-reduced fallback
- 🛡️ **Privacy-first** — No analytics, no network requests, everything stays local

---

## 📦 Installation

### Option 1: From Source (Recommended)

1. **Clone & build**
   ```bash
   git clone https://github.com/mahid797/chatgpt-virtualizer.git
   cd chatgpt-virtualizer
   npm install
   npm run build
   ```

2. **Load unpacked extension**
   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** and select the `dist/` folder

3. **Navigate to ChatGPT**
   - Visit [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)
   - Click the extension icon to enable virtualization

### Option 2: Chrome Web Store
> Coming soon!

### Requirements
- **Chrome 120+** (Manifest V3 support)
- **Node.js ≥ 18.17** (for local builds only)

---

## 🎯 How It Works

The content script finds each ChatGPT turn (`<article data-turn-id="...">`) and identifies the "heavy" content subtree. When a turn is collapsed, the subtree is replaced with a small placeholder showing the role and turn index. A floating chevron button sits consistently beside each turn to expand/collapse. Recent turns stay expanded according to your **Keep last N** setting; older ones collapse unless pinned.

### Performance Impact
- **Before**: Long conversations can have 100+ DOM nodes per turn
- **After**: Collapsed turns use just 3-5 lightweight placeholder nodes
- **Result**: 90%+ reduction in DOM complexity for long threads

---

## 🎮 Usage

### Extension Popup

Open the extension popup from the Chrome toolbar:

- **Enable on this tab** — toggles the virtualizer for the current ChatGPT tab only
- **Keep last N turns** — sets the tail policy; click **Apply** to enforce immediately
- **Expand all turns** — attaches all turns (respects pinned behavior)
- **Collapse above viewport** — collapses everything strictly above the first visible turn
- **Collapse above…** — collapse everything before `#index` (1-based) or a `data-turn-id`

> 💡 Actions affect **only the active ChatGPT tab**

### In-Page Controls

Each turn has a small circular chevron button pinned to the right:

| Action | Behavior |
|--------|----------|
| **Click** | Toggle expand/collapse for that turn |
| **Shift+Click** | **Pin** the turn to keep it expanded |
| **Alt+Click** | Clear the pin |

> 📌 Pinned turns are respected by tail policy and bulk operations

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Shift + 9` | Expand all turns |
| `Ctrl/Cmd + Shift + 8` | Collapse above viewport |

Customize these in `chrome://extensions/shortcuts`

---

## ⚙️ Settings

Settings are stored via `chrome.storage.local` and merged with defaults:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `keepRecent` | number | `3` | Always keep the last N turns expanded |
| `minPlaceholderHeight` | number | `64` | Minimum height (px) for collapsed turns |
| `debug` | boolean | `false` | Adds subtle debug styles when enabled |

Per-tab enablement is kept in session storage, surviving service worker restarts within a browser session.

---

## 🏗️ Development

### Project Architecture

This extension follows a **clean, modular Phase 3 architecture** with clear separation of concerns:

```
src/
├── content/                   # Content script entry point
│   ├── content-script.ts      # Main content script entry point
│   └── styles.css             # In-page styles for placeholders & chevrons
│
├── core/                      # Business logic modules
│   ├── dom/                   # DOM manipulation & selectors
│   │   ├── selectors.ts       # Turn discovery and "heavy subtree" heuristics
│   │   ├── styling.ts         # Debug styles injection
│   │   └── utils.ts           # DOM manipulation utilities
│   ├── messaging/             # Message handling
│   │   ├── handlers.ts        # Message handling logic
│   │   └── message-types.ts   # Message type definitions
│   └── virtualization/        # Core virtualization engine
│       ├── index.ts           # Public API exports
│       ├── virtualizer.ts     # Main orchestrator & MutationObserver
│       ├── state-manager.ts   # Per-turn state & DOM attach/detach
│       ├── bulk-operations.ts # Expand all, collapse strategies, viewport logic
│       └── types.ts           # Virtualization type definitions
│
├── features/                  # Extension features
│   ├── background/            # Background service worker modules
│   │   ├── service-worker.ts  # Main MV3 service worker
│   │   ├── tab-manager.ts     # Tab state management
│   │   └── command-handler.ts # Keyboard command handling
│   └── popup/                 # Popup UI components
│       ├── popup.html         # Popup UI structure
│       ├── popup.css          # Popup styling
│       └── popup.ts           # Popup logic
│
└── shared/                    # Reusable utilities & types
    ├── messaging/             # Communication protocols
    │   ├── client.ts          # Message client utilities
    │   ├── protocol.ts        # Communication protocols
    │   └── index.ts           # Messaging API exports
    ├── storage/               # Data persistence
    │   ├── settings.ts        # Settings persistence
    │   ├── schema.ts          # Data validation
    │   └── index.ts           # Storage API exports
    ├── types/                 # TypeScript definitions
    │   ├── settings.ts        # Settings type definitions
    │   ├── messages.ts        # Message type definitions
    │   ├── dom.ts            # DOM-related types
    │   └── index.ts          # Type exports
    └── utils/                # Common utilities
        ├── constants.ts       # Project constants
        ├── helpers.ts         # Utility functions
        ├── validation.ts      # Input validation
        └── errors.ts          # Error handling
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build to `dist/` |
| `npm run dev` | Watch mode for development |
| `npm run typecheck` | TypeScript type checking |

### Architecture Highlights

- **TurnStateManager** — owns the lifecycle of each turn (attach/detach, pin state, button wiring)
- **BulkOperations** — one-shot bulk commands (expand all, collapse above viewport/index/id)
- **Virtualizer** — schedules evaluations on DOM mutations and settings changes
- **Path aliases** — Clean imports using `@/core/*`, `@/shared/*`, `@/features/*`
- **Type safety** — Full TypeScript coverage with strict mode

All bulk operations respect user pins. The "tail policy" is applied on every evaluation: only the last **N** turns (Keep recent) stay expanded unless explicitly overridden by pin/intent.

### DevTools API

When enabled on a tab, a debug handle is exposed:

```typescript
// In DevTools console:
const v = (window as any).__cgptVirt;

// Examples:
v.expandAll();
v.collapseBeforeViewport();
v.collapseAllBut(5);          // keep only last 5 turns expanded
v.collapseBeforeIndex(12);    // collapse strictly before index 12 (0-based)
v.collapseBeforeId('turn_42');
v.toggleTurn('turn_42');

v.updateSettings({ keepRecent: 6, debug: true });
```

---

## ♿ Accessibility

- **ARIA states** — Chevron button uses `aria-expanded` to reflect turn state
- **Focus management** — Keyboard navigation with visible focus rings
- **Motion respect** — Honors `prefers-reduced-motion` for animations
- **Screen readers** — Proper labeling and state announcements

---

## 🔒 Permissions & Privacy

### Required Permissions
- `storage` — For local settings persistence
- `tabs` — To locate and message the active ChatGPT tab
- **Host permissions**: `https://chat.openai.com/*`, `https://chatgpt.com/*`

### Privacy Commitment
- ✅ **No analytics or telemetry**
- ✅ **No remote calls or data collection**
- ✅ **All processing happens locally in your browser**
- ✅ **Open source for full transparency**

---

## 🔧 Troubleshooting

### Common Issues

**Buttons appear but nothing happens**
> Ensure the extension is **enabled on this tab** from the popup. The content script only runs on `chat.openai.com` and `chatgpt.com`.

**Collapse above viewport doesn't work**
> Make sure the page has scrolled such that at least one turn is visible. The action collapses everything strictly above the first visible turn.

**Pins not respected**
> Check that the turn is **expanded and pinned** (Shift+Click on the chevron). Bulk actions skip pinned turns by design.

**Changes not picked up after rebuild**
> Click **Reload** on the extension in `chrome://extensions/` after building.

### Debug Mode

Enable debug mode in the popup settings to see visual indicators for:
- Placeholder boundaries
- Toggle button states  
- Turn identification

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT © 2025 — ChatGPT Virtualizer

---

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/mahid797/chatgpt-virtualizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mahid797/chatgpt-virtualizer/discussions)
- **Email**: [Support Email](mailto:support@example.com)

---

<div align="center">

**⭐ Star this repo if it helps you keep your ChatGPT conversations snappy! ⭐**

</div>