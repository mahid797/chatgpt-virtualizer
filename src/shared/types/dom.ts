/**
 * DOM-related types for virtualization
 */

/** Turn state tracking */
export interface TurnState {
	id: string;
	element: HTMLElement;
	placeholder?: HTMLElement;
	isVisible: boolean;
	isCollapsed: boolean;
	lastHeight?: number;
}

/** DOM selector types */
export interface DOMSelectors {
	turnArticle: string;
	roleAttribute: string;
	conversationContainer: string;
	messageContent: string;
}

/** Viewport information */
export interface ViewportInfo {
	top: number;
	bottom: number;
	height: number;
}

/** Element bounds */
export interface ElementBounds {
	top: number;
	bottom: number;
	height: number;
	width: number;
}

/** Virtualization options */
export interface VirtualizationOptions {
	keepRecent: number;
	minPlaceholderHeight: number;
	debug: boolean;
}
