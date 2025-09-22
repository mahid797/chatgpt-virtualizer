import type { Settings } from '../common/constants';
import { getSettings, onSettingsChanged } from '../common/storage';
import { startVirtualizer, type VirtualizerHandle } from './virtualization';
import { injectDebugStyles } from './injector';

function applyEnabledState(enabled: boolean) {
	const root = document.documentElement;
	if (enabled) {
		root.setAttribute('data-cgpt-virt', 'on');
	} else {
		root.removeAttribute('data-cgpt-virt');
	}
}

let handle: VirtualizerHandle | null = null;
let current: Settings | null = null;

async function boot() {
	current = await getSettings();

	// Optional: lightweight debug visuals
	if (current.debug) injectDebugStyles();

	// Start disabled by default; per-tab enablement controls activation.
	applyEnabledState(false);

	// Query background: is this tab enabled?
	let resp: { ok: boolean; enabled?: boolean } | undefined;
	try {
		resp = await new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(
				{ __cgptVirt: true, type: 'virt:getTabEnabled' },
				(r) => {
					const err = chrome.runtime.lastError;
					if (err) reject(err);
					else resolve(r);
				}
			);
		});
	} catch {
		// ignore
	}

	const tabEnabled = !!resp?.enabled;
	if (tabEnabled) {
		handle = startVirtualizer(current!);
		(window as any).__cgptVirt = handle;
		applyEnabledState(true);
	}

	// React to future settings changes (tune parameters only)
	onSettingsChanged((next) => {
		current = next;
		if (next.debug) injectDebugStyles();
		if (handle) {
			handle.updateSettings(next);
		}
		// NOTE: enabled flag in Settings is ignored for per-tab activation.
	});

	// Listen for background -> content control + forwarded actions
	chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
		if (!msg || msg.__cgptVirt !== true) return;

		try {
			switch (msg.type) {
				// Per-tab activation toggles
				case 'virt:tabEnable': {
					const shouldEnable = !!msg.payload?.enabled;
					if (shouldEnable && !handle) {
						handle = startVirtualizer(current!);
						(window as any).__cgptVirt = handle;
						applyEnabledState(true);
					} else if (!shouldEnable && handle) {
						handle.destroy();
						handle = null;
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
			}
			sendResponse?.({ ok: true });
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('[cgpt-virt] content action error', e);
			sendResponse?.({ ok: false, error: String(e) });
		}
		return true; // keep async channel open if needed
	});
}

boot().catch(console.error);
