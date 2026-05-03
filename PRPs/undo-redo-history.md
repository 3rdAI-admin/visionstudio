name: "Undo/Redo History for VisionEdit"
description: |
  Implement undo/redo functionality to allow users to navigate through their editing history,
  revert mistakes, and restore previous edits without re-uploading images.

---

## Goal
Add undo/redo functionality to VisionEdit so users can navigate backwards and forwards through their editing history, with keyboard shortcuts (Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo) and UI buttons. This addresses a fundamental UX expectation for any image editor.

## Why
- **User Experience:** Users expect undo/redo in editing tools - it's a fundamental pattern in Photoshop, Figma, Canva, and every modern editor
- **Error Recovery:** Users can fix mistakes without re-uploading images and starting over
- **Experimentation:** Encourages users to try different prompts/edits knowing they can revert
- **Competitive Parity:** Listed in PRD Section 10.1 as priority post-v1.0 enhancement
- **Low Complexity:** Self-contained frontend feature, no backend changes required

## What
Users will be able to:
1. Click "Undo" button or press Cmd/Ctrl+Z to revert to previous edit state
2. Click "Redo" button or press Cmd/Ctrl+Shift+Z to restore an undone edit
3. See visual indicators when undo/redo are available (buttons enabled/disabled)
4. Navigate through entire editing session history (limit: 50 states to prevent memory issues)
5. Automatic history tracking for:
   - Image edits (prompt-based transformations)
   - Background removals
   - Format conversions
6. History clears when user resets workspace or uploads new image

### Success Criteria
- [ ] Users can undo edits and return to previous states (image + metadata)
- [ ] Users can redo undone edits
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- [ ] Buttons show disabled state when no undo/redo available
- [ ] History limited to 50 states (prevents memory issues with large images)
- [ ] History clears on workspace reset or new upload
- [ ] All existing tests pass (13 unit tests, 4 E2E tests)
- [ ] New tests added for history functionality (3+ unit tests)

---

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window

- url: https://usehooks.com/usehistorystate
  why: Standard React pattern for undo/redo state management
  critical: Uses { past: T[], present: T, future: T[] } pattern

- url: https://redux.js.org/usage/implementing-undo-history
  section: Core State Structure
  critical: Clear future stack when new action performed mid-history

- url: https://medium.com/@yaashjainn/how-to-implement-undo-redo-functionality-in-react-forms-with-a-custom-hook-de76d6711691
  why: TypeScript implementation example with custom hook

- file: src/App.tsx
  why: Current state management, keyboard shortcut pattern (lines 122-137)
  critical: Already uses useEffect for Cmd+Enter and Esc shortcuts

- file: src/test/App.test.tsx
  why: Existing test patterns with Vitest and @testing-library/react

- file: PRDs/visionedit-vision-studio.md
  section: 10.1 Future Enhancements
  why: Undo/redo listed as priority post-v1.0 feature
```

### Current Codebase Structure
```bash
visionedit/
├── src/
│   ├── App.tsx                  # Main component (500+ lines, needs refactor)
│   ├── main.tsx
│   ├── index.css
│   ├── hooks/                   # NEW - create for custom hooks
│   │   └── useEditHistory.ts    # NEW - undo/redo hook
│   └── test/
│       ├── App.test.tsx
│       ├── utils.test.ts
│       ├── setup.ts
│       └── useEditHistory.test.ts  # NEW - history hook tests
├── package.json
├── vitest.config.ts
└── tsconfig.json
```

### Desired Codebase Structure After Implementation
```bash
src/
├── App.tsx                      # Updated: integrate useEditHistory hook, add UI buttons
├── hooks/                       # NEW directory
│   └── useEditHistory.ts        # NEW: custom hook for undo/redo state management
└── test/
    ├── App.test.tsx             # Updated: add undo/redo interaction tests
    ├── utils.test.ts            # Unchanged
    ├── setup.ts                 # Unchanged
    └── useEditHistory.test.ts   # NEW: unit tests for history hook
