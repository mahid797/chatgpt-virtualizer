/**
 * Schema validation for storage data
 */

import type { Settings } from '@/shared/types/settings';

/** Validate settings object structure */
export function validateSettings(obj: any): obj is Settings {
	if (!obj || typeof obj !== 'object') return false;

	return (
		typeof obj.enabled === 'boolean' &&
		typeof obj.keepRecent === 'number' &&
		typeof obj.minPlaceholderHeight === 'number' &&
		typeof obj.debug === 'boolean' &&
		obj.keepRecent >= 0 &&
		obj.minPlaceholderHeight >= 0
	);
}

/** Validate partial settings update */
export function validateSettingsUpdate(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;

	// Check each property if present
	if ('enabled' in obj && typeof obj.enabled !== 'boolean') return false;
	if (
		'keepRecent' in obj &&
		(typeof obj.keepRecent !== 'number' || obj.keepRecent < 0)
	)
		return false;
	if (
		'minPlaceholderHeight' in obj &&
		(typeof obj.minPlaceholderHeight !== 'number' ||
			obj.minPlaceholderHeight < 0)
	)
		return false;
	if ('debug' in obj && typeof obj.debug !== 'boolean') return false;

	return true;
}

/** Sanitize settings object */
export function sanitizeSettings(obj: any): Partial<Settings> {
	const result: Partial<Settings> = {};

	if (typeof obj?.enabled === 'boolean') result.enabled = obj.enabled;
	if (typeof obj?.keepRecent === 'number' && obj.keepRecent >= 0)
		result.keepRecent = obj.keepRecent;
	if (
		typeof obj?.minPlaceholderHeight === 'number' &&
		obj.minPlaceholderHeight >= 0
	)
		result.minPlaceholderHeight = obj.minPlaceholderHeight;
	if (typeof obj?.debug === 'boolean') result.debug = obj.debug;

	return result;
}
