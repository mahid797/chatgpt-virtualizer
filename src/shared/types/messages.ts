/**
 * Message types for extension communication
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

// Tab management messages
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
		tabId?: number;
	};
}

export interface TabEnableMessage extends BaseMessage {
	type: 'virt:tabEnable';
	payload: {
		enabled: boolean;
	};
}

// Virtualization action messages
export interface ExpandAllMessage extends BaseMessage {
	type: 'virt:expandAll';
}

export interface CollapseOlderThanVisibleMessage extends BaseMessage {
	type: 'virt:collapseOlderThanVisible';
}

export interface CollapseAllButMessage extends BaseMessage {
	type: 'virt:collapseAllBut';
	payload: {
		n: number;
	};
}

export interface CollapseBeforeMessage extends BaseMessage {
	type: 'virt:collapseBefore';
	payload: {
		index?: number;
		id?: string;
	};
}

export interface CollapseBeforeViewportMessage extends BaseMessage {
	type: 'virt:collapseBeforeViewport';
}

export interface ToggleTurnMessage extends BaseMessage {
	type: 'virt:toggleTurn';
	payload: {
		id: string;
	};
}

// Union type for all messages
export type VirtualizerMessage =
	| GetTabEnabledMessage
	| SetTabEnabledMessage
	| TabEnableMessage
	| ExpandAllMessage
	| CollapseOlderThanVisibleMessage
	| CollapseAllButMessage
	| CollapseBeforeMessage
	| CollapseBeforeViewportMessage
	| ToggleTurnMessage;
