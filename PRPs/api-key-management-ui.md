name: "Secure API Key Management UI for VisionEdit"
description: |
  Add a settings UI that allows users to bring their own Gemini API key (BYOK pattern),
  with secure localStorage management, validation, testing, and clear security warnings.

---

## Goal
Add a secure API key management interface to VisionEdit that allows users to provide, test, edit, and remove their own Google Gemini API keys. This enables users to use their own API quotas and billing, making the app more distributable without requiring a shared backend API key.

## Why
- **Scalability:** Users bring their own API keys, eliminating shared rate limits and billing concerns
- **Distribution:** App can be deployed publicly without exposing a shared API key
- **User Control:** Users manage their own API quotas and costs (free tier: 15 RPM, 1,500 RPD)
- **Flexibility:** Users can switch between personal and team API keys
- **Privacy:** Each user's API usage is isolated to their own Google account
- **Competitive Feature:** Common pattern in AI apps (ChatGPT UI, Claude Code, AI Studio clones)

## What
Users will be able to:
1. Open settings modal via gear icon in header
2. Input their Gemini API key with masked display (show/hide toggle)
3. Test API key validity with a lightweight test call
4. Save API key to localStorage (with security warnings)
5. Edit existing API key
6. Remove/clear API key from storage
7. See visual status indicator (valid/invalid/not set)
8. Access link to get API key from https://aistudio.google.com/apikey
9. View clear security warnings about browser storage risks
10. Fallback to backend .env key if no user key provided (backward compatible)

### Success Criteria
- [ ] Users can add API key via settings UI and it persists in localStorage
- [ ] API key validation works (format: 39 chars starting with "AIzaSy")
- [ ] Test button makes lightweight API call to verify key validity
- [ ] Show/hide toggle works for password-style masking
- [ ] Settings modal opens/closes smoothly with animation
- [ ] Backend accepts API key from X-API-Key header or falls back to .env
- [ ] Backend never logs or stores user-provided API keys
- [ ] Clear security warning shown about localStorage risks (XSS)
- [ ] All existing tests pass (23 unit tests)
- [ ] New tests added for API key hook (5+ unit tests)
- [ ] Documentation updated with BYOK instructions

---

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window

- url: https://ai.google.dev/gemini-api/docs/api-key
  why: Official Google documentation on Gemini API keys
  critical: Keys are exactly 39 characters and start with "AIzaSy"

- url: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
  why: localStorage API documentation for secure storage patterns
  critical: Data persists until explicitly deleted, accessible to all scripts

- url: https://owasp.org/www-community/vulnerabilities/Insecure_Storage
  why: OWASP security guidance on browser storage
  critical: localStorage vulnerable to XSS, must warn users

- url: https://blog.logrocket.com/best-practices-for-managing-and-storing-secrets-in-frontend-development/
  why: Best practices for secret management in frontend
  critical: Never log secrets, provide clear security warnings

- url: https://www.npmjs.com/package/lucide-react
  section: Settings, Eye, EyeOff, Key, Check, X icons
  why: Icon library already in use - Settings for modal trigger, Eye/EyeOff for show/hide toggle

- file: src/App.tsx
  lines: 293-320
  why: Current fetch pattern to /api/generate - need to add X-API-Key header
  critical: Already uses try/catch with extractFriendlyError for API errors

- file: backend/index.js
  lines: 1-94
  why: Backend proxy pattern - need to accept API key from header
  critical: Line 7 uses process.env.GOOGLE_API_KEY, need fallback logic

- file: src/hooks/useEditHistory.ts
  why: Pattern for custom React hooks with TypeScript interfaces
  critical: useEditHistory.ts:63-149 shows hook structure with return types

- file: PRDs/visionedit-vision-studio.md
  section: 3.2 Non-Functional Requirements
  line: NFR-1
  critical: "Security: API key never exposed to browser" - BYOK changes this to user's own risk
