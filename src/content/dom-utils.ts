// src/content/dom-utils.ts
import { type Settings } from '../common/constants';
import { TurnState } from './types';

/** Clamp placeholder height to a tiny, consistent value. */
export function placeholderHeightPx(settings: Settings): number {
	const px =
		typeof settings.minPlaceholderHeight === 'number'
			? settings.minPlaceholderHeight
			: 24;
	return Math.max(24, Math.round(px));
}

/** Create a role chip element. */
function createRoleChip(role: string): HTMLSpanElement {
	const chip = document.createElement('span');
	chip.className = `cgptv-chip ${role}`;
	chip.textContent = role;
	return chip;
}

/** Create a separator dot element. */
function createSeparator(): HTMLSpanElement {
	const sep = document.createElement('span');
	sep.className = 'cgptv-sep';
	sep.textContent = '•';
	return sep;
}

/** Create a meta information element. */
function createMeta(humanIdx: number, total: number): HTMLSpanElement {
	const meta = document.createElement('span');
	meta.className = 'cgptv-meta';
	meta.textContent = `${humanIdx}/${total}`;
	return meta;
}

/** Create a placeholder label with role chip and meta info. */
function createPlaceholderLabel(
	role: string,
	humanIdx: number,
	total: number
): HTMLDivElement {
	const label = document.createElement('div');
	label.className = 'cgptv-label';

	label.appendChild(createMeta(humanIdx, total));
	label.appendChild(createSeparator());
	label.appendChild(createRoleChip(role));

	return label;
}

/** Build a small, styled placeholder with a role chip and meta index "23/120". */
export function buildPlaceholder(
	s: TurnState,
	idxInOrder: number,
	total: number,
	settings: Settings
): HTMLElement {
	const ph = document.createElement('div');
	ph.className = 'cgptv-placeholder';
	ph.style.minHeight = `${placeholderHeightPx(settings)}px`;

	ph.setAttribute('data-turn-id', s.info.id);
	ph.setAttribute('data-testid', `conversation-turn-${s.info.id}-placeholder`);

	const humanIdx = idxInOrder + 1;
	ph.setAttribute(
		'aria-label',
		`Collapsed ${s.info.role} turn ${humanIdx} of ${total}`
	);

	ph.appendChild(createPlaceholderLabel(s.info.role, humanIdx, total));
	return ph;
}

/** Check if an element is our toggle button. */
function isToggleButton(el: HTMLElement): boolean {
	return (
		el.classList.contains('cgptv-btn') && el.classList.contains('cgptv-toggle')
	);
}

/** Wrap ALL children of article (except our chevron) into a single container. */
export function wrapArticleChildrenExceptButton(
	article: HTMLElement
): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'cgptv-wrap';

	// Move everything except existing toggle buttons into the wrapper
	const kids = Array.from(article.childNodes);
	for (const n of kids) {
		if (n.nodeType === Node.ELEMENT_NODE) {
			const el = n as HTMLElement;
			if (isToggleButton(el)) {
				continue; // keep button outside wrapper
			}
		}
		wrapper.appendChild(n); // moves the node
	}

	// Place wrapper at the start of the article
	article.insertBefore(wrapper, article.firstChild);
	return wrapper;
}

/** Consolidate all root children into the wrapper except our own elements. */
export function consolidateRootChildren(s: TurnState): void {
	const root = s.info.root;

	// Ensure we have a wrapper in the DOM; create if missing.
	let wrapper = s.storedBody;
	if (!wrapper || !wrapper.isConnected) {
		wrapper = wrapArticleChildrenExceptButton(root);
		s.storedBody = wrapper;
	}

	// Move every direct child into the wrapper except our elements
	const kids = Array.from(root.childNodes);
	for (const n of kids) {
		if (n === wrapper || n === s.btn) continue;

		if (n.nodeType === Node.ELEMENT_NODE) {
			const el = n as HTMLElement;
			// Skip placeholders & our toggle (defensive)
			if (el.classList.contains('cgptv-placeholder')) continue;
			if (isToggleButton(el)) continue;
		}

		wrapper.appendChild(n as Node); // move into wrapper (preserves relative order among moved nodes)
	}
}

/** Update button visual state and accessibility. */
export function updateButtonState(s: TurnState): void {
	if (!s.btn) return;
	const expanded = !!s.attached;
	s.btn.classList.toggle('is-detached', !expanded);
	s.btn.classList.toggle('is-pinned', s.userPin === 'attached');

	// ARIA expanded reflects content state
	s.btn.setAttribute('aria-expanded', String(expanded));

	// Update accessible label text (not visible)
	const closedText = s.btn.dataset.closedLabel ?? 'Show turn';
	const openText = s.btn.dataset.openLabel ?? 'Hide turn';
	const label = s.btn.querySelector<HTMLSpanElement>('.cgptv-label');
	if (label) label.textContent = expanded ? openText : closedText;

	s.btn.setAttribute(
		'aria-label',
		`${expanded ? openText : closedText}${
			s.userPin === 'attached' ? ' (pinned — kept expanded)' : ''
		}`
	);
}

/** Create a chevron toggle button. */
export function createToggleButton(): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.className = 'cgptv-btn cgptv-toggle';
	btn.type = 'button';
	btn.setAttribute('aria-expanded', 'true'); // default; will be synced on first update
	btn.dataset.closedLabel = 'Show turn';
	btn.dataset.openLabel = 'Hide turn';

	// Accessible label (visually hidden)
	const sr = document.createElement('span');
	sr.className = 'cgptv-visually-hidden cgptv-label';
	sr.textContent = 'Hide turn';
	btn.appendChild(sr);

	// Chevron icon (downward, rotates on expanded)
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('class', 'cgptv-icon');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute(
		'd',
		'M7.2 9.5a1 1 0 0 0-.7 1.7l5.5 5.2a1 1 0 0 0 1.4 0l5.5-5.2a1 1 0 1 0-1.4-1.5L12 13.7l-4.5-4.2a1 1 0 0 0-.3-.2z'
	);
	svg.appendChild(path);
	btn.appendChild(svg);

	return btn;
}

/** Place the chevron button in the correct position. */
export function placeChevron(s: TurnState): void {
	if (!s.btn) return;
	// Always anchored to the article root; CSS positions it next to the centered column.
	s.info.root.appendChild(s.btn);
}
