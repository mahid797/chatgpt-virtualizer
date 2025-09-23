/**
 * Message protocol definition for extension communication
 */

import type { BaseMessage, MessageResponse } from '@/shared/types/messages';

/** Namespace identifier for all virtualizer messages */
export const MESSAGE_NAMESPACE = '__cgptVirt';

/** Create a standardized message */
export function createMessage<T extends BaseMessage>(
	type: T['type'],
	payload?: T['payload']
): T {
	return {
		__cgptVirt: true,
		type,
		payload,
	} as T;
}

/** Create a standardized response */
export function createResponse(
	ok: boolean,
	data?: any,
	error?: string
): MessageResponse {
	return {
		ok,
		error,
		...data,
	};
}

/** Check if a message is a virtualizer message */
export function isVirtualizerMessage(msg: any): msg is BaseMessage {
	return msg && msg.__cgptVirt === true && typeof msg.type === 'string';
}

/** Message type constants */
export const MESSAGE_TYPES = {
	// Tab management
	GET_TAB_ENABLED: 'virt:getTabEnabled',
	SET_TAB_ENABLED: 'virt:setTabEnabled',
	TAB_ENABLE: 'virt:tabEnable',

	// Virtualization actions
	EXPAND_ALL: 'virt:expandAll',
	COLLAPSE_OLDER_THAN_VISIBLE: 'virt:collapseOlderThanVisible',
	COLLAPSE_ALL_BUT: 'virt:collapseAllBut',
	COLLAPSE_BEFORE: 'virt:collapseBefore',
	COLLAPSE_BEFORE_VIEWPORT: 'virt:collapseBeforeViewport',
	TOGGLE_TURN: 'virt:toggleTurn',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
