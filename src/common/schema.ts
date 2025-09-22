/**
 * Lightweight runtime shaping of Settings objects.
 * No external deps (zod/etc.) — keep it simple and fast.
 */

import { DEFAULT_SETTINGS, type Settings } from './constants';

/** Coerce a number with sane fallbacks and optional clamping. */
function num(
	value: unknown,
	fallback: number,
	min?: number,
	max?: number
): number {
	let n =
		typeof value === 'number'
			? value
			: typeof value === 'string'
			? Number(value)
			: NaN;
	if (!Number.isFinite(n)) n = fallback;
	if (typeof min === 'number' && n < min) n = min;
	if (typeof max === 'number' && n > max) n = max;
	return n;
}

function bool(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const v = value.toLowerCase().trim();
		if (v === 'true' || v === '1') return true;
		if (v === 'false' || v === '0') return false;
	}
	return fallback;
}

/** Merge arbitrary input into a well-formed Settings object. */
export function sanitizeSettings(input: unknown): Settings {
	const i = (input ?? {}) as Partial<Record<keyof Settings, unknown>>;

	return {
		enabled: bool(i.enabled, DEFAULT_SETTINGS.enabled),
		keepRecent: num(i.keepRecent, DEFAULT_SETTINGS.keepRecent, 0, 1000),
		minPlaceholderHeight: num(
			i.minPlaceholderHeight,
			DEFAULT_SETTINGS.minPlaceholderHeight,
			16,
			2000
		),
		debug: bool(i.debug, DEFAULT_SETTINGS.debug),
	};
}

/** Shallow compare helper for Settings. */
export function settingsEqual(a: Settings, b: Settings): boolean {
	return (
		a.enabled === b.enabled &&
		a.keepRecent === b.keepRecent &&
		a.minPlaceholderHeight === b.minPlaceholderHeight &&
		a.debug === b.debug
	);
}
