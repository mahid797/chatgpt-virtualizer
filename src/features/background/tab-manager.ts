/**
 * Tab state management for the virtualizer extension
 * Handles enabled tab tracking and ChatGPT URL validation
 */

const ENABLED_TABS_KEY = 'cgpt-virt:enabledTabs'; // storage.session key

type EnabledTabSet = number[];

/** Helpers to read/write the enabled set in session storage (survives SW restarts during the browser session). */
export async function readEnabledTabs(): Promise<Set<number>> {
	const raw = await chrome.storage.session.get(ENABLED_TABS_KEY);
	const arr = Array.isArray(raw?.[ENABLED_TABS_KEY])
		? (raw[ENABLED_TABS_KEY] as EnabledTabSet)
		: [];
	return new Set(arr);
}

export async function writeEnabledTabs(set: Set<number>): Promise<void> {
	await chrome.storage.session.set({ [ENABLED_TABS_KEY]: [...set] });
}

/** True if a URL is a ChatGPT chat host. */
export function isChatUrl(url?: string | null): boolean {
	if (!url) return false;
	return /^https:\/\/(chat\.openai|chatgpt)\.com\//.test(url);
}

/** Utility to show error notifications */
function showErrorNotification(message: string): void {
	chrome.notifications.create({
		type: 'basic',
		iconUrl: 'assets/icon.png', // Ensure this icon exists in your extension
		title: 'ChatGPT Virtualizer Error',
		message,
	});
}

/** Get the active tab (must be a ChatGPT host or we throw). */
export async function getActiveChatTab(): Promise<chrome.tabs.Tab> {
	const tabs = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	});
	const tab = tabs[0];
	if (!tab?.id || !tab.url) {
		showErrorNotification('No active tab found.');
		// throw new Error('No active tab');
	}
	if (!isChatUrl(tab.url)) {
		showErrorNotification('Active tab is not a ChatGPT chat.');
		// throw new Error('Active tab is not a ChatGPT chat');
	}

	return tab;
}

/** Send a message to a specific tabId. */
export async function sendToTab(tabId: number, message: any): Promise<any> {
	return chrome.tabs.sendMessage(tabId, message);
}

/** Enable or disable virtualizer for a specific tab */
export async function setTabEnabled(
	tabId: number,
	enabled: boolean
): Promise<void> {
	const enabledTabs = await readEnabledTabs();

	if (enabled) {
		enabledTabs.add(tabId);
	} else {
		enabledTabs.delete(tabId);
	}

	await writeEnabledTabs(enabledTabs);

	// Notify content script on that tab to enable/disable immediately
	try {
		await sendToTab(tabId, {
			__cgptVirt: true,
			type: 'virt:tabEnable',
			payload: { enabled },
		});
	} catch {
		// Content might not be injected yet; ignore.
	}
}

/** Check if a tab is enabled */
export async function isTabEnabled(tabId: number): Promise<boolean> {
	const enabledTabs = await readEnabledTabs();
	return enabledTabs.has(tabId);
}

/** Cleanup: when a tab closes, drop it from the enabled set. */
export async function handleTabRemoved(tabId: number): Promise<void> {
	const set = await readEnabledTabs();
	if (set.delete(tabId)) await writeEnabledTabs(set);
}

/** If a tab navigates away from ChatGPT, also disable for that tab. */
export async function handleTabUpdated(
	tabId: number,
	changeInfo: any,
	tab: chrome.tabs.Tab
): Promise<void> {
	if (changeInfo.status === 'loading' && tab?.url && !isChatUrl(tab.url)) {
		const set = await readEnabledTabs();
		if (set.delete(tabId)) await writeEnabledTabs(set);
	}
}
