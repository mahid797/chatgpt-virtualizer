/**
 * Error handling utilities for the virtualizer extension
 */

/**
 * Base error class for virtualizer-specific errors
 */
export class VirtualizerError extends Error {
	constructor(message: string, public code: string) {
		super(message);
		this.name = 'VirtualizerError';
	}
}

/**
 * Error thrown when a tab is not a ChatGPT tab
 */
export class InvalidTabError extends VirtualizerError {
	constructor(message = 'Tab is not a ChatGPT chat') {
		super(message, 'INVALID_TAB');
	}
}

/**
 * Error thrown when virtualizer is not enabled on a tab
 */
export class TabNotEnabledError extends VirtualizerError {
	constructor(message = 'Virtualizer is not enabled on this tab') {
		super(message, 'TAB_NOT_ENABLED');
	}
}

/**
 * Error thrown when no active tab is found
 */
export class NoActiveTabError extends VirtualizerError {
	constructor(message = 'No active tab found') {
		super(message, 'NO_ACTIVE_TAB');
	}
}

/**
 * Error thrown when messaging fails
 */
export class MessagingError extends VirtualizerError {
	constructor(message = 'Message sending failed') {
		super(message, 'MESSAGING_ERROR');
	}
}

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends VirtualizerError {
	constructor(message = 'Storage operation failed') {
		super(message, 'STORAGE_ERROR');
	}
}

/**
 * Error codes enum for easy reference
 */
export const ERROR_CODES = {
	INVALID_TAB: 'INVALID_TAB',
	TAB_NOT_ENABLED: 'TAB_NOT_ENABLED',
	NO_ACTIVE_TAB: 'NO_ACTIVE_TAB',
	MESSAGING_ERROR: 'MESSAGING_ERROR',
	STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Utility function to safely handle async operations
 */
export async function safeAsync<T>(
	operation: () => Promise<T>,
	fallback?: T
): Promise<T | undefined> {
	try {
		return await operation();
	} catch (error) {
		console.warn('[cgpt-virt] Safe async operation failed:', error);
		return fallback;
	}
}

/**
 * Utility function to wrap operations with error handling
 */
export function withErrorHandling<T extends any[], R>(
	fn: (...args: T) => R,
	errorHandler?: (error: Error) => void
) {
	return (...args: T): R | undefined => {
		try {
			return fn(...args);
		} catch (error) {
			if (errorHandler) {
				errorHandler(error as Error);
			} else {
				console.error('[cgpt-virt] Operation failed:', error);
			}
			return undefined;
		}
	};
}