```

**File Responsibilities:**
- `src/hooks/useEditHistory.ts`: Generic TypeScript hook for undo/redo state management (reusable)
- `src/App.tsx`: Integrate hook, add undo/redo buttons, keyboard shortcuts
- `src/test/useEditHistory.test.ts`: Unit tests for hook (push, undo, redo, clear, edge cases)

### Known Gotchas & Constraints
```typescript
// CRITICAL: VisionEdit-specific constraints

// 1. State to track in history
interface EditState {
  editedImage: string | null;      // The actual edited image (data URL)
  prompt: string;                   // Prompt that produced this edit
  timestamp: number;                // When edit was made
  operationType: 'edit' | 'background-removal' | 'format-conversion';
}

// 2. Memory management - large images
// Each history state contains full image data URLs (can be 2-4MB each)
// LIMIT history to 50 states max to prevent browser memory issues
// When limit reached, drop oldest state from 'past' array

// 3. Original image is NOT part of history
// originalImage is the raw upload - never changes during editing session
// History only tracks edits (editedImage states)

// 4. When to clear history:
// - User clicks "Reset Workspace" (already exists in App.tsx ~line 209)
// - User uploads new image (processImageFile function ~line 139)

// 5. Existing keyboard shortcuts pattern (App.tsx lines 122-137)
// Already uses useEffect for Cmd+Enter and Esc
// PATTERN: Add Cmd+Z (undo) and Cmd+Shift+Z (redo) to same useEffect

// 6. Don't track these in history:
// - Compare mode slider position (UX state, not edit state)
// - Prompt text while typing (only save when edit completes)
// - isDragging state (temporary UI state)

// 7. TypeScript strict mode
// tsconfig.json has strict: true
// All types must be explicit, no implicit any
```

### Existing Patterns to Follow

**From App.tsx:**
```typescript
// 1. State management pattern (lines 94-106)
const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
const [editedImage, setEditedImage] = useState<string | null>(null);
// MIRROR this pattern for history state

// 2. Keyboard shortcuts (lines 122-137)
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      // ... existing submit logic
    }
    if (e.key === 'Escape' && error) {
      setError(null);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [dependencies]);
// ADD Cmd+Z and Cmd+Shift+Z to this same useEffect

// 3. Button disabled state pattern (line 371)
<button
  disabled={!originalImage || !prompt.trim() || isBusy}
  // ...
>
// MIRROR for undo/redo buttons: disabled={!canUndo} disabled={!canRedo}

// 4. Icon imports (line 8)
import { Upload, Download, RotateCcw, Loader2, Plus, Columns, Square } from 'lucide-react';
// ADD: Undo, Redo from lucide-react

// 5. Error handling pattern (App.tsx throughout)
// Always use try/catch with extractFriendlyError() for user-facing messages
```

**From test files:**
```typescript
// Pattern from src/test/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Feature Name', () => {
  it('should do expected behavior', () => {
    render(<App />);
    expect(screen.getByText(/pattern/i)).toBeInTheDocument();
  });
});
// MIRROR this pattern for useEditHistory.test.ts
```

---

## Implementation Blueprint

### Data Models and Structure

The core history state follows the standard undo/redo pattern:

```typescript
// src/hooks/useEditHistory.ts

interface EditState {
  editedImage: string | null;
  prompt: string;
  timestamp: number;
  operationType: 'edit' | 'background-removal' | 'format-conversion';
}

interface HistoryState<T> {
  past: T[];      // Stack of previous states
  present: T;     // Current active state
  future: T[];    // Stack of undone states (for redo)
}

