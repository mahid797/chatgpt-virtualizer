/**
 * Messaging client utilities for sending messages
 */

import type { BaseMessage, MessageResponse } from '@/shared/types/messages';
import { isVirtualizerMessage } from './protocol';

/** Promise-based message sending utility */
export class MessageClient {
	/**
	 * Send a message to the background script
	 */
	static async sendToBackground<T extends MessageResponse = MessageResponse>(
		message: BaseMessage
	): Promise<T> {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(message, (response) => {
				const error = chrome.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}

				if (response && response.ok) {
					resolve(response);
				} else {
					reject(new Error(response?.error || 'Unknown error'));
				}
			});
		});
	}

	/**
	 * Send a message to a specific tab
	 */
	static async sendToTab<T extends MessageResponse = MessageResponse>(
		tabId: number,
		message: BaseMessage
	): Promise<T> {
		return new Promise((resolve, reject) => {
			chrome.tabs.sendMessage(tabId, message, (response) => {
				const error = chrome.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}

				if (response && response.ok) {
					resolve(response);
				} else {
					reject(new Error(response?.error || 'Unknown error'));
				}
			});
		});
	}

	/**
	 * Send a message to all tabs
	 */
	static async sendToAllTabs<T extends MessageResponse = MessageResponse>(
		message: BaseMessage
	): Promise<T[]> {
		const tabs = await chrome.tabs.query({});
		const promises = tabs
			.filter((tab) => tab.id !== undefined)
			.map((tab) => this.sendToTab<T>(tab.id!, message).catch(() => null));

		const results = await Promise.all(promises);
		return results.filter((result) => result !== null) as T[];
	}
}

/** Message listener utility */
export function createMessageListener(
	handler: (
		message: BaseMessage,
		sender: chrome.runtime.MessageSender
	) => Promise<MessageResponse> | MessageResponse
) {
	return (
		message: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: MessageResponse) => void
	) => {
		if (!isVirtualizerMessage(message)) return false;

		Promise.resolve(handler(message, sender))
			.then((response) => sendResponse(response))
			.catch((error) => {
				sendResponse({
					ok: false,
					error: error.message || 'Unknown error',
				});
			});

		return true; // Keep message channel open for async response
	};
}
