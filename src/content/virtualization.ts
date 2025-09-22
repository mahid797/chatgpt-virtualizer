// src/content/virtualization.ts
import { type Settings } from '../common/constants';
import { selectAllTurns, type TurnInfo } from './selectors';

interface TurnState {
	info: TurnInfo;
	attached: boolean;
	placeholder?: HTMLElement;
	storedBody?: HTMLElement; // wrapper that contains ALL original article children (except our chevron)
	btn?: HTMLButtonElement;
	chevbar?: HTMLElement; // centered rail for attached chevron
	locked?: 'attached' | 'detached' | null; // user pin
}

export interface VirtualizerHandle {
	updateSettings(next: Partial<Settings>): void;
	destroy(): void;

	// Bulk ops
	expandAll(): void;
	collapseOlderThanVisible(): void; // retained for your workflow (one-shot)
	collapseAllBut(n?: number): void; // optional one-shot helper if you want it in popup later
	collapseBeforeIndex(i: number): void;
	collapseBeforeId(id: string): void;
	collapseBeforeViewport(): void;
	// Per-turn
	toggleTurn(id: string): void;
}

/** Clamp placeholder height to a tiny, consistent value. */
function placeholderHeightPx(settings: Settings): number {
	const px =
		typeof settings.minPlaceholderHeight === 'number'
			? settings.minPlaceholderHeight
			: 24;
	return Math.max(24, Math.min(32, Math.round(px)));
}

/** Build a small, styled placeholder with a role chip and meta index “#23/120”. */
function buildPlaceholder(
	s: TurnState,
	idxInOrder: number,
	total: number,
	settings: Settings
): HTMLElement {
	const ph = document.createElement('div');
	ph.className = 'cgptv-placeholder';
	ph.style.minHeight = `${placeholderHeightPx(settings)}px`;

	ph.setAttribute('data-turn-id', s.info.id);
	ph.setAttribute('data-testid', `conversation-turn-${s.info.id}-placeholder`);

	const humanIdx = idxInOrder + 1;
	ph.setAttribute(
		'aria-label',
		`Collapsed ${s.info.role} turn ${humanIdx} of ${total}`
	);

	// Label wrapper
	const label = document.createElement('div');
	label.className = 'cgptv-label';

	// Role chip (assistant/user/system/tool/other)
	const chip = document.createElement('span');
	chip.className = `cgptv-chip ${s.info.role}`;
	chip.textContent = s.info.role;

	// Separator dot
	const sep = document.createElement('span');
	sep.className = 'cgptv-sep';
	sep.textContent = '•';

	// Meta: index / total
	const meta = document.createElement('span');
	meta.className = 'cgptv-meta';
	meta.textContent = `${humanIdx}/${total}`;

	label.appendChild(meta);
	label.appendChild(sep);
	label.appendChild(chip);
	ph.appendChild(label);

	return ph;
}

/** Wrap ALL children of article (except our chevron) into a single container. */
function wrapArticleChildrenExceptButton(article: HTMLElement): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'cgptv-wrap';

	// Move everything except existing toggle buttons into the wrapper
	const kids = Array.from(article.childNodes);
	for (const n of kids) {
		if (n.nodeType === Node.ELEMENT_NODE) {
			const el = n as HTMLElement;
			if (
				el.classList.contains('cgptv-btn') &&
				el.classList.contains('cgptv-toggle')
			) {
				continue; // keep button outside wrapper
			}
		}
		wrapper.appendChild(n); // moves the node
	}

	// Place wrapper at the start of the article
	article.insertBefore(wrapper, article.firstChild);
	return wrapper;
}

/** Ensure a centered rail exists to host the chevron when attached. */
function ensureChevronBar(s: TurnState): HTMLElement {
	let bar = s.chevbar;
	if (bar && bar.isConnected) return bar;
	bar = document.createElement('div');
	bar.className = 'cgptv-chevbar';
	// Insert before our wrapper if present; otherwise as the first child.
	const ref =
		(s.storedBody && s.storedBody.isConnected && s.storedBody) ||
		(s.info.root.firstChild as ChildNode | null);
	if (ref) s.info.root.insertBefore(bar, ref);
	else s.info.root.appendChild(bar);
	s.chevbar = bar;
	return bar;
}

function consolidateRootChildren(s: TurnState): void {
	const root = s.info.root;

	// Ensure we have a wrapper in the DOM; create if missing.
	let wrapper = s.storedBody;
	if (!wrapper || !wrapper.isConnected) {
		wrapper = wrapArticleChildrenExceptButton(root);
		s.storedBody = wrapper;
	}

	// Move every direct child into the wrapper except:
	// - our wrapper itself
	// - our toggle button
	// - (defensive) any placeholder that might still be around
	const kids = Array.from(root.childNodes);
	for (const n of kids) {
		if (n === wrapper || n === s.btn) continue;

		if (n.nodeType === Node.ELEMENT_NODE) {
			const el = n as HTMLElement;
			// Skip placeholders & our toggle (defensive)
			if (el.classList.contains('cgptv-placeholder')) continue;
			if (
				el.classList.contains('cgptv-btn') &&
				el.classList.contains('cgptv-toggle')
			)
				continue;
		}

		wrapper.appendChild(n); // move into wrapper (preserves relative order among moved nodes)
	}
}