interface UseEditHistoryReturn {
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

// Hook signature
export function useEditHistory(
  initialState: EditState,
  maxHistorySize = 50
): UseEditHistoryReturn
```

**Why this structure:**
- `past`: Array of previous states, oldest first
- `present`: Current active state
- `future`: Array of undone states (cleared when new edit happens)
- Max history size prevents memory issues with large image data URLs

---

## Multi-Agent Task Breakdown

```yaml
# Small, assignable tasks for high-accuracy execution

Task 1: Create useEditHistory custom hook (Core Logic)
  Scope: src/hooks/useEditHistory.ts only
  Assignable: Agent/Pass 1
  Acceptance: TypeScript compiles with no errors, exports correct types
  Estimated: 1-2 hours

Task 2: Write unit tests for useEditHistory hook
  Scope: src/test/useEditHistory.test.ts only
  Assignable: Agent/Pass 2
  Acceptance: All tests pass (npm run test:run), 100% hook coverage
  Estimated: 1 hour

Task 3: Integrate hook into App.tsx (State & Actions)
  Scope: App.tsx state management section only (lines 93-138)
  Assignable: Agent/Pass 3
  Acceptance: App compiles, history state available, no runtime errors
  Estimated: 1 hour

Task 4: Add undo/redo UI buttons to App.tsx
  Scope: App.tsx JSX/UI section only (lines 220-450)
  Assignable: Agent/Pass 4
  Acceptance: Buttons render, show correct enabled/disabled state
  Estimated: 1 hour

Task 5: Add keyboard shortcuts for undo/redo
  Scope: App.tsx useEffect keyboard handler (lines 122-137)
  Assignable: Agent/Pass 5
  Acceptance: Cmd+Z and Cmd+Shift+Z trigger undo/redo
  Estimated: 30 mins

Task 6: Add integration tests for undo/redo in App.test.tsx
  Scope: src/test/App.test.tsx only
  Assignable: Agent/Pass 6
  Acceptance: Tests pass, verify undo/redo user interactions
  Estimated: 1 hour

Task 7: Update documentation and validation
  Scope: README.md, USERSGUIDE.md
  Assignable: Agent/Pass 7
  Acceptance: Docs mention undo/redo feature, shortcuts documented
  Estimated: 30 mins
```

---

## List of Tasks to be Completed (In Order)

```yaml
Task 1: Create useEditHistory Hook
  CREATE src/hooks/useEditHistory.ts:
    - IMPLEMENT HistoryState interface with past/present/future arrays
    - IMPLEMENT EditState interface (editedImage, prompt, timestamp, operationType)
    - IMPLEMENT useEditHistory hook with useState for history state
    - IMPLEMENT push() function: add state to history, clear future stack
    - IMPLEMENT undo() function: move present to future, pop from past
    - IMPLEMENT redo() function: move present to past, pop from future
    - IMPLEMENT clear() function: reset to initial state
    - IMPLEMENT maxHistorySize enforcement (drop oldest when limit reached)
    - EXPORT UseEditHistoryReturn interface and hook

  Pseudocode:
    ```typescript
    export function useEditHistory<T>(initial: T, maxSize = 50) {
      const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initial,
        future: []
      });

      const push = (newState: T) => {
        setHistory(prev => {
          let newPast = [...prev.past, prev.present];
          // Enforce max size - drop oldest if needed
          if (newPast.length > maxSize) {
            newPast = newPast.slice(newPast.length - maxSize);
          }
          return {
            past: newPast,
            present: newState,
            future: [] // CRITICAL: clear future when new action happens
          };
        });
      };

      const undo = () => {
        setHistory(prev => {
          if (prev.past.length === 0) return prev; // Can't undo
          const newPresent = prev.past[prev.past.length - 1];
          const newPast = prev.past.slice(0, -1);
          return {
            past: newPast,
            present: newPresent,
            future: [prev.present, ...prev.future]
          };
        });
      };

      const redo = () => {
        setHistory(prev => {
          if (prev.future.length === 0) return prev; // Can't redo
          const newPresent = prev.future[0];
          const newFuture = prev.future.slice(1);
          return {
            past: [...prev.past, prev.present],
            present: newPresent,
            future: newFuture
          };
        });
      };

      const clear = () => {
        setHistory({ past: [], present: initial, future: [] });
      };

      return {
        present: history.present,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        historySize: history.past.length + 1 + history.future.length,
        push,
        undo,
        redo,
        clear
      };
    }
    ```

Task 2: Write Unit Tests for useEditHistory
  CREATE src/test/useEditHistory.test.ts:
    - IMPORT renderHook, act from @testing-library/react
    - IMPORT describe, it, expect from vitest
    - IMPORT useEditHistory hook

