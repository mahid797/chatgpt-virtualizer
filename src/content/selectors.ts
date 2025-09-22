/**
 * DOM selectors/utilities for locating ChatGPT conversation turns reliably.
 * We key off the `article[data-turn-id]` structure shown in your DevTools grab.
 */

export type Role = "assistant" | "user" | "system" | "tool" | "other";

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

export const TURN_SELECTOR = "article[data-turn-id]";
const ROLE_CONTAINER_SELECTOR = "[data-message-author-role]";
const MESSAGE_BLOCK_SELECTOR =
  "[data-message-author-role][data-message-id], [data-message-author-role]";

/** True if we're on a ChatGPT chat page. */
export function isChatHost(): boolean {
  const h = location.hostname;
  return h === "chat.openai.com" || h === "chatgpt.com";
}

/** Document-wide scroll element (ChatGPT uses page scroll). */
export function getScrollElement(): HTMLElement {
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

/** Parse a role value from the closest role container under the article. */
export function getRole(el: Element): Role {
  const roleEl = el.querySelector(
    ROLE_CONTAINER_SELECTOR
  ) as HTMLElement | null;
  const raw = roleEl?.getAttribute("data-message-author-role")?.toLowerCase();
  if (
    raw === "assistant" ||
    raw === "user" ||
    raw === "system" ||
    raw === "tool"
  )
    return raw;
  return "other";
}

/** Determine the subtree we'll detach for virtualization. */
export function getDetachableSubtree(article: Element): HTMLElement {
  // Prefer the inner message block (usually the heavy DOM).
  const heavy =
    (article.querySelector(MESSAGE_BLOCK_SELECTOR) as HTMLElement | null) ??
    (article.firstElementChild as HTMLElement | null) ??
    (article as HTMLElement);
  return heavy;
}

/** Build a TurnInfo for a given article element. Returns null if id missing. */
export function getTurnInfo(article: Element): TurnInfo | null {
  const id = (article as HTMLElement).getAttribute("data-turn-id");
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