export function startVirtualizer(initial: Settings): VirtualizerHandle {
	let settings: Settings = { ...initial };
	let destroyed = false;

	const states = new Map<string, TurnState>();
	let order: string[] = [];

	let mo: MutationObserver | null = null;
	let pendingEval = false;

	function log(...args: unknown[]) {
		if (settings.debug) console.log('[cgpt-virt]', ...args);
	}

	function scheduleEval() {
		if (pendingEval) return;
		pendingEval = true;
		requestAnimationFrame(() => {
			pendingEval = false;
			evaluate();
		});
	}

	function ensureChevron(s: TurnState) {
		if (s.btn && s.btn.isConnected) return;

		const btn = document.createElement('button');
		btn.className = 'cgptv-btn cgptv-toggle';
		btn.type = 'button';
		btn.ariaLabel = 'Toggle this turn';
		btn.addEventListener('click', (ev) => {
			ev.stopPropagation();
			if ((ev as MouseEvent).altKey) {
				s.locked = null; // clear pin
				scheduleEval();
				return;
			}
			toggle(s);
		});

		s.info.root.appendChild(btn);
		s.btn = btn;
		updateBtnState(s);

		placeChevron(s);
	}

	function updateBtnState(s: TurnState) {
		if (!s.btn) return;
		s.btn.classList.toggle('is-detached', !s.attached);
		s.btn.textContent = s.attached ? '▾' : '▸';
	}

	// Put the chevron near the turn but OUTSIDE the placeholder/body at all times.
	function placeChevron(s: TurnState) {
		if (!s.btn) return;
		// Always anchored to the article root; CSS positions it next to the centered column.
		s.info.root.appendChild(s.btn);
	}

	function ensureState(info: TurnInfo): TurnState {
		let s = states.get(info.id);
		if (!s) {
			s = { info, attached: true, locked: null };
			states.set(info.id, s);
			ensureChevron(s);
		} else {
			s.info = info; // refresh
			ensureChevron(s);
		}
		return s;
	}

	function refreshOrderAndStates() {
		const turns: TurnInfo[] = selectAllTurns();
		const present = new Set<string>();
		const nextOrder: string[] = [];

		for (const t of turns) {
			nextOrder.push(t.id);
			present.add(t.id);
			ensureState(t);
		}

		// cleanup missing
		for (const [id, s] of states) {
			if (!present.has(id)) {
				try {
					attach(s);
					s.btn?.remove();
				} catch {}
				states.delete(id);
			}
		}

		order = nextOrder;
	}

	function detach(s: TurnState, idxInOrder: number, total: number) {
		if (!s.attached) return;

		// If this is the first time detaching this article, gather all content into a wrapper.
		let wrapper = s.storedBody;
		if (!wrapper) {
			wrapper = wrapArticleChildrenExceptButton(s.info.root);
			s.storedBody = wrapper;
		}

		// NEW: always re-consolidate root-level children into the wrapper
		consolidateRootChildren(s);

		const ph = buildPlaceholder(s, idxInOrder, total, settings);
		s.placeholder = ph;

		// Replace the wrapper (which holds ALL original content) with a small placeholder
		wrapper.replaceWith(ph);
		s.attached = false;
		updateBtnState(s);

		// NEW: move the chevron inside the placeholder
		placeChevron(s);

		log('detached', s.info.id);
	}

	function attach(s: TurnState) {
		if (s.attached) return;
		if (!s.placeholder || !s.storedBody) return;

		s.placeholder.replaceWith(s.storedBody);
		s.placeholder = undefined;
		s.attached = true;
		updateBtnState(s);

		// NEW: move the chevron back to the article
		placeChevron(s);

		log('attached', s.info.id);
	}

	function toggle(s: TurnState) {
		// Pin according to the new state, then flip immediately.
		if (s.attached) {
			s.locked = 'detached';
			const idx = order.indexOf(s.info.id);
			detach(s, idx, order.length);
		} else {
			s.locked = 'attached';
			attach(s);
		}
		scheduleEval();
	}

	/** Tail policy: keep only the last `keepRecent` turns attached unless pinned overrides. */
	function evaluate() {
		if (destroyed) return;

		refreshOrderAndStates();
		const n = order.length;
		if (!n) return;

		const keepN = Math.max(0, Math.round(settings.keepRecent ?? 0));
		const tailStart = Math.max(0, n - keepN);

		for (let i = 0; i < n; i++) {
			const id = order[i];
			const s = states.get(id)!;

			let keep = i >= tailStart; // tail policy
			if (s.locked === 'attached') keep = true;
			else if (s.locked === 'detached') keep = false;

			if (keep && !s.attached) attach(s);
			else if (!keep && s.attached) detach(s, i, n);
		}
	}

	// --- Bulk helpers (one-shot), still useful in your workflow ---
	function expandAll() {
		refreshOrderAndStates();
		for (const id of order) {
			const s = states.get(id)!;
			s.locked = 'attached';
			attach(s);
		}
		scheduleEval();
	}

	function collapseOlderThanVisible() {
		refreshOrderAndStates();
		if (!order.length) return;

		// Collapse everything before the first *currently attached* (or the first in DOM if none).
		// In tail mode, this is often redundant, but we keep it as a quick command.
		let firstAttached = order.findIndex((id) => states.get(id)!.attached);
		if (firstAttached < 0) firstAttached = 0;

		for (let i = 0; i < order.length; i++) {
			const s = states.get(order[i])!;
			if (i < firstAttached) {
				s.locked = 'detached';
				detach(s, i, order.length);
			} else {
				attach(s);
			}
		}
		scheduleEval();
	}

	function collapseAllBut(n?: number) {
		refreshOrderAndStates();
		const keep = Math.max(0, Math.round(n ?? settings.keepRecent ?? 0));
		const nTurns = order.length;
		const tailStart = Math.max(0, nTurns - keep);

		for (let i = 0; i < nTurns; i++) {
			const s = states.get(order[i])!;
			if (i < tailStart) {
				s.locked = 'detached';
				detach(s, i, nTurns);
			} else {
				s.locked = 'attached';
				attach(s);
			}
		}
		scheduleEval();
	}
	/** Detach all turns strictly before index `i`. Attach & pin turns at/after `i`. */
	function collapseBeforeIndex(i: number) {
		refreshOrderAndStates();
		const n = order.length;
		if (!n) return;

		// Clamp i to [0, n]. If i === 0 -> detach none. If i === n -> detach all.
		const cut = Math.max(0, Math.min(n, Math.floor(i)));

		for (let idx = 0; idx < n; idx++) {
			const s = states.get(order[idx])!;
			if (idx < cut) {
				s.locked = 'detached';
				detach(s, idx, n);
			} else {
				s.locked = 'attached';
				attach(s);
			}
		}

		// No deferred policy needed; we pinned both sides as per user intent.
		scheduleEval();
	}

	/** Convenience: find index by id and call collapseBeforeIndex. */
	function collapseBeforeId(id: string) {
		refreshOrderAndStates();
		const idx = order.indexOf(id);
		if (idx < 0) return; // unknown id; no-op
		collapseBeforeIndex(idx);
	}

	function collapseBeforeViewport() {
		refreshOrderAndStates();
		const n = order.length;
		if (!n) return;

		const vh = window.innerHeight || document.documentElement.clientHeight || 0;
		let firstVisible = -1;

		for (let i = 0; i < n; i++) {
			const s = states.get(order[i])!;
			const r = s.info.root.getBoundingClientRect();
			const visible = r.bottom >= 0 && r.top <= vh;
			if (visible) {
				firstVisible = i;
				break;
			}
		}

		if (firstVisible < 0) {
			// Fallback: if none intersects, bias to last (typical chatting location)
			firstVisible = Math.max(0, n - 1);
		}

		collapseBeforeIndex(firstVisible);
	}

	// MutationObserver: turns being added/removed/edited => re-evaluate tail policy.
	mo = new MutationObserver((records) => {
		let relevant = false;
		for (const r of records) {
			const check = (n: Node) => {
				if (n.nodeType !== Node.ELEMENT_NODE) return false;
				const el = n as Element;
				if (el.matches?.('article[data-turn-id]')) return true;
				if (el.closest?.('article[data-turn-id]')) return true;
				if (el.querySelector?.('article[data-turn-id]')) return true;
				return false;
			};
			if (
				(r.addedNodes && Array.from(r.addedNodes).some(check)) ||
				(r.removedNodes && Array.from(r.removedNodes).some(check))
			) {
				relevant = true;
				break;
			}
		}
		if (relevant) scheduleEval();
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
			mo?.disconnect();
			mo = null;

			for (const s of states.values()) {
				try {
					attach(s);
					s.btn?.remove();
				} catch {}
			}
			states.clear();
			order = [];
		},

		// Bulk ops
		expandAll,
		collapseOlderThanVisible,
		collapseAllBut,
		collapseBeforeIndex,
		collapseBeforeId,
		collapseBeforeViewport,

		// Per-turn
		toggleTurn(id: string) {
			const s = states.get(id);
			if (s) toggle(s);
		},
	};
}
