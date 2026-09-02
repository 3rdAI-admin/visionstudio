/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '../backendUrl';

const STORAGE_KEY = 'gemini_api_key';
const GEMINI_KEY_REGEX = /^AIzaSy[A-Za-z0-9_-]{33}$/;

export type ApiKeyStatus = 'not-set' | 'valid' | 'invalid' | 'testing' | 'server-configured';

export interface UseApiKeyReturn {
  // State
  apiKey: string | null;
  status: ApiKeyStatus;
  isTesting: boolean;
  serverKeyConfigured: boolean;

  // Actions
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  testApiKey: (key?: string) => Promise<boolean>;
  validateFormat: (key: string) => boolean;
}

/**
 * Custom hook for managing Gemini API key with localStorage persistence.
 * Provides validation, testing, and secure storage for BYOK pattern.
 *
 * @returns Object with API key state, status, and management functions
 *
 * @example
 * ```tsx
 * const apiKey = useApiKey();
 *
 * // Save a new API key
 * apiKey.setApiKey('AIzaSy...');
 *
 * // Test if key is valid
 * const isValid = await apiKey.testApiKey();
 *
 * // Remove key
 * apiKey.removeApiKey();
 * ```
 */
export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiKeyStatus>('not-set');
  const [isTesting, setIsTesting] = useState(false);
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);

  // Load saved API key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && GEMINI_KEY_REGEX.test(saved)) {
      setApiKeyState(saved);
      setStatus('valid'); // Assume valid until tested
    }
  }, []);

  // Check whether the backend has a working .env key, so the UI can show a
  // distinct "using server key" state instead of looking identical to "no key".
  useEffect(() => {
    let cancelled = false;
    fetch(getBackendUrl('/api/key-status'))
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setServerKeyConfigured(!!data.configured);
      })
      .catch(() => {
        if (!cancelled) setServerKeyConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Validate API key format (39 chars starting with "AIzaSy")
   */
  const validateFormat = useCallback((key: string): boolean => {
    return GEMINI_KEY_REGEX.test(key);
  }, []);

  /**
   * Save API key to localStorage after format validation
   */
  const setApiKey = useCallback(
    (key: string) => {
      const trimmed = key.trim();

      if (!validateFormat(trimmed)) {
        setStatus('invalid');
        return;
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, trimmed);
      setApiKeyState(trimmed);
      setStatus('valid');
    },
    [validateFormat],
  );

  /**
   * Remove API key from localStorage and reset state
   */
  const removeApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState(null);
    setStatus('not-set');
  }, []);

  /**
   * Test API key validity with a lightweight API call
   * Returns true if key is valid, false otherwise
   */
  const testApiKey = useCallback(
    async (key?: string): Promise<boolean> => {
      const keyToTest = key ?? apiKey;
      if (!keyToTest) return false;

      setIsTesting(true);
      setStatus('testing');

      try {
        // Use minimal prompt to avoid wasting quota
        const response = await fetch(getBackendUrl('/api/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': keyToTest,
          },
          body: JSON.stringify({
            prompt: 'test',
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
    },
    [apiKey],
  );

  return {
    apiKey,
    status,
    isTesting,
    serverKeyConfigured,
    setApiKey,
    removeApiKey,
    testApiKey,
    validateFormat,
  };
}
