// src/content/bulk-operations.ts
import { type Settings } from '../common/constants';
import { type TurnStateManager } from './turn-state-manager';

export class BulkOperations {
	constructor(
		private stateManager: TurnStateManager,
		private settings: Settings,
		private scheduleEval: () => void
	) {}

	updateSettings(settings: Settings): void {
		this.settings = settings;
	}

	expandAll(): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();

		for (const id of order) {
			const s = this.stateManager.getState(id)!;
			if (s.userPin) continue; // skip pinned
			s.autoIntent = 'attached';
			this.stateManager.attach(s);
		}
		this.scheduleEval();
	}

	collapseOlderThanVisible(): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();
		if (!order.length) return;

		// Collapse everything before the first *currently attached* (or the first in DOM if none).
		let firstAttached = order.findIndex(
			(id) => this.stateManager.getState(id)!.attached
		);
		if (firstAttached < 0) firstAttached = 0;

		for (let i = 0; i < order.length; i++) {
			const s = this.stateManager.getState(order[i])!;
			if (s.userPin) continue; // skip pinned
			if (i < firstAttached) {
				s.autoIntent = 'detached';
				this.stateManager.detach(s, i, order.length);
			} else {
				s.autoIntent = 'attached';
				this.stateManager.attach(s);
			}
		}
		this.scheduleEval();
	}

	collapseAllBut(n?: number): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();
		const keep = Math.max(0, Math.round(n ?? this.settings.keepRecent ?? 0));
		const nTurns = order.length;
		const tailStart = Math.max(0, nTurns - keep);

		for (let i = 0; i < nTurns; i++) {
			const s = this.stateManager.getState(order[i])!;
			if (s.userPin) continue; // skip pinned
			if (i < tailStart) {
				s.autoIntent = 'detached';
				this.stateManager.detach(s, i, nTurns);
			} else {
				s.autoIntent = 'attached';
				this.stateManager.attach(s);
			}
		}
		this.scheduleEval();
	}

	collapseBeforeIndex(i: number): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();
		const n = order.length;
		if (!n) return;

		// Clamp i to [0, n]. If i === 0 -> detach none. If i === n -> detach all.
		const cut = Math.max(0, Math.min(n, Math.floor(i)));

		for (let idx = 0; idx < n; idx++) {
			const s = this.stateManager.getState(order[idx])!;
			if (s.userPin) continue; // skip pinned
			if (idx < cut) {
				s.autoIntent = 'detached';
				this.stateManager.detach(s, idx, n);
			} else {
				s.autoIntent = 'attached';
				this.stateManager.attach(s);
			}
		}
		this.scheduleEval();
	}

	collapseBeforeId(id: string): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();
		const idx = order.indexOf(id);
		if (idx < 0) return; // unknown id; no-op
		this.collapseBeforeIndex(idx);
	}

	collapseBeforeViewport(): void {
		this.stateManager.refreshOrderAndStates();
		const order = this.stateManager.getOrder();
		const n = order.length;
		if (!n) return;

		const vh = window.innerHeight || document.documentElement.clientHeight || 0;
		let firstVisible = -1;

		for (let i = 0; i < n; i++) {
			const s = this.stateManager.getState(order[i])!;
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

		this.collapseBeforeIndex(firstVisible);
	}
}