```

### Current Codebase Structure
```bash
visionedit/
├── src/
│   ├── App.tsx                      # Main component - needs settings modal integration
│   ├── hooks/
│   │   └── useEditHistory.ts        # Custom hook pattern to follow
│   ├── test/
│   │   ├── App.test.tsx
│   │   ├── utils.test.ts
│   │   ├── setup.ts
│   │   └── useEditHistory.test.ts   # Test pattern to mirror
│   └── utils.ts
├── backend/
│   ├── index.js                     # Express backend - needs header parsing
│   ├── .env                         # Fallback API key storage
│   └── package.json
├── package.json                     # Frontend deps - motion/react already installed
├── vitest.config.ts
└── README.md                        # Needs BYOK setup instructions
```

### Desired Codebase Structure After Implementation
```bash
src/
├── App.tsx                          # Updated: add Settings icon, state, modal integration
├── components/                      # NEW directory
│   └── ApiKeySettings.tsx           # NEW: Settings modal component
├── hooks/
│   ├── useEditHistory.ts            # Unchanged
│   └── useApiKey.ts                 # NEW: Custom hook for API key management
└── test/
    ├── App.test.tsx                 # Updated: add settings modal tests
    ├── utils.test.ts                # Unchanged
    ├── setup.ts                     # Unchanged
    ├── useEditHistory.test.ts       # Unchanged
    └── useApiKey.test.ts            # NEW: Unit tests for API key hook

backend/
├── index.js                         # Updated: parse X-API-Key header, add fallback logic
├── .env                             # Unchanged - still used as fallback
└── package.json                     # Unchanged

README.md                            # Updated: add BYOK setup section
USERSGUIDE.md                        # Updated: add API key management instructions
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: localStorage is synchronous and blocks main thread
// Use it sparingly, only on user action (save/load/remove)

// GOTCHA: localStorage only stores strings
// Store API key directly as string (no JSON needed)
localStorage.setItem('gemini_api_key', apiKey);
const key = localStorage.getItem('gemini_api_key');

// GOTCHA: localStorage is domain-scoped
// Works fine for localhost:3000, but keys don't transfer between domains

// PATTERN: Gemini API keys are exactly 39 characters
// Starts with "AIzaSy" followed by 33 more characters
const GEMINI_KEY_REGEX = /^AIzaSy[A-Za-z0-9_-]{33}$/;

// CRITICAL: Never log API keys
// ❌ console.log(`Testing with key: ${apiKey}`)
// ✅ console.log('Testing API key validity...')

// PATTERN: React 19 with TypeScript - use explicit types
// motion/react already installed for animations (see App.tsx:6)

// GOTCHA: Backend CORS allows http://localhost:3000 only
// See backend/index.js:9 - already configured
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// src/hooks/useApiKey.ts - Types and interfaces

/** API key status states */
export type ApiKeyStatus = 'not-set' | 'valid' | 'invalid' | 'testing';

/** API key hook return type */
export interface UseApiKeyReturn {
  // State
  apiKey: string | null;
  status: ApiKeyStatus;
  isTesting: boolean;

  // Actions
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  testApiKey: () => Promise<boolean>;
  validateFormat: (key: string) => boolean;
}

/** Settings modal props */
export interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### Multi-agent Task Breakdown

```yaml
# Task ID | Scope                          | Assignable unit | Acceptance
Task 1     | useApiKey hook (core logic)    | Agent/Pass 1    | Hook compiles, exports correct types
Task 2     | useApiKey tests (5+ tests)     | Agent/Pass 2    | All tests pass with vitest
Task 3     | ApiKeySettings component (UI)  | Agent/Pass 3    | Component renders, no TS errors
Task 4     | App.tsx integration            | Agent/Pass 4    | Modal opens/closes, key passed to API
Task 5     | Backend header parsing         | Agent/Pass 5    | /api/generate accepts X-API-Key header
Task 6     | Backend validation & fallback  | Agent/Pass 6    | Both user key and .env key work
Task 7     | Documentation updates          | Agent/Pass 7    | README and USERSGUIDE reflect BYOK
Task 8     | Full integration test          | Agent/Pass 8    | E2E flow: add key -> test -> edit image
Task 9     | Create hooks directory         | Agent/Pass 9    | mkdir -p src/hooks if doesn't exist
```

