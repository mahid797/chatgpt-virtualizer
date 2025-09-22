/**
 * DOM selectors/utilities for locating ChatGPT conversation turns reliably.
 * We key off <article data-turn-id="..."> as the turn root and try to pick the
 * *heavy message content* subtree (not toolbars/footers) for detaching.
 */

export type Role = 'assistant' | 'user' | 'system' | 'tool' | 'other';

export interface TurnInfo {
	/** The <article data-turn-id="..."> element */
	root: HTMLElement;
	/** Stable turn id from the DOM */
	id: string;
	/** Best-effort role parsed from descendants */
	role: Role;
	/** The heavy subtree we intend to detach/restore when virtualizing */
	body: HTMLElement;
}

export const TURN_SELECTOR = 'article[data-turn-id]';
const ROLE_CONTAINER_SELECTOR = '[data-message-author-role]';

// Heuristics: common content containers we prefer when present (deepest wins)
const PREFERRED_CONTENT_SELECTORS = [
	// Exact/likely content wrappers seen across variants
	'.text-message',
	'[data-testid="text-message"]',
	'[data-message-content]',
	'[data-message-markdown]',
	'[data-message-id]', // often on the content block
];

// Elements we do NOT want to detach (toolbars/footers/chrome)
function looksLikeActionOrFooter(el: Element): boolean {
	const role = (el.getAttribute('role') || '').toLowerCase();
	if (role === 'toolbar') return true;

	const testid = (el.getAttribute('data-testid') || '').toLowerCase();
	if (
		testid.includes('toolbar') ||
		testid.includes('actions') ||
		testid.includes('shadow-actions') ||
		testid.includes('sources') ||
		testid.includes('footnote') ||
		testid.includes('footer')
	) {
		return true;
	}

	const cls = (el.getAttribute('class') || '').toLowerCase();
	if (
		cls.includes('action') ||
		cls.includes('toolbar') ||
		cls.includes('sources') ||
		cls.includes('footnote') ||
		cls.includes('footer')
	) {
		return true;
	}

	return false;
}

/** Parse a role value from the closest role container under the article. */
export function getRole(el: Element): Role {
	const roleEl = el.querySelector(
		ROLE_CONTAINER_SELECTOR
	) as HTMLElement | null;
	const raw = roleEl?.getAttribute('data-message-author-role')?.toLowerCase();
	if (
		raw === 'assistant' ||
		raw === 'user' ||
		raw === 'system' ||
		raw === 'tool'
	)
		return raw;
	return 'other';
}

/**
 * Try to choose the *heavy* content subtree under an article. We:
 *  1) Prefer known content containers under [data-message-author-role]
 *  2) Otherwise, choose the largest descendant element that doesn't look like a toolbar/footer
 *  3) Fall back to the role container, then firstElementChild, then the article itself
 */
export function getDetachableSubtree(article: Element): HTMLElement {
	// 0) Gather role containers (there is usually exactly one)
	const roleContainers = Array.from(
		article.querySelectorAll<HTMLElement>(ROLE_CONTAINER_SELECTOR)
	);
	const primary = roleContainers[0] as HTMLElement | undefined;

	// Helper: return the largest by bounding height from a set of candidates
	const pickLargest = (els: HTMLElement[]): HTMLElement | null => {
		let best: { el: HTMLElement; h: number } | null = null;
		for (const el of els) {
			if (!el.isConnected) continue;
			if (looksLikeActionOrFooter(el)) continue;

			const rect = el.getBoundingClientRect();
			const h = Math.max(0, rect.height || 0);
			// Ignore tiny elements (< 20px tall) to avoid headers/labels
			if (h < 20) continue;

			if (!best || h > best.h) best = { el, h };
		}
		return best?.el ?? null;
	};

	// 1) Preferred content under role container(s)
	for (const rc of roleContainers) {
		// Try exact preferred selectors first (deep search under role)
		for (const sel of PREFERRED_CONTENT_SELECTORS) {
			const matches = Array.from(rc.querySelectorAll<HTMLElement>(sel)).filter(
				(el) => !looksLikeActionOrFooter(el)
			);
			const top = pickLargest(matches);
			if (top) return top;
		}

		// If none matched, choose the largest reasonable descendant under the role container.
		const allDesc = Array.from(rc.querySelectorAll<HTMLElement>(':scope *'));
		const large = pickLargest(allDesc);
		if (large) return large;
	}

	// 2) Fallbacks when role container is missing or empty:
	// Try any preferred content directly under the article.
	for (const sel of PREFERRED_CONTENT_SELECTORS) {
		const matches = Array.from(
			article.querySelectorAll<HTMLElement>(sel)
		).filter((el) => !looksLikeActionOrFooter(el));
		const top = pickLargest(matches);
		if (top) return top;
	}

	// 3) Coarse fallbacks: role container -> first child -> article itself
	if (primary) return primary;
	const first =
		(article.firstElementChild as HTMLElement | null) ??
		(article as HTMLElement);
	return first;
}

/** Build a TurnInfo for a given article element. Returns null if id missing. */
export function getTurnInfo(article: Element): TurnInfo | null {
	const id = (article as HTMLElement).getAttribute('data-turn-id');
	if (!id) return null;
	return {
		root: article as HTMLElement,
		id,
		role: getRole(article),
		body: getDetachableSubtree(article),
	};
}

/** Find all turns currently in the DOM (order-preserving). */
export function selectAllTurns(root: ParentNode = document): TurnInfo[] {
	const out: TurnInfo[] = [];
	root.querySelectorAll(TURN_SELECTOR).forEach((el) => {
		const info = getTurnInfo(el);
		if (info) out.push(info);
	});
	return out;
}
