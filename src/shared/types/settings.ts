/**
 * Settings types - user preferences and configuration
 */

/** User-tunable options (persisted) */
export interface Settings {
	/** Master on/off toggle */
	enabled: boolean;
	/** Number of most-recent turns to always keep mounted */
	keepRecent: number; // e.g., 8
	/** Minimum placeholder height for collapsed turns (px) */
	minPlaceholderHeight: number; // e.g., 64
	/** Dev-only logging in console */
	debug: boolean;
}

/** Defaults applied on first run and when merging partial updates */
export const DEFAULT_SETTINGS: Settings = {
	enabled: true,
	keepRecent: 3,
	minPlaceholderHeight: 64,
	debug: false,
} as const;

/** Partial settings for updates */
export type SettingsUpdate = Partial<Settings>;
