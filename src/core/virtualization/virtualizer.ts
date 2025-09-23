// src/core/virtualization/virtualizer.ts (Refactored)
import type { Settings } from '@/shared/types/settings';
import { TurnStateManager } from './state-manager';
import { BulkOperations } from './bulk-operations';

export interface VirtualizerHandle {
	updateSettings(next: Partial<Settings>): void;
	destroy(): void;
	// Bulk ops
	expandAll(): void;
	collapseOlderThanVisible(): void;
	collapseAllBut(n?: number): void;
	collapseBeforeIndex(i: number): void;
	collapseBeforeId(id: string): void;
	collapseBeforeViewport(): void;
	// Per-turn
	toggleTurn(id: string): void;
}

export function startVirtualizer(initial: Settings): VirtualizerHandle {
	let settings: Settings = { ...initial };
	let destroyed = false;
	let pendingEval = false;

	function scheduleEval() {
		if (pendingEval) return;
		pendingEval = true;
		requestAnimationFrame(() => {
			pendingEval = false;
			evaluate();
		});
	}

	// Initialize managers
	const stateManager = new TurnStateManager(settings, scheduleEval);
	const bulkOps = new BulkOperations(stateManager, settings, scheduleEval);

	function evaluate() {
		if (destroyed) return;
		stateManager.evaluate();
	}

	// MutationObserver: turns being added/removed/edited => re-evaluate tail policy.
	const mo = new MutationObserver((records) => {
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
			stateManager.updateSettings(settings);
			bulkOps.updateSettings(settings);
			scheduleEval();
		},
		destroy() {
			destroyed = true;
			mo?.disconnect();
			stateManager.destroy();
		},

		// Delegate to bulk operations
		expandAll: () => bulkOps.expandAll(),
		collapseOlderThanVisible: () => bulkOps.collapseOlderThanVisible(),
		collapseAllBut: (n?: number) => bulkOps.collapseAllBut(n),
		collapseBeforeIndex: (i: number) => bulkOps.collapseBeforeIndex(i),
		collapseBeforeId: (id: string) => bulkOps.collapseBeforeId(id),
		collapseBeforeViewport: () => bulkOps.collapseBeforeViewport(),

		// Per-turn operations
		toggleTurn(id: string) {
			stateManager.toggleById(id);
		},
	};
}
