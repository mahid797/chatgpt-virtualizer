/**
 * Batching MutationObserver that discovers added/removed ChatGPT turns.
 * Independent of the virtualization engine; we just surface TurnInfo lists.
 */

import {
  TURN_SELECTOR,
  getTurnInfo,
  selectAllTurns,
  type TurnInfo,
} from "./selectors";

export interface TurnObserverOptions {
  /** Receive newly added turns (batched). */
  onAdd?: (turns: TurnInfo[]) => void;
  /** Receive removed turns (batched). */
  onRemove?: (turns: TurnInfo[]) => void;
  /** Scan existing DOM immediately and emit via onAdd. Default: true. */
  scanExisting?: boolean;
  /** Root to observe. Default: document.body. */
  root?: HTMLElement | Document;
}

export interface TurnObserverHandle {
  disconnect(): void;
}

export function startTurnObserver(
  opts: TurnObserverOptions = {}
): TurnObserverHandle {
  const root = (opts.root ?? document.body) as Node;
  const onAdd = opts.onAdd ?? (() => {});
  const onRemove = opts.onRemove ?? (() => {});
  const scanExisting = opts.scanExisting ?? true;

  const added = new Map<string, TurnInfo>();
  const removed = new Map<string, TurnInfo>();
  let scheduled = false;

  function queueFlush() {
    if (scheduled) return;
    scheduled = true;
    // rAF groups multiple mutations into one paint step.
    requestAnimationFrame(() => {
      scheduled = false;

      if (removed.size) {
        const batch = [...removed.values()];
        removed.clear();
        onRemove(batch);
      }
      if (added.size) {
        const batch = [...added.values()];
        added.clear();
        onAdd(batch);
      }
    });
  }

  function considerAdded(el: Element) {
    if (el.matches(TURN_SELECTOR)) {
      const info = getTurnInfo(el);
      if (info) {
        // If a node was removed and re-added quickly, prefer the most recent state.
        removed.delete(info.id);
        added.set(info.id, info);
        queueFlush();
      }
    }
    // Also scan descendants in case a wrapper was inserted.
    el.querySelectorAll?.(TURN_SELECTOR).forEach((child) =>
      considerAdded(child)
    );
  }

  function considerRemoved(el: Element) {
    if (el.matches(TURN_SELECTOR)) {
      const info = getTurnInfo(el);
      if (info) {
        added.delete(info.id);
        removed.set(info.id, info);
        queueFlush();
      }
    }
    el.querySelectorAll?.(TURN_SELECTOR).forEach((child) =>
      considerRemoved(child)
    );
  }

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      // Additions
      r.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) considerAdded(n as Element);
      });
      // Removals
      r.removedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) considerRemoved(n as Element);
      });
    }
  });

  mo.observe(root, { subtree: true, childList: true });

  if (scanExisting) {
    const existing = selectAllTurns();
    if (existing.length) onAdd(existing);
  }

  return {
    disconnect() {
      mo.disconnect();
      added.clear();
      removed.clear();
    },
  };
}
