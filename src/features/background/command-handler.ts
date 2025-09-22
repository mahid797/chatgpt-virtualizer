/**
 * Keyboard command handling for the virtualizer extension
 * Manages keyboard shortcuts and forwards them to enabled tabs
 */

import { getActiveChatTab, isTabEnabled, sendToTab } from './tab-manager';

/**
 * Handle keyboard shortcuts from manifest commands.
 * Only forward when the current active tab is enabled.
 */
export async function handleCommand(command: string): Promise<void> {
	try {
		const tab = await getActiveChatTab();
		const enabled = await isTabEnabled(tab.id!);
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
}

/**
 * Setup keyboard command listeners
 */
export function setupCommandHandlers(): void {
	chrome.commands?.onCommand.addListener(handleCommand);
}

/**
 * Available commands
 */
export const COMMANDS = {
	EXPAND_ALL: 'virt_expand_all',
	COLLAPSE_OLDER_THAN_VISIBLE: 'virt_collapse_older_than_visible',
} as const;

export type CommandType = (typeof COMMANDS)[keyof typeof COMMANDS];
