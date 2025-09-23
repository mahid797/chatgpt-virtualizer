import type { VirtualizerHandle } from '@/core/virtualization';

/**
 * Handle incoming messages from background script
 */
export function handleMessage(
	msg: any,
	handle: VirtualizerHandle | null,
	applyEnabledState: (enabled: boolean) => void,
	startVirtualizer: () => VirtualizerHandle,
	destroyVirtualizer: () => void
): { ok: boolean; error?: string } {
	if (!msg || msg.__cgptVirt !== true) {
		return { ok: false, error: 'Invalid message format' };
	}

	try {
		switch (msg.type) {
			// Per-tab activation toggles
			case 'virt:tabEnable': {
				const shouldEnable = !!msg.payload?.enabled;
				if (shouldEnable && !handle) {
					const newHandle = startVirtualizer();
					(window as any).__cgptVirt = newHandle;
					applyEnabledState(true);
				} else if (!shouldEnable && handle) {
					destroyVirtualizer();
					applyEnabledState(false);
					delete (window as any).__cgptVirt;
				}
				break;
			}

			// Forwarded actions (work only when handle exists)
			case 'virt:expandAll':
				handle?.expandAll();
				break;
			case 'virt:collapseOlderThanVisible':
				handle?.collapseOlderThanVisible();
				break;
			case 'virt:collapseAllBut':
				handle?.collapseAllBut(Number(msg.payload?.n));
				break;
			case 'virt:collapseBefore':
				if (msg.payload?.index != null) {
					handle?.collapseBeforeIndex(Number(msg.payload.index));
				} else if (msg.payload?.id) {
					handle?.collapseBeforeId(String(msg.payload.id));
				}
				break;
			case 'virt:collapseBeforeViewport':
				handle?.collapseBeforeViewport();
				break;
			case 'virt:toggleTurn':
				if (msg.payload?.id) handle?.toggleTurn(String(msg.payload.id));
				break;

			default:
				return { ok: false, error: `Unknown message type: ${msg.type}` };
		}
		return { ok: true };
	} catch (e) {
		console.error('[cgpt-virt] content action error', e);
		return { ok: false, error: String(e) };
	}
}

/**
 * Query background script for tab enabled state
 */
export async function queryTabEnabled(): Promise<boolean> {
	try {
		const resp = await new Promise<{ ok: boolean; enabled?: boolean }>(
			(resolve, reject) => {
				chrome.runtime.sendMessage(
					{ __cgptVirt: true, type: 'virt:getTabEnabled' },
					(r) => {
						const err = chrome.runtime.lastError;
						if (err) reject(err);
						else resolve(r);
					}
				);
			}
		);
		return !!resp?.enabled;
	} catch {
		return false;
	}
}
