function now() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function getTouchPoint(event) {
  return event.changedTouches?.[0] ?? event.touches?.[0] ?? null;
}

export function addSafeTapListener(element, handler, {
  preventDefault = false,
  stopPropagation = false,
  touchDelay = 420,
  moveTolerance = 14
} = {}) {
  if (!element) {
    return () => {};
  }

  let lastTouchAt = 0;
  let startX = 0;
  let startY = 0;

  const onTouchStart = (event) => {
    const touch = getTouchPoint(event);
    if (!touch) {
      return;
    }
    startX = touch.clientX;
    startY = touch.clientY;
  };

  const onTouchEnd = (event) => {
    const touch = getTouchPoint(event);
    if (touch && Math.hypot(touch.clientX - startX, touch.clientY - startY) > moveTolerance) {
      return;
    }

    lastTouchAt = now();
    if (preventDefault && event.cancelable) {
      event.preventDefault();
    }
    if (stopPropagation) {
      event.stopPropagation();
    }
    handler(event);
  };

  const onClick = (event) => {
    if (now() - lastTouchAt < touchDelay) {
      return;
    }
    handler(event);
  };

  element.addEventListener("touchstart", onTouchStart, { passive: true });
  element.addEventListener("touchend", onTouchEnd, { passive: false });
  element.addEventListener("click", onClick);

  return () => {
    element.removeEventListener("touchstart", onTouchStart);
    element.removeEventListener("touchend", onTouchEnd);
    element.removeEventListener("click", onClick);
  };
}
