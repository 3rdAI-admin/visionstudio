/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, type TouchEvent, type Touch } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export interface UsePinchZoomReturn {
  scale: number;
  translateX: number;
  translateY: number;
  isZoomed: boolean;
  reset: () => void;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
}

function distance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Pinch-to-zoom + drag-to-pan for a single image element, plus double-tap to
 * reset. Native touch events rather than a library — the gesture surface
 * here (two-finger pinch, one-finger pan only once zoomed, double-tap) is
 * small enough not to justify a dependency.
 */
export function usePinchZoom(): UsePinchZoomReturn {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Gesture state lives in a ref, not React state — it's read/written on
  // every touchmove and must never trigger a re-render on its own (only the
  // derived scale/translate above should).
  const gesture = useRef<{
    mode: 'none' | 'pinch' | 'pan';
    startDistance: number;
    startScale: number;
    startTranslate: { x: number; y: number };
    panStart: { x: number; y: number };
    lastTapTime: number;
  }>({
    mode: 'none',
    startDistance: 0,
    startScale: 1,
    startTranslate: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    lastTapTime: 0,
  });

  const reset = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const clampTranslate = (nextScale: number, x: number, y: number) => {
    // Keep the image roughly centered rather than allowing it to be panned
    // fully off-screen — the further zoomed in, the more pan range allowed.
    const maxOffset = ((nextScale - 1) / 2) * 300;
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      gesture.current.mode = 'pinch';
      gesture.current.startDistance = distance(a, b);
      gesture.current.startScale = scale;
      gesture.current.startTranslate = { x: translateX, y: translateY };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - gesture.current.lastTapTime < 300) {
        // Double-tap: toggle between reset and a fixed zoomed-in level.
        if (scale > 1) {
          reset();
        } else {
          setScale(2);
        }
        gesture.current.lastTapTime = 0;
        gesture.current.mode = 'none';
        return;
      }
      gesture.current.lastTapTime = now;

      if (scale > 1) {
        gesture.current.mode = 'pan';
        gesture.current.panStart = {
          x: e.touches[0].clientX - translateX,
          y: e.touches[0].clientY - translateY,
        };
      }
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const newDistance = distance(a, b);
      const ratio = newDistance / gesture.current.startDistance;
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, gesture.current.startScale * ratio),
      );
      const clamped = clampTranslate(
        nextScale,
        gesture.current.startTranslate.x,
        gesture.current.startTranslate.y,
      );
      setScale(nextScale);
      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
    } else if (gesture.current.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const clamped = clampTranslate(
        scale,
        e.touches[0].clientX - gesture.current.panStart.x,
        e.touches[0].clientY - gesture.current.panStart.y,
      );
      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      gesture.current.mode = 'none';
      // Snap back to the valid range if a pinch left scale below 1.
      if (scale < MIN_SCALE) reset();
    } else if (e.touches.length === 1) {
      // Went from pinch to a single remaining finger — restart as a pan.
      gesture.current.mode = scale > 1 ? 'pan' : 'none';
      gesture.current.panStart = {
        x: e.touches[0].clientX - translateX,
        y: e.touches[0].clientY - translateY,
      };
    }
  };

  return {
    scale,
    translateX,
    translateY,
    isZoomed: scale > 1,
    reset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
