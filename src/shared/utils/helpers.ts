/**
 * General helper utilities for the virtualizer extension
 */

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends any[]>(
	func: (...args: T) => void,
	wait: number
): (...args: T) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: T) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Throttle function to limit how often a function can be called
 */
export function throttle<T extends any[]>(
	func: (...args: T) => void,
	limit: number
): (...args: T) => void {
	let inThrottle = false;

	return (...args: T) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Create a promise that resolves after a specified delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, etc.)
 */
export function isEmpty(value: any): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
}

/**
 * Deep clone an object (simple implementation for basic objects)
 */
export function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj;
	if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
	if (obj instanceof Array)
		return obj.map((item) => deepClone(item)) as unknown as T;
	if (typeof obj === 'object') {
		const cloned: any = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				cloned[key] = deepClone(obj[key]);
			}
		}
		return cloned;
	}
	return obj;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = 'id'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Get a nested property from an object safely
 */
export function getNestedProperty(
	obj: any,
	path: string,
	defaultValue?: any
): any {
	return path.split('.').reduce((current, key) => {
		return current && current[key] !== undefined ? current[key] : defaultValue;
	}, obj);
}

/**
 * Set a nested property in an object
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
	const keys = path.split('.');
	const lastKey = keys.pop();
	const target = keys.reduce((current, key) => {
		if (!current[key] || typeof current[key] !== 'object') {
			current[key] = {};
		}
		return current[key];
	}, obj);

	if (lastKey) {
		target[lastKey] = value;
	}
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
	return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T extends Record<string, any>>(
	target: T,
	source: Partial<T>
): T {
	const result = deepClone(target);

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				result[key] = deepMerge(targetValue, sourceValue);
			} else {
				result[key] = sourceValue as any;
			}
		}
	}

	return result;
}

/**
 * Create a simple logger with different levels
 */
export function createLogger(namespace: string, debug = false) {
	const log = (level: string, ...args: any[]) => {
		if (!debug && level === 'debug') return;
		const prefix = `[${namespace}]`;

		switch (level) {
			case 'error':
				console.error(prefix, ...args);
				break;
			case 'warn':
				console.warn(prefix, ...args);
				break;
			case 'debug':
				console.log(prefix, ...args);
				break;
			default:
				console.log(prefix, ...args);
		}
	};

	return {
		error: (...args: any[]) => log('error', ...args),
		warn: (...args: any[]) => log('warn', ...args),
		info: (...args: any[]) => log('info', ...args),
		debug: (...args: any[]) => log('debug', ...args),
	};
}

/**
 * Calculate viewport information
 */
export function getViewportInfo() {
	return {
		width: window.innerWidth,
		height: window.innerHeight,
		scrollTop: window.pageYOffset || document.documentElement.scrollTop,
		scrollLeft: window.pageXOffset || document.documentElement.scrollLeft,
	};
}

/**
 * Check if an element is visible in the viewport
 */
export function isElementInViewport(element: Element, buffer = 0): boolean {
	const rect = element.getBoundingClientRect();
	const viewport = getViewportInfo();

	return (
		rect.top >= -buffer &&
		rect.left >= -buffer &&
		rect.bottom <= viewport.height + buffer &&
		rect.right <= viewport.width + buffer
	);
}
