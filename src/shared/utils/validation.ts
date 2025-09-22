/**
 * Validation utilities for the virtualizer extension
 */

import type { Settings } from '@/shared/types/settings';

/**
 * Validate that a value is a finite number within bounds
 */
export function validateNumber(
	value: any,
	min = 0,
	max = 1000,
	defaultValue = min
): number {
	const num = Number.parseInt(String(value), 10);
	if (!Number.isFinite(num) || Number.isNaN(num)) return defaultValue;
	return Math.max(min, Math.min(max, num));
}

/**
 * Validate that a value is a boolean
 */
export function validateBoolean(value: any, defaultValue = false): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		return value.toLowerCase() === 'true';
	}
	return defaultValue;
}

/**
 * Validate that a value is a string within length bounds
 */
export function validateString(
	value: any,
	maxLength = 100,
	defaultValue = ''
): string {
	if (typeof value !== 'string') return defaultValue;
	return value.length > maxLength ? value.slice(0, maxLength) : value;
}

/**
 * Validate URL is a ChatGPT chat URL
 */
export function validateChatUrl(url?: string | null): boolean {
	if (!url || typeof url !== 'string') return false;
	return /^https:\/\/(chat\.openai|chatgpt)\.com\//.test(url);
}

/**
 * Validate tab ID is a positive integer
 */
export function validateTabId(tabId: any): number | null {
	const id = Number.parseInt(String(tabId), 10);
	if (!Number.isFinite(id) || Number.isNaN(id) || id <= 0) return null;
	return id;
}

/**
 * Validate settings object has all required properties with correct types
 */
export function validateSettings(settings: any): Partial<Settings> {
	if (!settings || typeof settings !== 'object') return {};

	const validated: Partial<Settings> = {};

	// Validate boolean settings
	if ('enabled' in settings) {
		validated.enabled = validateBoolean(settings.enabled);
	}

	if ('debug' in settings) {
		validated.debug = validateBoolean(settings.debug);
	}

	// Validate numeric settings
	if ('keepRecent' in settings) {
		validated.keepRecent = validateNumber(settings.keepRecent, 1, 10000, 3);
	}

	if ('minPlaceholderHeight' in settings) {
		validated.minPlaceholderHeight = validateNumber(
			settings.minPlaceholderHeight,
			1,
			100,
			64
		);
	}

	return validated;
}

/**
 * Validate message object has required structure
 */
export function validateMessage(msg: any): boolean {
	if (!msg || typeof msg !== 'object') return false;
	if (msg.__cgptVirt !== true) return false;
	if (!msg.type || typeof msg.type !== 'string') return false;
	return true;
}

/**
 * Validate array of tab IDs
 */
export function validateTabIds(tabIds: any): number[] {
	if (!Array.isArray(tabIds)) return [];
	return tabIds.map(validateTabId).filter((id): id is number => id !== null);
}

/**
 * Validate that an object has specific required properties
 */
export function validateRequiredProperties(
	obj: any,
	requiredProps: string[]
): boolean {
	if (!obj || typeof obj !== 'object') return false;
	return requiredProps.every((prop) => prop in obj);
}

/**
 * Sanitize HTML string by removing dangerous content
 */
export function sanitizeHtml(html: string): string {
	if (typeof html !== 'string') return '';

	// Basic sanitization - remove script tags and dangerous attributes
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/on\w+\s*=\s*"[^"]*"/gi, '')
		.replace(/on\w+\s*=\s*'[^']*'/gi, '')
		.replace(/javascript:/gi, '');
}

/**
 * Validate and clamp viewport buffer settings
 */
export function validateViewportBuffer(buffer: any): number {
	return validateNumber(buffer, 0, 2000, 500);
}

/**
 * Validate color hex code
 */
export function validateHexColor(color: any, defaultColor = '#000000'): string {
	if (typeof color !== 'string') return defaultColor;
	const hexPattern = /^#[0-9A-Fa-f]{6}$/;
	return hexPattern.test(color) ? color : defaultColor;
}
