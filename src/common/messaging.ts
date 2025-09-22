/**
 * Tiny typed message helper for MV3.
 * Optional — current build works without it, but this enables future
 * background/content coordination (e.g., diagnostics, manual refresh).
 */

const FLAG = "__cgptVirt";

/** Define your request/response message types here. */
export type MessageMap = {
  ping: { req: { from: "content" | "popup" | "bg" }; res: { ok: true } };
  noop: { req: {}; res: { ok: true } };
};

type Keys = keyof MessageMap;

type Envelope<K extends Keys> = {
  [FLAG]: true;
  type: K;
  payload: MessageMap[K]["req"];
};

export type MsgHandler<K extends Keys> = (
  payload: MessageMap[K]["req"],
  sender: chrome.runtime.MessageSender
) => Promise<MessageMap[K]["res"]> | MessageMap[K]["res"];

export function sendMessage<K extends Keys>(
  type: K,
  payload: MessageMap[K]["req"]
): Promise<MessageMap[K]["res"]> {
  const env: Envelope<K> = { [FLAG]: true, type, payload } as Envelope<K>;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(env, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve(resp as MessageMap[K]["res"]);
    });
  });
}

/**
 * Add a handler for a specific message `type`.
 * Returns an unsubscribe function.
 */
export function addMessageListener<K extends Keys>(
  type: K,
  handler: MsgHandler<K>
): () => void {
  const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
    msg,
    sender,
    sendResponse
  ) => {
    if (!msg || msg[FLAG] !== true || msg.type !== type) return;

    const result = handler(msg.payload, sender);
    // Support async handler
    if (result && typeof (result as any).then === "function") {
      (result as Promise<unknown>)
        .then((data) => sendResponse(data))
        .catch((e) => {
          // Best-effort error surface in dev
          // eslint-disable-next-line no-console
          console.error("[cgpt-virt] handler error for", type, e);
          sendResponse({ ok: false, error: String(e) });
        });
      return true; // keep channel open
    } else {
      sendResponse(result);
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/** Convenience no-op registration (useful for background sanity checks). */
export function registerDefaultHandlers() {
  addMessageListener("ping", async () => ({ ok: true }));
  addMessageListener("noop", () => ({ ok: true }));
}