    TEST CASES:
      1. should initialize with present state and empty past/future
      2. should push new state to history and clear future
      3. should undo to previous state
      4. should redo to next state
      5. should not undo when past is empty
      6. should not redo when future is empty
      7. should clear history and reset to initial
      8. should enforce max history size (drop oldest)
      9. should clear future when pushing mid-history
      10. should maintain correct canUndo/canRedo flags

  Pseudocode:
    ```typescript
    import { renderHook, act } from '@testing-library/react';
    import { describe, it, expect } from 'vitest';
    import { useEditHistory } from '../hooks/useEditHistory';

    describe('useEditHistory', () => {
      const initialState = {
        editedImage: null,
        prompt: '',
        timestamp: 0,
        operationType: 'edit' as const
      };

      it('should initialize correctly', () => {
        const { result } = renderHook(() => useEditHistory(initialState));
        expect(result.current.present).toEqual(initialState);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
      });

      it('should push new state and enable undo', () => {
        const { result } = renderHook(() => useEditHistory(initialState));
        const newState = { ...initialState, prompt: 'make it blue' };

        act(() => {
          result.current.push(newState);
        });

        expect(result.current.present).toEqual(newState);
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
      });

      // ... 8 more test cases following same pattern
    });
    ```

Task 3: Integrate useEditHistory into App.tsx State
  MODIFY src/App.tsx:
    - FIND import section (lines 1-12)
    - ADD: import { useEditHistory } from './hooks/useEditHistory';
    - ADD: import { Undo, Redo } from 'lucide-react';

    - FIND state declarations (lines 94-106)
    - ADD after line 106:
      ```typescript
      // Undo/redo history for edits
      const initialHistoryState = {
        editedImage: null,
        prompt: '',
        timestamp: 0,
        operationType: 'edit' as const
      };
      const history = useEditHistory(initialHistoryState, 50);
      ```

    - FIND handleEdit function (around line 165)
    - ADD after successful edit (after setEditedImage call):
      ```typescript
      // Push to history after successful edit
      history.push({
        editedImage: /* the result */,
        prompt: prompt,
        timestamp: Date.now(),
        operationType: 'edit'
      });
      ```

    - FIND handleRemoveBackground function (around line 188)
    - ADD after successful background removal:
      ```typescript
      history.push({
        editedImage: reader.result as string,
        prompt: '[Background Removed]',
        timestamp: Date.now(),
        operationType: 'background-removal'
      });
      ```

    - FIND reset function (around line 209)
    - ADD: history.clear();

    - FIND processImageFile function (around line 139)
    - ADD after successful upload: history.clear();

Task 4: Add Undo/Redo Action Handlers
  MODIFY src/App.tsx:
    - ADD new handler functions after existing handlers (around line 220):
      ```typescript
      const handleUndo = () => {
        if (!history.canUndo) return;
        history.undo();
        // Restore state from history
        setEditedImage(history.present.editedImage);
        setPrompt(history.present.prompt);
        setCompareMode(!!history.present.editedImage);
      };

      const handleRedo = () => {
        if (!history.canRedo) return;
        history.redo();
        // Restore state from history
        setEditedImage(history.present.editedImage);
        setPrompt(history.present.prompt);
        setCompareMode(!!history.present.editedImage);
      };
      ```

Task 5: Add Undo/Redo UI Buttons
  MODIFY src/App.tsx JSX:
    - FIND header actions section (around line 250-280) where "Reset Workspace" button is
    - ADD undo/redo buttons next to existing buttons:
      ```typescript
      {/* Undo/Redo buttons */}
      {editedImage && (
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={!history.canUndo}
            title="Undo (⌘Z)"
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center gap-2"
          >
            <Undo className="w-4 h-4" />
            <span className="text-sm">Undo</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={!history.canRedo}
            title="Redo (⌘⇧Z)"
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center gap-2"
          >
            <Redo className="w-4 h-4" />
            <span className="text-sm">Redo</span>
          </button>
        </div>
      )}
      ```

Task 6: Add Keyboard Shortcuts
  MODIFY src/App.tsx:
    - FIND existing keyboard shortcuts useEffect (lines 122-137)
    - ADD undo/redo shortcuts to onKey function:
      ```typescript
      const onKey = (e: KeyboardEvent) => {
        // Existing shortcuts...
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { /* ... */ }
        if (e.key === 'Escape' && error) { /* ... */ }

        // NEW: Undo/Redo shortcuts
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
          if (history.canUndo) {
            e.preventDefault();
            handleUndo();
          }
        }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
          if (history.canRedo) {
            e.preventDefault();
            handleRedo();
          }
        }
      };
      ```

