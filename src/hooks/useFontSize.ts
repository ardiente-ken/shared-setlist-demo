import { useCallback, useState } from 'react';

const KEY = 'shared-setlist.fontSize';
export const MIN_SIZE = 12;
export const MAX_SIZE = 36;
const DEFAULT = 18;
const STEP = 2;

function read(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return n >= MIN_SIZE && n <= MAX_SIZE ? n : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Reader text size in px, remembered on the device. */
export function useFontSize() {
  const [size, setSize] = useState(read);

  const change = useCallback((delta: number) => {
    setSize((s) => {
      const next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, s + delta));
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return {
    size,
    bigger: () => change(STEP),
    smaller: () => change(-STEP),
    canBigger: size < MAX_SIZE,
    canSmaller: size > MIN_SIZE,
  };
}
