/**
 * MV3 service worker (ESM)
 * - Initializes settings on install/startup.
 * - Coordinates tab management and message routing.
 * - Handles keyboard commands through dedicated modules.
 */

import { ensureSettingsInitialized } from '@/shared/storage';
import {
	getActiveChatTab,
	isTabEnabled,
	setTabEnabled,
	sendToTab,
	handleTabRemoved,
	handleTabUpdated,
} from './tab-manager';
import { setupCommandHandlers } from './command-handler';

chrome.runtime.onInstalled.addListener(async () => {
	await ensureSettingsInitialized();
});

/**
 * Message handler: processes popup requests and forwards virtualizer actions
 * only if that tab is enabled.
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (!msg || msg.__cgptVirt !== true) return;

	(async () => {
		try {
			// Tab-scoped enablement reads active tab by default.
			if (msg.type === 'virt:getTabEnabled') {
				const tab = await getActiveChatTab();
				const enabled = await isTabEnabled(tab.id!);
				sendResponse({ ok: true, enabled, tabId: tab.id });
				return;
			}

			if (msg.type === 'virt:setTabEnabled') {
				const tab = await getActiveChatTab();
				const nextEnabled = !!msg.payload?.enabled;

				await setTabEnabled(tab.id!, nextEnabled);
				sendResponse({ ok: true, enabled: nextEnabled, tabId: tab.id });
				return;
			}

			// For all other virt:* actions, forward ONLY if active tab is enabled.
			const tab = await getActiveChatTab();
			const enabled = await isTabEnabled(tab.id!);
			if (!enabled) {
				sendResponse({
					ok: false,
					error: 'Virtualizer is not enabled on this tab.',
				});
				return;
			}

			// Forward the action to the enabled chat tab.
			const resp = await sendToTab(tab.id!, msg);
			sendResponse(resp ?? { ok: true });
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('[cgpt-virt] bg error:', e);
			sendResponse({ ok: false, error: String(e) });
		}
	})();

	return true; // keep channel open for async response
});

// Setup keyboard command handlers
setupCommandHandlers();

// Setup tab event listeners
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
