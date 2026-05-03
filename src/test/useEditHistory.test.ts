/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useEditHistory, type EditState } from '../hooks/useEditHistory';

describe('useEditHistory', () => {
  const initialState: EditState = {
    editedImage: null,
    prompt: '',
    timestamp: 0,
    operationType: 'edit',
  };

  it('should initialize with present state and empty past/future', () => {
    const { result } = renderHook(() => useEditHistory(initialState));

    expect(result.current.present).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(1);
  });

  it('should push new state to history and clear future', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const newState: EditState = {
      ...initialState,
      prompt: 'make it blue',
      timestamp: Date.now(),
    };

    act(() => {
      result.current.push(newState);
    });

    expect(result.current.present).toEqual(newState);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(2);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const state1: EditState = {
      ...initialState,
      prompt: 'first edit',
      timestamp: 1,
    };
    const state2: EditState = {
      ...initialState,
      prompt: 'second edit',
      timestamp: 2,
    };

    act(() => {
      result.current.push(state1);
      result.current.push(state2);
    });

    expect(result.current.present).toEqual(state2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toEqual(state1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const state1: EditState = {
      ...initialState,
      prompt: 'first edit',
      timestamp: 1,
    };

    act(() => {
      result.current.push(state1);
      result.current.undo();
    });

    expect(result.current.present).toEqual(initialState);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.present).toEqual(state1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not undo when past is empty', () => {
    const { result } = renderHook(() => useEditHistory(initialState));

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.undo();
    });

    // Should remain unchanged
    expect(result.current.present).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
  });

  it('should not redo when future is empty', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const state1: EditState = {
      ...initialState,
      prompt: 'edit',
      timestamp: 1,
    };

    act(() => {
      result.current.push(state1);
    });

    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.redo();
    });

    // Should remain unchanged
    expect(result.current.present).toEqual(state1);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear history and reset to initial state', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const state1: EditState = {
      ...initialState,
      prompt: 'edit 1',
      timestamp: 1,
    };
    const state2: EditState = {
      ...initialState,
      prompt: 'edit 2',
      timestamp: 2,
    };

    act(() => {
      result.current.push(state1);
      result.current.push(state2);
    });

    expect(result.current.historySize).toBe(3);

    act(() => {
      result.current.clear();
    });

    expect(result.current.present).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(1);
  });

  it('should enforce max history size and drop oldest', () => {
    const maxSize = 3;
    const { result } = renderHook(() => useEditHistory(initialState, maxSize));

    // Push 5 states (should keep only last 3 + present)
    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.push({
          ...initialState,
          prompt: `edit ${i}`,
          timestamp: i,
        });
      }
    });

    // Present is edit 5, past should have edit 2, 3, 4 (oldest dropped)
    expect(result.current.present.prompt).toBe('edit 5');
    expect(result.current.historySize).toBe(4); // 3 past + 1 present

    // Undo should go to edit 4, not edit 1
    act(() => {
      result.current.undo();
    });
    expect(result.current.present.prompt).toBe('edit 4');

    act(() => {
      result.current.undo();
    });
    expect(result.current.present.prompt).toBe('edit 3');

    act(() => {
      result.current.undo();
    });
    expect(result.current.present.prompt).toBe('edit 2');

    // Can't undo further (edit 1 was dropped)
    expect(result.current.canUndo).toBe(false);
  });

  it('should clear future when pushing mid-history', () => {
    const { result } = renderHook(() => useEditHistory(initialState));
    const state1: EditState = {
      ...initialState,
      prompt: 'edit 1',
      timestamp: 1,
    };
    const state2: EditState = {
      ...initialState,
      prompt: 'edit 2',
      timestamp: 2,
    };
    const state3: EditState = {
      ...initialState,
      prompt: 'edit 3',
      timestamp: 3,
    };

    // Create history: initial -> state1 -> state2
    act(() => {
      result.current.push(state1);
      result.current.push(state2);
    });

    // Undo to state1 (now have: initial -> state1, future: state2)
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Push new state3 (should clear future)
    act(() => {
      result.current.push(state3);
    });

    // Future should be cleared, can't redo to state2
    expect(result.current.canRedo).toBe(false);
    expect(result.current.present).toEqual(state3);

    // Can undo to state1 and initial
    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toEqual(state1);
  });

  it('should maintain correct canUndo/canRedo flags', () => {
    const { result } = renderHook(() => useEditHistory(initialState));

    // Initially: no undo, no redo
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    // After push edit 1: can undo, can't redo
    act(() => {
      result.current.push({ ...initialState, prompt: 'edit 1', timestamp: 1 });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // After push edit 2: can undo, can't redo
    act(() => {
      result.current.push({ ...initialState, prompt: 'edit 2', timestamp: 2 });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // After undo: can undo (to initial), can redo
    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    // After undo to beginning: can't undo, can redo
    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    // After redo: can undo, can redo
    act(() => {
      result.current.redo();
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    // After redo to end: can undo, can't redo
    act(() => {
      result.current.redo();
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });
});
