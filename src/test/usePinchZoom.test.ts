/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePinchZoom } from '../hooks/usePinchZoom';
import type { TouchEvent as ReactTouchEvent } from 'react';

// The hook only reads touches[i].clientX/clientY and calls preventDefault() —
// build the minimal shape rather than fighting jsdom's sparse Touch/TouchEvent
// constructors for a full synthetic React event.
function touchEvent(points: Array<{ x: number; y: number }>): ReactTouchEvent {
  return {
    touches: points.map((p) => ({ clientX: p.x, clientY: p.y })),
    preventDefault: () => {},
  } as unknown as ReactTouchEvent;
}

describe('usePinchZoom', () => {
  it('starts at scale 1 with no translation', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.scale).toBe(1);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
    expect(result.current.isZoomed).toBe(false);
  });

  it('scales up when two touch points move apart', () => {
    const { result } = renderHook(() => usePinchZoom());

    act(() => {
      result.current.handlers.onTouchStart(
        touchEvent([
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ]),
      );
    });
    act(() => {
      // Distance doubled (100 -> 200): scale should roughly double too.
      result.current.handlers.onTouchMove(
        touchEvent([
          { x: 50, y: 100 },
          { x: 250, y: 100 },
        ]),
      );
    });

    expect(result.current.scale).toBeCloseTo(2, 1);
    expect(result.current.isZoomed).toBe(true);
  });

  it('clamps scale to the configured maximum', () => {
    const { result } = renderHook(() => usePinchZoom());

    act(() => {
      result.current.handlers.onTouchStart(
        touchEvent([
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ]),
      );
    });
    act(() => {
      // Distance x50 — way past any reasonable max.
      result.current.handlers.onTouchMove(
        touchEvent([
          { x: -2400, y: 100 },
          { x: 2500, y: 100 },
        ]),
      );
    });

    expect(result.current.scale).toBeLessThanOrEqual(4);
  });

  it('pans only once zoomed in', () => {
    const { result } = renderHook(() => usePinchZoom());

    // A single-finger touch while at scale 1 should not start a pan.
    act(() => {
      result.current.handlers.onTouchStart(touchEvent([{ x: 100, y: 100 }]));
    });
    act(() => {
      result.current.handlers.onTouchMove(touchEvent([{ x: 150, y: 100 }]));
    });
    expect(result.current.translateX).toBe(0);
  });

  it('resets scale and translation', () => {
    const { result } = renderHook(() => usePinchZoom());

    act(() => {
      result.current.handlers.onTouchStart(
        touchEvent([
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ]),
      );
    });
    act(() => {
      result.current.handlers.onTouchMove(
        touchEvent([
          { x: 50, y: 100 },
          { x: 250, y: 100 },
        ]),
      );
    });
    expect(result.current.isZoomed).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
    expect(result.current.isZoomed).toBe(false);
  });

  it('snaps back to scale 1 if a pinch ends below the minimum', () => {
    const { result } = renderHook(() => usePinchZoom());

    act(() => {
      result.current.handlers.onTouchStart(
        touchEvent([
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ]),
      );
    });
    act(() => {
      // Fingers moved closer together than they started — would go below 1x.
      result.current.handlers.onTouchMove(
        touchEvent([
          { x: 140, y: 100 },
          { x: 160, y: 100 },
        ]),
      );
    });
    act(() => {
      result.current.handlers.onTouchEnd(touchEvent([]));
    });

    expect(result.current.scale).toBe(1);
  });
});
