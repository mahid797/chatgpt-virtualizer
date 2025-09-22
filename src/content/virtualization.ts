import { type Settings } from "../common/constants";
import { selectAllTurns, type TurnInfo } from "./selectors";
import { onScrollFrame, viewportHeight } from "./scroll";

type Unsubscribe = () => void;

interface TurnState {
  info: TurnInfo;
  attached: boolean;
  placeholder?: HTMLElement;
  storedBody?: HTMLElement; // original detached body
  lastMeasured?: number; // px height used for placeholder
}

export interface VirtualizerHandle {
  updateSettings(next: Partial<Settings>): void;
  destroy(): void;
}

export function startVirtualizer(initial: Settings): VirtualizerHandle {
  let settings: Settings = { ...initial };
  let destroyed = false;

  const states = new Map<string, TurnState>();
  let order: string[] = []; // DOM order of ids

  let unsubScroll: Unsubscribe | null = null;
  let mo: MutationObserver | null = null;
  let pendingEval = false;

  function log(...args: unknown[]) {
    if (settings.debug) console.log("[cgpt-virt]", ...args);
  }

  function scheduleEval() {
    if (pendingEval) return;
    pendingEval = true;
    requestAnimationFrame(() => {
      pendingEval = false;
      evaluate();
    });
  }

  function ensureState(info: TurnInfo): TurnState {
    let s = states.get(info.id);
    if (!s) {
      s = { info, attached: true };
      states.set(info.id, s);
    } else {
      s.info = info; // refresh node references (DOM can rerender)
    }
    return s;
  }

  function detach(s: TurnState) {
    if (!s.attached) return;

    const body = s.info.body;
    const h = Math.max(settings.minPlaceholderHeight, body.offsetHeight || 0);
    const ph = document.createElement("div");
    ph.className = "cgptv-placeholder";
    ph.style.height = `${h}px`;

    s.lastMeasured = h;
    s.placeholder = ph;
    s.storedBody = body;

    body.replaceWith(ph);
    s.attached = false;
    log("detached", s.info.id, h);
  }

  function attach(s: TurnState) {
    if (s.attached) return;
    if (!s.placeholder || !s.storedBody) return;

    s.placeholder.replaceWith(s.storedBody);
    s.placeholder = undefined;
    s.attached = true;
    log("attached", s.info.id);
  }

  function cleanupMissingPresentIds(presentIds: Set<string>) {
    // Restore and drop any state entries whose nodes no longer exist
    for (const [id, s] of states) {
      if (!presentIds.has(id)) {
        try {
          attach(s);
        } catch {}
        states.delete(id);
      }
    }
  }

  function refreshOrderAndStates() {
    const turns: TurnInfo[] = selectAllTurns();
    const presentIds = new Set<string>();
    order = [];

    for (const t of turns) {
      order.push(t.id);
      presentIds.add(t.id);
      ensureState(t);
    }
    cleanupMissingPresentIds(presentIds);
  }

  function visibleWindow(): { start: number; end: number } {
    // Find first/last that intersect viewport
    const vh = viewportHeight();
    let start = -1;
    let end = -1;

    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const s = states.get(id)!;
      const r = s.info.root.getBoundingClientRect();
      const intersects = r.bottom >= 0 && r.top <= vh;
      if (intersects) {
        if (start === -1) start = i;
        end = i;
      }
    }

    if (start === -1 || end === -1) {
      // If none intersects, bias to tail (usually where you're chatting)
      return {
        start: Math.max(0, order.length - 1),
        end: Math.max(0, order.length - 1),
      };
    }
    return { start, end };
  }

  function evaluate() {
    if (destroyed) return;

    // Step 1: Ensure we have an up-to-date list of turns and states
    refreshOrderAndStates();
    const n = order.length;
    if (!n) return;

    // Step 2: Determine ranges to keep attached
    const vis = visibleWindow();
    const keepStart = Math.max(0, vis.start - settings.overscan);
    const keepEnd = Math.min(n - 1, vis.end + settings.overscan);

    const tailStart = Math.max(0, n - settings.keepRecent);

    // Step 3: Attach/detach accordingly
    for (let i = 0; i < n; i++) {
      const id = order[i];
      const s = states.get(id)!;

      const keep = (i >= keepStart && i <= keepEnd) || i >= tailStart;

      if (keep) attach(s);
      else detach(s);
    }
  }

  // Scroll/resize loop
  unsubScroll = onScrollFrame(scheduleEval);

  // DOM mutations (turns being added/removed/edited)
  mo = new MutationObserver((records) => {
    // Heuristic: only react if a relevant subtree changed
    for (const r of records) {
      if (r.addedNodes.length || r.removedNodes.length) {
        scheduleEval();
        break;
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // Initial run
  scheduleEval();

  return {
    updateSettings(next: Partial<Settings>) {
      settings = { ...settings, ...next };
      scheduleEval();
    },
    destroy() {
      destroyed = true;
      unsubScroll?.();
      unsubScroll = null;
      mo?.disconnect();
      mo = null;

      // Restore all detached nodes
      for (const s of states.values()) {
        try {
          attach(s);
        } catch {}
      }
      states.clear();
      order = [];
    },
  };
}
