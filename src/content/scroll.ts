export type Unsubscribe = () => void;

/**
 * Call `cb` once per animation frame when the page scrolls or resizes.
 * Immediately schedules an initial tick so clients can evaluate on boot.
 */
export function onScrollFrame(cb: () => void): Unsubscribe {
  let ticking = false;

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      cb();
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  // Initial evaluation
  schedule();

  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

/** Viewport height helper. */
export function viewportHeight(): number {
  return window.innerHeight || document.documentElement.clientHeight || 0;
}