    - UPDATE useEffect dependencies to include history, handleUndo, handleRedo

Task 7: Add Integration Tests
  MODIFY src/test/App.test.tsx:
    - ADD tests for undo/redo functionality:
      ```typescript
      describe('Undo/Redo functionality', () => {
        it('should show undo button when edit exists', async () => {
          // Mock edit workflow
          // Verify undo button appears and is enabled
        });

        it('should disable undo button when no history', () => {
          render(<App />);
          // Verify undo button is disabled or not shown
        });

        it('should disable redo button by default', () => {
          // Verify redo starts disabled
        });
      });
      ```

    NOTE: Full interaction testing (simulating edits) requires backend mock
    These tests verify UI state only

Task 8: Update Documentation
  MODIFY README.md:
    - FIND Features section (line 8)
    - ADD new feature bullet:
      ```markdown
      - ↩️ **Undo/Redo** - Navigate through edit history with ⌘Z / ⌘⇧Z shortcuts or UI buttons (up to 50 states)
      ```

    - FIND keyboard shortcuts section (line 14)
    - UPDATE to mention undo/redo:
      ```markdown
      - ⌨️ **Keyboard Shortcuts** - `⌘/Ctrl + Enter` submits prompt; `Esc` dismisses errors; `⌘/Ctrl + Z` undo; `⌘/Ctrl + Shift + Z` redo
      ```

