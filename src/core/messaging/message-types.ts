/**
 * Centralized message type definitions for extension communication
 */

// Base message structure
export interface BaseMessage {
	__cgptVirt: true;
	type: string;
	payload?: any;
}

// Response structure
export interface MessageResponse {
	ok: boolean;
	error?: string;
	[key: string]: any;
}

// Specific message types
export interface GetTabEnabledMessage extends BaseMessage {
	type: 'virt:getTabEnabled';
}

export interface GetTabEnabledResponse extends MessageResponse {
	enabled: boolean;
	tabId: number;
}

export interface SetTabEnabledMessage extends BaseMessage {
	type: 'virt:setTabEnabled';
	payload: {
		enabled: boolean;
	};
}

export interface ExpandAllMessage extends BaseMessage {
	type: 'virt:expandAll';
}

export interface CollapseAllMessage extends BaseMessage {
	type: 'virt:collapseAll';
}

export interface UpdateSettingsMessage extends BaseMessage {
	type: 'virt:updateSettings';
	payload: {
		settings: Record<string, any>;
	};
}

export interface VirtualizerActionMessage extends BaseMessage {
	type: 'virt:action';
	payload: {
		action: 'expand' | 'collapse' | 'updateSettings';
		data?: any;
	};
}

// Union types for type safety
export type VirtualizerMessage =
	| GetTabEnabledMessage
	| SetTabEnabledMessage
	| ExpandAllMessage
	| CollapseAllMessage
	| UpdateSettingsMessage
	| VirtualizerActionMessage;

// Message type constants
export const MESSAGE_TYPES = {
	GET_TAB_ENABLED: 'virt:getTabEnabled',
	SET_TAB_ENABLED: 'virt:setTabEnabled',
	EXPAND_ALL: 'virt:expandAll',
	COLLAPSE_ALL: 'virt:collapseAll',
	UPDATE_SETTINGS: 'virt:updateSettings',
	ACTION: 'virt:action',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
