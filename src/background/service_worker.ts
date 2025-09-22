/**
 * MV3 service worker (ESM)
 * - Initializes settings on install/startup.
 * - Maintains a per-tab "enabled" list so the content script only runs where requested.
 * - Forwards popup actions and keyboard commands to the active ChatGPT tab (when enabled).
 */

import { ensureSettingsInitialized } from '../common/storage';

const ENABLED_TABS_KEY = 'cgpt-virt:enabledTabs'; // storage.session key

type EnabledTabSet = number[];

/** Helpers to read/write the enabled set in session storage (survives SW restarts during the browser session). */
async function readEnabledTabs(): Promise<Set<number>> {
	const raw = await chrome.storage.session.get(ENABLED_TABS_KEY);
	const arr = Array.isArray(raw?.[ENABLED_TABS_KEY])
		? (raw[ENABLED_TABS_KEY] as EnabledTabSet)
		: [];
	return new Set(arr);
}
async function writeEnabledTabs(set: Set<number>): Promise<void> {
	await chrome.storage.session.set({ [ENABLED_TABS_KEY]: [...set] });
}

/** True if a URL is a ChatGPT chat host. */
function isChatUrl(url?: string | null): boolean {
	if (!url) return false;
	return /^https:\/\/(chat\.openai|chatgpt)\.com\//.test(url);
}

/** Get the active tab (must be a ChatGPT host or we throw). */
async function getActiveChatTab(): Promise<chrome.tabs.Tab> {
	const tabs = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	});
	const tab = tabs[0];
	if (!tab?.id || !tab.url) throw new Error('No active tab');
	if (!isChatUrl(tab.url)) throw new Error('Active tab is not a ChatGPT chat');
	return tab;
}

/** Send a message to a specific tabId. */
async function sendToTab(tabId: number, message: any): Promise<any> {
	return chrome.tabs.sendMessage(tabId, message);
}

chrome.runtime.onInstalled.addListener(async () => {
	await ensureSettingsInitialized();
});

chrome.runtime.onStartup?.addListener(async () => {
	await ensureSettingsInitialized();
});

/**
 * Handle messages from popup/content.
 * We intercept tab-scoped control messages here; other virt:* actions are forwarded to the active tab
 * only if that tab is enabled.
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (!msg || msg.__cgptVirt !== true) return;

	(async () => {
		try {
			// Tab-scoped enablement reads active tab by default.
			if (msg.type === 'virt:getTabEnabled') {
				const tab = await getActiveChatTab();
				const enabled = (await readEnabledTabs()).has(tab.id!);
				sendResponse({ ok: true, enabled, tabId: tab.id });
				return;
			}

			if (msg.type === 'virt:setTabEnabled') {
				const tab = await getActiveChatTab();
				const enabledTabs = await readEnabledTabs();

				const nextEnabled = !!msg.payload?.enabled;
				if (nextEnabled) {
					enabledTabs.add(tab.id!);
				} else {
					enabledTabs.delete(tab.id!);
				}
				await writeEnabledTabs(enabledTabs);

				// Notify content script on that tab to enable/disable immediately
				try {
					await sendToTab(tab.id!, {
						__cgptVirt: true,
						type: 'virt:tabEnable',
						payload: { enabled: nextEnabled },
					});
				} catch {
					// Content might not be injected yet; ignore.
				}

				sendResponse({ ok: true, enabled: nextEnabled, tabId: tab.id });
				return;
			}

			// For all other virt:* actions, forward ONLY if active tab is enabled.
			const tab = await getActiveChatTab();
			const enabled = (await readEnabledTabs()).has(tab.id!);
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

/**
 * Keyboard shortcuts (manifest "commands").
 * Only forward when the current active tab is enabled.
 */
chrome.commands?.onCommand.addListener(async (command) => {
	try {
		const tab = await getActiveChatTab();
		const enabled = (await readEnabledTabs()).has(tab.id!);
		if (!enabled) return;

		if (command === 'virt_expand_all') {
			await sendToTab(tab.id!, { __cgptVirt: true, type: 'virt:expandAll' });
		} else if (command === 'virt_collapse_older_than_visible') {
			await sendToTab(tab.id!, {
				__cgptVirt: true,
				type: 'virt:collapseBeforeViewport',
			});
		}
	} catch (e) {
		// eslint-disable-next-line no-console
		console.warn('[cgpt-virt] command dispatch failed:', command, e);
	}
});

/** Cleanup: when a tab closes, drop it from the enabled set. */
chrome.tabs.onRemoved.addListener(async (tabId) => {
	const set = await readEnabledTabs();
	if (set.delete(tabId)) await writeEnabledTabs(set);
});

/** If a tab navigates away from ChatGPT, also disable for that tab. */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === 'loading' && tab?.url && !isChatUrl(tab.url)) {
		const set = await readEnabledTabs();
		if (set.delete(tabId)) await writeEnabledTabs(set);
	}
});