---

### List of Tasks (in order)

```yaml
Task 1: Create src/hooks directory (if not exists)
  RUN: mkdir -p src/hooks
  VERIFY: ls src/hooks (should exist)

Task 2: Create useApiKey.ts custom hook
  CREATE: src/hooks/useApiKey.ts
  MIRROR pattern from: src/hooks/useEditHistory.ts (lines 1-149)
  IMPLEMENT:
    - useState for apiKey, status, isTesting
    - useEffect to load key from localStorage on mount
    - setApiKey function (validate format, save to localStorage, update state)
    - removeApiKey function (clear localStorage, reset state)
    - testApiKey async function (lightweight API call to /api/generate)
    - validateFormat function (regex check: ^AIzaSy[A-Za-z0-9_-]{33}$)
  EXPORT: UseApiKeyReturn interface and useApiKey hook
  PRESERVE: TypeScript strict mode, JSDoc comments

Task 3: Create unit tests for useApiKey hook
  CREATE: src/test/useApiKey.test.ts
  MIRROR pattern from: src/test/useEditHistory.test.ts
  TEST CASES:
    1. should initialize with null key and 'not-set' status
    2. should load saved key from localStorage on mount
    3. should validate API key format correctly (valid/invalid)
    4. should save valid key to localStorage
    5. should reject invalid key format
    6. should remove key from localStorage
    7. should test key with API call (mock fetch)
    8. should handle test API call failure
  USE: renderHook from @testing-library/react, vi.mock for localStorage and fetch

Task 4: Create ApiKeySettings modal component
  CREATE: src/components/ApiKeySettings.tsx
  MIRROR animation pattern from: src/App.tsx (AnimatePresence, motion.div)
  IMPLEMENT:
    - Props: isOpen, onClose
    - State: inputValue, showKey (for password toggle)
    - UI elements:
      * Modal overlay (dark backdrop, click to close)
      * Modal content (white card, centered)
      * Header with "API Key Settings" and X close button
      * Security warning (yellow background, warning icon)
      * Input field (type="password" or "text" based on showKey)
      * Show/Hide toggle button (Eye/EyeOff icons)
      * Test button (makes test API call, shows result)
      * Save button (validates and saves)
      * Remove button (clears key)
      * Link to https://aistudio.google.com/apikey
    - Icons: Settings, Eye, EyeOff, Key, Check, X, AlertTriangle from lucide-react
  PRESERVE: Tailwind CSS classes consistent with App.tsx styling
  USE: motion.div for smooth modal open/close animation

Task 5: Integrate settings modal into App.tsx
  MODIFY: src/App.tsx
  ADD imports:
    - import { Settings } from 'lucide-react';
    - import { useApiKey } from './hooks/useApiKey';
    - import ApiKeySettings from './components/ApiKeySettings';
  ADD state:
    - const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    - const apiKeyHook = useApiKey();
  ADD UI in header (line ~335 near logo):
    - Settings icon button (absolute top-right)
    - Visual indicator dot (green if valid, red if invalid, gray if not-set)
  MODIFY handleEdit function (line ~293):
    - Add X-API-Key header to fetch if apiKeyHook.apiKey exists
    - Pattern: headers: { 'Content-Type': 'application/json', ...(apiKeyHook.apiKey && { 'X-API-Key': apiKeyHook.apiKey }) }
  ADD before closing div:
    - <ApiKeySettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
  PRESERVE: Existing functionality, keyboard shortcuts, all state

Task 6: Update backend to accept API key from header
  MODIFY: backend/index.js
  ADD to /api/generate handler (line ~24):
    - Extract API key from header: const userApiKey = req.headers['x-api-key'];
    - Validate format if provided (39 chars, starts with AIzaSy)
    - Use userApiKey if provided, otherwise fall back to process.env.GOOGLE_API_KEY
    - Pattern:
      ```javascript
      const apiKey = req.headers['x-api-key'] || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'API key required. Add X-API-Key header or set GOOGLE_API_KEY in .env' });
      }
      // Validate format
      if (!/^AIzaSy[A-Za-z0-9_-]{33}$/.test(apiKey)) {
        return res.status(400).json({ error: 'Invalid API key format. Expected 39 characters starting with AIzaSy' });
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      ```
  CRITICAL: Never log API keys (console.log, res.json, etc.)
  PRESERVE: Existing error handling with friendlyError function

Task 7: Update README.md with BYOK instructions
  MODIFY: README.md
  ADD new section after "Setup" (line ~54):
    ## Using Your Own API Key (Optional)

    VisionEdit supports two modes:

    **Option 1: Shared Backend Key (Current)**
    Add `GOOGLE_API_KEY` to `backend/.env` - all users share this key and rate limits.

    **Option 2: Bring Your Own Key (BYOK)**
    1. Click the Settings icon (⚙️) in the top-right
    2. Enter your Gemini API key from https://aistudio.google.com/apikey
    3. Click "Test Key" to verify it works
    4. Click "Save" - your key is stored in browser localStorage

    **Security Note:** Your API key is stored in your browser's localStorage and sent with each request.
    This is secure for personal use but vulnerable to XSS attacks. Never use this on untrusted networks
    or shared computers. You can remove your key anytime via Settings.

Task 8: Update USERSGUIDE.md with API key management
  MODIFY: USERSGUIDE.md
  ADD new section after "Getting Started":
    ### Managing Your API Key

    VisionEdit can use either a shared backend API key or your personal Google Gemini API key.

    **To add your own key:**
    1. Get a free API key from https://aistudio.google.com/apikey
    2. Click the Settings icon (⚙️) in the top-right corner
    3. Paste your API key (it should start with "AIzaSy" and be 39 characters)
    4. Click "Test Key" to verify it works
    5. Click "Save"

    **Security considerations:**
    - Your key is stored locally in your browser
    - It's sent with each image edit request
    - Never share screenshots of your settings page
    - Use incognito mode or remove your key on shared computers

    **To remove your key:**
    1. Click Settings (⚙️)
    2. Click "Remove Key"
    3. Your key is deleted from browser storage

Task 9: Add integration test for API key flow
  MODIFY: e2e/app.spec.ts
  ADD new test case:
    test('should allow setting custom API key', async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Open settings
      await page.click('[aria-label="Settings"]');

      // Enter API key
      await page.fill('input[type="password"]', 'AIzaSyDEMO_KEY_FOR_TESTING_1234567890');

      // Save key
      await page.click('button:has-text("Save")');

      // Verify saved (check localStorage via browser context)
      const savedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
      expect(savedKey).toBe('AIzaSyDEMO_KEY_FOR_TESTING_1234567890');

      // Close settings
      await page.click('[aria-label="Close"]');
    });
```

---

## Per-Task Pseudocode

### Task 2: useApiKey.ts Implementation

```typescript
/**
 * Custom hook for managing Gemini API key with localStorage persistence
 * Provides validation, testing, and secure storage
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gemini_api_key';
const GEMINI_KEY_REGEX = /^AIzaSy[A-Za-z0-9_-]{33}$/;

export type ApiKeyStatus = 'not-set' | 'valid' | 'invalid' | 'testing';

export interface UseApiKeyReturn {
  apiKey: string | null;
  status: ApiKeyStatus;
  isTesting: boolean;
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  testApiKey: () => Promise<boolean>;
  validateFormat: (key: string) => boolean;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiKeyStatus>('not-set');
  const [isTesting, setIsTesting] = useState(false);

  // PATTERN: Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && GEMINI_KEY_REGEX.test(saved)) {
      setApiKeyState(saved);
      setStatus('valid'); // Assume valid until tested
    }
  }, []);

  // CRITICAL: Validate format before saving
  const validateFormat = useCallback((key: string): boolean => {
    return GEMINI_KEY_REGEX.test(key);
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();

    if (!validateFormat(trimmed)) {
      setStatus('invalid');
      return;
    }

    // PATTERN: Save to localStorage
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKeyState(trimmed);
    setStatus('valid');
  }, [validateFormat]);

  const removeApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState(null);
    setStatus('not-set');
  }, []);

  // PATTERN: Test API key with lightweight call
  const testApiKey = useCallback(async (): Promise<boolean> => {
    if (!apiKey) return false;

    setIsTesting(true);
    setStatus('testing');

    try {
      // GOTCHA: Use a minimal prompt to test (don't waste quota)
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          prompt: 'test', // Minimal test prompt
        }),
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        setStatus('valid');
        return true;
      } else {
        setStatus('invalid');
        return false;
      }
    } catch (error) {
      console.error('API key test failed:', error);
      setStatus('invalid');
      return false;
    } finally {
      setIsTesting(false);
    }
  }, [apiKey]);

  return {
    apiKey,
    status,
    isTesting,
    setApiKey,
    removeApiKey,
    testApiKey,
    validateFormat,
  };
}
```

### Task 4: ApiKeySettings.tsx Component

```typescript
/**
 * Settings modal for managing Gemini API key
 * Allows users to add, test, edit, and remove their API key
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Key, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import { useApiKey } from '../hooks/useApiKey';

export interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const { apiKey, status, isTesting, setApiKey, removeApiKey, testApiKey, validateFormat } = useApiKey();
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
    // CRITICAL: Validate before saving
    if (!validateFormat(inputValue)) {
      setTestResult('error');
      return;
    }
    setApiKey(inputValue);
    setTestResult('success');
  };

  const handleTest = async () => {
    setTestResult(null);
    const valid = await testApiKey();
    setTestResult(valid ? 'success' : 'error');
  };

  const handleRemove = () => {
    removeApiKey();
    setInputValue('');
    setTestResult(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* PATTERN: Dark overlay - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* PATTERN: Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold">API Key Settings</h2>
              </div>
              <button onClick={onClose} aria-label="Close">
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            {/* CRITICAL: Security warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Your API key is stored in browser localStorage and sent with each request.
                Use only on trusted devices. Never share screenshots of this page.
              </p>
            </div>

            {/* Input field with show/hide toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                39 characters starting with "AIzaSy"
              </p>
            </div>

            {/* PATTERN: Test result feedback */}
            {testResult === 'success' && (
              <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">API key is valid!</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">Invalid API key or test failed</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleTest}
                disabled={!inputValue || isTesting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? 'Testing...' : 'Test Key'}
              </button>
              <button
                onClick={handleSave}
                disabled={!inputValue}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>

            <button
              onClick={handleRemove}
              disabled={!apiKey}
              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg
                       hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              Remove Key
            </button>

            {/* PATTERN: Link to get API key */}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Get API Key from Google AI Studio
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## Validation Loop

### Level 1: TypeScript & Syntax
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint          # TypeScript compilation check
npm run format:check  # Prettier formatting

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```bash
# Run unit tests for new hooks and components
npm run test:run

# Expected test cases:
# ✓ useApiKey hook initializes with null key
# ✓ useApiKey loads saved key from localStorage
# ✓ useApiKey validates format correctly
# ✓ useApiKey saves valid key
# ✓ useApiKey removes key
# ✓ useApiKey tests key with API call
# ✓ useEditHistory tests still pass (23 tests)

# If failing: Read error, fix implementation, re-run
```

### Level 3: Integration Test
```bash
# Terminal 1: Start backend
cd backend && node index.js

# Terminal 2: Start frontend
npm run dev

# Manual test flow:
1. Open http://localhost:3000
2. Click Settings icon (⚙️) in top-right
3. Enter test API key: AIzaSyDEMO_KEY_FOR_TESTING_1234567890
4. Click "Show" to verify input
5. Click "Test Key" (should fail with invalid key)
6. Enter real API key from .env
7. Click "Test Key" (should succeed)
8. Click "Save"
9. Refresh page - key should persist
10. Upload image and edit (should use saved key)
11. Open Settings -> Click "Remove Key"
12. Verify key cleared from localStorage (DevTools -> Application -> Local Storage)

# Expected: All steps work, no console errors, key persists across refreshes
```

### Level 4: E2E Tests
```bash
# Run Playwright E2E tests
npm run test:e2e

# Expected: Settings modal tests pass (if added)
# Existing 4 E2E tests still pass
```

---

## Final Validation Checklist
- [ ] TypeScript compiles with no errors: `npm run lint`
- [ ] All unit tests pass (23 + new tests): `npm run test:run`
- [ ] Prettier formatting passes: `npm run format:check`
- [ ] Manual test: Settings modal opens/closes smoothly
- [ ] Manual test: API key saves to localStorage and persists
- [ ] Manual test: Test button validates key correctly
- [ ] Manual test: Show/hide toggle works
- [ ] Manual test: Remove button clears key
- [ ] Manual test: Image edit uses saved API key (check Network tab for X-API-Key header)
- [ ] Manual test: Backend falls back to .env key when no user key provided
- [ ] Backend never logs API keys (check console output)
- [ ] Security warning is prominent and clear
- [ ] Documentation updated (README.md, USERSGUIDE.md)
- [ ] E2E tests pass: `npm run test:e2e`

---

## Integration Points
```yaml
FRONTEND:
  - App.tsx header: Add Settings icon button (top-right, absolute positioning)
  - App.tsx state: Add isSettingsOpen state and apiKeyHook
  - App.tsx fetch: Add X-API-Key header to /api/generate requests
  - Components: Create new src/components/ directory
  - Hooks: Add useApiKey.ts to existing src/hooks/ directory

BACKEND:
  - index.js line ~24: Parse X-API-Key from req.headers
  - index.js line ~34: Use userKey || envKey with validation
  - index.js: Never log API keys in console or error responses

STORAGE:
  - localStorage key: 'gemini_api_key'
  - Validation: /^AIzaSy[A-Za-z0-9_-]{33}$/

DOCUMENTATION:
  - README.md: Add "Using Your Own API Key (Optional)" section
  - USERSGUIDE.md: Add "Managing Your API Key" section
```

---

## Anti-Patterns to Avoid
- ❌ Don't log API keys to console (security risk)
- ❌ Don't store API keys in plain text in component state without localStorage backup
- ❌ Don't skip format validation (prevents invalid keys from being saved)
- ❌ Don't make settings modal uncloseable (always provide X button and backdrop click)
- ❌ Don't show full API key by default (use password input with toggle)
- ❌ Don't skip security warning (users must understand localStorage risks)
- ❌ Don't break backward compatibility (backend must fall back to .env key)
- ❌ Don't test API key on every character input (wait for user to click "Test" button)
- ❌ Don't use sessionStorage instead of localStorage (key would be lost on tab close)

---

## Confidence Score: 8/10

**Reasoning:**
- ✅ Clear implementation path with existing patterns to follow (useEditHistory.ts, App.tsx modal animations)
- ✅ Well-defined UI/UX flow with security considerations
- ✅ Comprehensive validation strategy (format check, test API call, unit tests)
- ✅ Backward compatible (falls back to .env key)
- ⚠️ localStorage security is inherently risky (XSS vulnerability) - but acceptable for BYOK pattern with clear warnings
- ⚠️ Test API call might fail if user's key has rate limits - need graceful error handling
- ⚠️ No encryption for localStorage (acceptable since it's user's own key, not a shared secret)

**Risks:**
1. Users might not understand security implications despite warnings
2. localStorage XSS vulnerability if malicious script injected
3. API key validation test consumes quota (minimal with simple prompt)

**Mitigation:**
- Prominent security warnings in UI and documentation
- Format validation before API test (prevents invalid key tests)
- Fallback to .env key ensures app still works without BYOK
- Clear "Remove Key" button for shared computer scenarios
