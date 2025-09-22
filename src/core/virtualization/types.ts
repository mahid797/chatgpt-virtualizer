// src/core/virtualization/types.ts
import type { TurnInfo } from '@/core/dom/selectors';

export interface TurnState {
	info: TurnInfo;
	attached: boolean;
	placeholder?: HTMLElement;
	storedBody?: HTMLElement; // wrapper that contains ALL original article children (except our chevron)
	btn?: HTMLButtonElement;
	userPin?: 'attached' | null; // explicit user pin (authoritative; keeps the turn expanded)
	autoIntent?: 'attached' | 'detached' | null; // bulk tools/manual toggles
}
