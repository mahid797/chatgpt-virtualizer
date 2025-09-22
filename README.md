# ChatGPT Virtualizer

Chrome Manifest V3 extension that virtualizes long ChatGPT conversations so the interface stays responsive even on heavy threads. Built with modern TypeScript tooling and bundles via tsup.

## Features
- Virtualization-ready DOM utilities for efficient turn mounting and detaching
- Persistent user settings (enable toggle, overscan, recent turn count)
- MV3 module service worker with storage bootstrap on install/start
- Popup UI for instant feature toggling
- Zero analytics or network calls; everything runs locally

## Tech Stack
- TypeScript targeting Chrome 120+
- tsup (esbuild) for bundling background, content, and popup scripts
- Chrome storage API for persisted settings
- npm-based workflow with cross-platform scripts (rimraf, npm-run-all, chokidar-cli)

## Getting Started
```powershell
npm install
npm run build
```
The build output is emitted to `dist/` with manifest, popup assets, and bundled scripts consolidated for MV3.

## Scripts
| Script | Description |
| --- | --- |
| `npm run clean` | Delete the generated `dist/` directory |
| `npm run build` | Clean output, bundle TypeScript entry points, and copy static assets |
| `npm run build:ts` | Bundle TypeScript entry points with tsup |
| `npm run copy:static` | Sync manifest, popup assets, content styles, and `assets/` into `dist/` |
| `npm run dev` | Clean once, copy static assets, then watch TS builds and static files in parallel |
| `npm run dev:ts` | tsup watch mode with source maps |
| `npm run dev:static` | chokidar watch that recopies static assets on change |
| `npm run typecheck` | Run the TypeScript compiler with `--noEmit` |
| `npm run check` | Aggregate linting/typecheck hooks (currently typecheck only) |

> `npm run prepare` runs the production build automatically when the package is installed from source (useful for packaging).

## Development Workflow
1. Run `npm run dev` to keep both tsup and static asset copies up to date.
2. In Chrome visit `chrome://extensions`, enable **Developer mode**, and load the unpacked extension from the `dist/` directory.
3. After code or asset edits, Chrome picks up new bundles once `dist/` refreshes; use the extension Reload button when necessary.
4. Run `npm run typecheck` before committing to catch type regressions in background/content/popup contexts.

## Extension Loading
- Background entry: `dist/background.js` (module service worker)
- Content entry: `dist/content.js` (+ optional `styles.css`)
- Popup entry: `dist/popup.html`/`dist/popup.js`

Static assets such as icons can be placed under `assets/` and they will be copied into `dist/assets/` during build or watch tasks.

## Project Layout
```
src/
  background/        # MV3 service worker entry
  common/            # Reusable constants, storage utilities, messaging stubs
  content/           # DOM selectors, observers, virtualization hooks, styles
  ui/                # Popup HTML/CSS/TS bundle
public/manifest.json # Authoritative MV3 manifest
scripts/             # Build-time helpers (e.g., static asset copier)
```

## Troubleshooting
- If Chrome serves stale files, run `npm run clean` followed by `npm run build` to refresh `dist/` entirely.
- Watch mode relies on chokidar; when editing outside the workspace (network drives) file watching may lag—run a manual build.
- Ensure you are on Node.js v18.17 or later (per `package.json` engines).

