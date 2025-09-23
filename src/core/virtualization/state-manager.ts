// src/core/virtualization/state-manager.ts
import type { Settings } from '@/shared/types/settings';
import { selectAllTurns, type TurnInfo } from '@/core/dom/selectors';
import type { TurnState } from './types';
import {
	buildPlaceholder,
	consolidateRootChildren,
	createToggleButton,
	placeChevron,
	updateButtonState,
	wrapArticleChildrenExceptButton,
} from '@/core/dom/utils';

export class TurnStateManager {
	private states = new Map<string, TurnState>();
	private order: string[] = [];
	private settings: Settings;
	private scheduleEval: () => void;

	constructor(settings: Settings, scheduleEval: () => void) {
		this.settings = settings;
		this.scheduleEval = scheduleEval;
	}

	updateSettings(settings: Settings): void {
		this.settings = settings;
	}

	private log(...args: unknown[]): void {
		if (this.settings.debug) console.log('[cgpt-virt]', ...args);
	}

	private createClickHandler(s: TurnState) {
		return (ev: Event) => {
			ev.stopPropagation();
			const me = ev as MouseEvent;

			// Alt: clear pin only
			if (me.altKey) {
				s.userPin = null;
				updateButtonState(s);
				this.scheduleEval();
				return;
			}

			// Shift: toggle pin bound to current state
			if (me.shiftKey) {
				// Only allow pinning while expanded. If collapsed, expand then pin.
				if (!s.attached) {
					this.attach(s);
				}
				s.userPin = s.userPin === 'attached' ? null : 'attached';
				updateButtonState(s);
				this.scheduleEval();
				return;
			}

			// Regular click: flip state and remember as auto intent
			if (s.attached) {
				s.autoIntent = 'detached';
				const idx = this.order.indexOf(s.info.id);
				this.detach(s, idx, this.order.length);
			} else {
				s.autoIntent = 'attached';
				this.attach(s);
			}
			this.scheduleEval();
		};
	}

	private ensureChevron(s: TurnState): void {
		if (s.btn && s.btn.isConnected) return;

		const btn = createToggleButton();
		btn.addEventListener('click', this.createClickHandler(s));

		s.info.root.appendChild(btn);
		s.btn = btn;
		updateButtonState(s);
		placeChevron(s);
	}

	private ensureState(info: TurnInfo): TurnState {
		let s = this.states.get(info.id);
		if (!s) {
			s = { info, attached: true, userPin: null, autoIntent: null };
			this.states.set(info.id, s);
			this.ensureChevron(s);
		} else {
			s.info = info; // refresh
			this.ensureChevron(s);
		}
		return s;
	}

	refreshOrderAndStates(): void {
		const turns: TurnInfo[] = selectAllTurns();
		const present = new Set<string>();
		const nextOrder: string[] = [];

		for (const t of turns) {
			nextOrder.push(t.id);
			present.add(t.id);
			this.ensureState(t);
		}

		// cleanup missing
		for (const [id, s] of this.states) {
			if (!present.has(id)) {
				try {
					this.attach(s);
					s.btn?.remove();
				} catch {}
				this.states.delete(id);
			}
		}

		this.order = nextOrder;
	}

	detach(s: TurnState, idxInOrder: number, total: number): void {
		if (!s.attached) return;

		// If this is the first time detaching this article, gather all content into a wrapper.
		let wrapper = s.storedBody;
		if (!wrapper) {
			wrapper = wrapArticleChildrenExceptButton(s.info.root);
			s.storedBody = wrapper;
		}

		// Always re-consolidate root-level children into the wrapper
		consolidateRootChildren(s);

		const ph = buildPlaceholder(s, idxInOrder, total, this.settings);
		s.placeholder = ph;

		// Replace the wrapper (which holds ALL original content) with a small placeholder
		wrapper.replaceWith(ph);
		s.attached = false;
		updateButtonState(s);
		placeChevron(s);

		this.log('detached', s.info.id);
	}

	attach(s: TurnState): void {
		if (s.attached) return;
		if (!s.placeholder || !s.storedBody) return;

		s.placeholder.replaceWith(s.storedBody);
		s.placeholder = undefined;
		s.attached = true;
		updateButtonState(s);
		placeChevron(s);

		this.log('attached', s.info.id);
	}

	toggle(s: TurnState): void {
		if (s.attached) {
			s.autoIntent = 'detached';
			const idx = this.order.indexOf(s.info.id);
			this.detach(s, idx, this.order.length);
		} else {
			s.autoIntent = 'attached';
			this.attach(s);
		}
		this.scheduleEval();
	}

	toggleById(id: string): void {
		const s = this.states.get(id);
		if (s) this.toggle(s);
	}

	getState(id: string): TurnState | undefined {
		return this.states.get(id);
	}

	getAllStates(): ReadonlyMap<string, TurnState> {
		return this.states;
	}

	getOrder(): readonly string[] {
		return this.order;
	}

	evaluate(): void {
		this.refreshOrderAndStates();
		const n = this.order.length;
		if (!n) return;

		const keepN = Math.max(0, Math.round(this.settings.keepRecent ?? 0));
		const tailStart = Math.max(0, n - keepN);

		for (let i = 0; i < n; i++) {
			const id = this.order[i];
			const s = this.states.get(id)!;

			let keep = i >= tailStart; // tail policy
			if (s.autoIntent === 'attached') keep = true;
			else if (s.autoIntent === 'detached') keep = false;

			// userPin overrides everything
			if (s.userPin === 'attached') keep = true;

			if (keep && !s.attached) this.attach(s);
			else if (!keep && s.attached) this.detach(s, i, n);
		}
	}

	destroy(): void {
		for (const s of this.states.values()) {
			try {
				this.attach(s);
				s.btn?.remove();
			} catch {}
		}
		this.states.clear();
		this.order = [];
	}
}
