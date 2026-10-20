import { useRef } from 'react';
import type { TouchEvent } from 'react';

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Minimum horizontal distance in px. */
  threshold?: number;
}

/** Horizontal swipe detection that ignores mostly-vertical scrolling. */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 }: Options) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Date.now() - s.t > 900) return;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  };

  return { onTouchStart, onTouchEnd };
}
