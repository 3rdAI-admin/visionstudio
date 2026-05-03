/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export interface EditState {
  editedImage: string | null;
  prompt: string;
  timestamp: number;
  operationType: 'edit' | 'background-removal' | 'format-conversion';
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseEditHistoryReturn {
  // State
  present: EditState;
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;

  // Actions
  push: (state: EditState) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

/**
 * Custom hook for managing undo/redo history of edit states.
 *
 * @param initialState - The initial state to start with
 * @param maxHistorySize - Maximum number of states to keep in history (default: 50)
 * @returns Object with present state, canUndo/canRedo flags, and action methods
 *
 * @example
 * ```tsx
 * const history = useEditHistory(initialState, 50);
 *
 * // Add new state to history
 * history.push(newState);
 *
 * // Undo to previous state
 * if (history.canUndo) {
 *   history.undo();
 * }
 *
 * // Redo to next state
 * if (history.canRedo) {
 *   history.redo();
 * }
 *
 * // Clear all history
 * history.clear();
 * ```
 */
export function useEditHistory(initialState: EditState, maxHistorySize = 50): UseEditHistoryReturn {
  const [history, setHistory] = useState<HistoryState<EditState>>({
    past: [],
    present: initialState,
    future: [],
  });

  /**
   * Push a new state to history.
   * Clears the future stack (user diverged from previous timeline).
   * Enforces max history size by dropping oldest states.
   */
  const push = (newState: EditState) => {
    setHistory((prev) => {
      let newPast = [...prev.past, prev.present];

      // Enforce max size - drop oldest if needed
      if (newPast.length > maxHistorySize) {
        newPast = newPast.slice(newPast.length - maxHistorySize);
      }

      return {
        past: newPast,
        present: newState,
        future: [], // CRITICAL: clear future when new action happens
      };
    });
  };

  /**
   * Undo to the previous state.
   * Moves present to future stack and pops from past.
   * No-op if past is empty.
   */
  const undo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev; // Can't undo

      const newPresent = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  };

  /**
   * Redo to the next state.
   * Moves present to past stack and pops from future.
   * No-op if future is empty.
   */
  const redo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev; // Can't redo

      const newPresent = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  };

  /**
   * Clear all history and reset to initial state.
   */
  const clear = () => {
    setHistory({ past: [], present: initialState, future: [] });
  };

  return {
    present: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historySize: history.past.length + 1 + history.future.length,
    push,
    undo,
    redo,
    clear,
  };
}