  MODIFY USERSGUIDE.md:
    - FIND Tips & Tricks section
    - ADD new tip:
      ```markdown
      ### Undo/Redo Your Edits

      Made a mistake or want to compare different edits? Use undo and redo:

      - **Undo:** Press ⌘Z (Mac) or Ctrl+Z (Windows), or click the "Undo" button
      - **Redo:** Press ⌘⇧Z (Mac) or Ctrl+Shift+Z (Windows), or click the "Redo" button
      - **History:** The app remembers your last 50 edits in the current session
      - **Reset:** Uploading a new image or clicking "Reset Workspace" clears history

      Pro tip: Experiment with different prompts knowing you can always undo!
      ```

Task 9: Create hooks directory
  CREATE src/hooks/ directory:
    ```bash
    mkdir -p src/hooks
    ```
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
# TypeScript compilation
npm run lint

# Expected: No errors, no warnings
# If errors: Read and fix type issues, missing imports, etc.

# Prettier formatting
npm run format:check

# If formatting issues:
npm run format
```

### Level 2: Unit Tests
```bash
# Run all unit tests
npm run test:run

# Expected output:
# ✓ src/test/App.test.tsx (3 tests)
# ✓ src/test/utils.test.ts (10 tests)
# ✓ src/test/useEditHistory.test.ts (10 tests) ← NEW
# Tests  23 passed (23)

# If failing:
# 1. Read error message carefully
# 2. Check test expectations vs actual behavior
# 3. Fix code (not tests) unless test logic is wrong
# 4. Re-run until passing
```

### Level 3: Manual Integration Test
```bash
# Terminal 1 - Start backend
cd backend && node index.js

# Terminal 2 - Start frontend
npm run dev

# Open http://localhost:3000

# Manual test workflow:
1. Upload an image
2. Enter prompt "make it blue" and process
3. Verify undo button becomes enabled
4. Enter another prompt "add red border" and process
5. Click "Undo" button - should return to blue version
6. Verify redo button now enabled
7. Click "Redo" - should return to red border version
8. Press Cmd+Z (Mac) or Ctrl+Z (Windows) - should undo via keyboard
9. Press Cmd+Shift+Z - should redo via keyboard
10. Try background removal - should add to history
11. Undo background removal - should restore previous edit
12. Upload new image - history should clear, undo/redo disabled

# All steps should work without errors
```

### Level 4: E2E Tests (Optional)
```bash
# Run Playwright E2E tests
npm run e2e

# Expected: Existing 4 tests still pass
# Note: E2E tests for undo/redo would require backend mock
# For now, manual testing is sufficient
```

---

## Final Validation Checklist
- [ ] TypeScript compiles: `npm run lint` (0 errors)
- [ ] Code formatted: `npm run format:check` (all files pass)
- [ ] Unit tests pass: `npm run test:run` (23 tests, including 10 new history tests)
- [ ] Manual undo/redo workflow succeeds (see Level 3 above)
- [ ] Undo button shows correct enabled/disabled state
- [ ] Redo button shows correct enabled/disabled state
- [ ] Keyboard shortcuts work (Cmd+Z, Cmd+Shift+Z)
- [ ] History clears on new upload
- [ ] History clears on workspace reset
- [ ] Max 50 states enforced (doesn't crash with many edits)
- [ ] Documentation updated (README.md, USERSGUIDE.md)
- [ ] No regression: existing features still work

---

## Anti-Patterns to Avoid

- ❌ **Don't store originalImage in history** - it never changes during a session
- ❌ **Don't track every state change** - only track completed edits (on API response)
- ❌ **Don't forget to clear future** - when user makes new edit mid-history, future becomes invalid
- ❌ **Don't exceed memory limits** - enforce maxHistorySize (50 states = ~100-200MB max)
- ❌ **Don't use sync operations** - image processing is async, use async/await patterns
- ❌ **Don't break existing tests** - all 13 unit tests + 4 E2E tests must still pass
- ❌ **Don't add external dependencies** - implement custom hook, don't npm install undo libraries
- ❌ **Don't modify backend** - this is purely frontend feature
- ❌ **Don't ignore TypeScript errors** - strict mode enabled, all types must be explicit

---

## Integration Points

```yaml
STATE MANAGEMENT:
  - integrate with: src/App.tsx existing useState hooks
  - pattern: Use custom hook return values (present, canUndo, canRedo, push, undo, redo, clear)
  - timing: Call push() AFTER successful edit/background-removal (in then/catch blocks)

UI COMPONENTS:
  - add buttons to: Header actions section (near Reset Workspace button)
  - pattern: Follow existing button styles (bg-white/10 hover:bg-white/20)
  - icons: Import Undo, Redo from lucide-react

KEYBOARD SHORTCUTS:
  - add to: Existing useEffect keyboard handler (lines 122-137)
  - pattern: (e.metaKey || e.ctrlKey) && e.key === 'z'
  - prevent default: e.preventDefault() when handling shortcut

TESTING:
  - add tests to: src/test/useEditHistory.test.ts (new file)
  - pattern: Use renderHook, act from @testing-library/react
  - coverage: 10 test cases minimum (happy path, edge cases, boundaries)

DOCUMENTATION:
  - update: README.md features list, keyboard shortcuts
  - update: USERSGUIDE.md tips & tricks section
  - pattern: Match existing documentation style and formatting
```

---

## Edge Cases & Error Handling

```typescript
// CRITICAL edge cases to handle:

// 1. No edits yet (initial state)
// - canUndo = false, undo button disabled
// - canRedo = false, redo button disabled

// 2. At beginning of history
// - canUndo = false (past is empty)
// - User presses Cmd+Z: no-op, don't crash

// 3. At end of history (all redos exhausted)
// - canRedo = false (future is empty)
// - User presses Cmd+Shift+Z: no-op

// 4. User makes edit while in middle of history
// - Clear future stack (user diverged from previous timeline)
// - This is correct behavior per Redux docs

// 5. Memory management (50+ edits)
// - When pushing 51st state, drop oldest from past array
// - Maintain max 50 states total (past + present)

// 6. Background removal fails
// - Don't push to history if operation errors
// - Only push on successful completion

// 7. User resets workspace
// - Call history.clear() to prevent stale states

// 8. User uploads new image
// - Call history.clear() to start fresh session

// 9. Concurrent operations
// - Disable undo/redo buttons when isBusy = true
// - Prevents race conditions during API calls

// 10. React strict mode (dev)
// - useEffect runs twice in dev mode
// - Hook must be pure and idempotent
```

---

## Performance Considerations

```yaml
MEMORY USAGE:
  - Each state: ~2-4MB (base64 image data URL)
  - Max 50 states: ~100-200MB total
  - Browser limit: ~500MB-1GB before slowdown
  - Mitigation: Enforce hard limit of 50 states

RENDER PERFORMANCE:
  - Undo/redo updates 3 states: editedImage, prompt, compareMode
  - React batches state updates automatically
  - No performance concerns (single image display)

STATE UPDATE FREQUENCY:
  - History only updated on completed edits (not during typing)
  - Low frequency: ~1 update per 5-10 seconds (API call latency)
  - No debouncing needed

HISTORY NAVIGATION SPEED:
  - Instant (O(1) array operations)
  - No async operations for undo/redo
  - UI updates immediately on state change
```

---

## Testing Strategy

### Unit Tests (src/test/useEditHistory.test.ts)
```typescript
// Test the hook in isolation (no DOM, no App component)

Test 1: Initialize with correct defaults
Test 2: Push adds state to history
Test 3: Undo moves to previous state
Test 4: Redo moves to next state
Test 5: Undo at start is no-op (guards against crash)
Test 6: Redo at end is no-op (guards against crash)
Test 7: Push clears future when in middle of history
Test 8: Clear resets to initial state
Test 9: Max history size enforced (drop oldest)
Test 10: canUndo/canRedo flags are accurate
```

### Component Tests (src/test/App.test.tsx)
```typescript
// Test UI integration (requires DOM rendering)

Test 1: Undo button appears after edit
Test 2: Undo button disabled when no history
Test 3: Redo button appears after undo
Test 4: Redo button disabled by default

Note: Full workflow tests (upload → edit → undo) require backend mock
These tests verify UI state only, not full end-to-end flow
```

### Manual Tests (Browser)
```
See "Level 3: Manual Integration Test" section above
10-step workflow covering all user interactions
```

---

## Success Metrics

After implementation, the feature succeeds if:

1. **Functionality:** All 10 manual test steps pass without errors
2. **Tests:** 23 total tests pass (13 existing + 10 new history tests)
3. **Type Safety:** `npm run lint` shows 0 errors
4. **Code Quality:** `npm run format:check` passes
5. **Performance:** Undo/redo is instant (<100ms)
6. **Memory:** Browser doesn't slow down after 50 edits
7. **UX:** Buttons show correct disabled states
8. **Documentation:** Features and shortcuts documented

---

## Confidence Score: 9/10

**Why high confidence:**
- ✅ Well-established pattern (past/present/future)
- ✅ Extensive documentation and examples available
- ✅ Self-contained (no backend changes)
- ✅ Existing keyboard shortcut pattern to follow
- ✅ TypeScript types prevent common errors
- ✅ Clear validation gates (tests, manual workflow)
- ✅ Small, focused tasks (7 tasks, each 0.5-2 hours)

**Risk areas (why not 10/10):**
- ⚠️ App.tsx is 500+ lines (approaching CLAUDE.md 500-line limit)
  - Mitigation: Only modify specific sections, don't refactor entire file
- ⚠️ Large image data URLs in history (memory)
  - Mitigation: Hard limit of 50 states documented and enforced
- ⚠️ Integration between hook and App state
  - Mitigation: Clear pseudocode showing exact integration points

**Recommended approach:**
Execute tasks sequentially (Task 1 → Task 2 → ... → Task 9), validating at each step.
Don't proceed to next task until current task's validation passes.
