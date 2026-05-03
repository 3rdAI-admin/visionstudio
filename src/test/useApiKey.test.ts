/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApiKey } from '../hooks/useApiKey';

describe('useApiKey', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should initialize with null key and not-set status', () => {
    const { result } = renderHook(() => useApiKey());

    expect(result.current.apiKey).toBe(null);
    expect(result.current.status).toBe('not-set');
    expect(result.current.isTesting).toBe(false);
  });

  it('should load saved key from localStorage on mount', () => {
    const testKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
    localStorage.setItem('gemini_api_key', testKey);

    const { result } = renderHook(() => useApiKey());

    expect(result.current.apiKey).toBe(testKey);
    expect(result.current.status).toBe('valid');
  });

  it('should validate API key format correctly', () => {
    const { result } = renderHook(() => useApiKey());

    // Valid key
    expect(result.current.validateFormat('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567')).toBe(true);

    // Invalid keys
    expect(result.current.validateFormat('invalid_key')).toBe(false);
    expect(result.current.validateFormat('AIzaSy')).toBe(false); // Too short
    expect(result.current.validateFormat('XYZaSyDEMO_KEY_FOR_TESTING_1234567890')).toBe(false); // Wrong prefix
    expect(result.current.validateFormat('')).toBe(false); // Empty
  });

  it('should save valid key to localStorage', () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    act(() => {
      result.current.setApiKey(validKey);
    });

    expect(result.current.apiKey).toBe(validKey);
    expect(result.current.status).toBe('valid');
    expect(localStorage.getItem('gemini_api_key')).toBe(validKey);
  });

  it('should reject invalid key format', () => {
    const { result } = renderHook(() => useApiKey());
    const invalidKey = 'invalid_key_format';

    act(() => {
      result.current.setApiKey(invalidKey);
    });

    expect(result.current.apiKey).toBe(null);
    expect(result.current.status).toBe('invalid');
    expect(localStorage.getItem('gemini_api_key')).toBe(null);
  });

  it('should trim whitespace when saving key', () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
    const keyWithWhitespace = `  ${validKey}  `;

    act(() => {
      result.current.setApiKey(keyWithWhitespace);
    });

    expect(result.current.apiKey).toBe(validKey);
    expect(localStorage.getItem('gemini_api_key')).toBe(validKey);
  });

  it('should remove key from localStorage', () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    // Set a key first
    act(() => {
      result.current.setApiKey(validKey);
    });

    expect(result.current.apiKey).toBe(validKey);

    // Remove the key
    act(() => {
      result.current.removeApiKey();
    });

    expect(result.current.apiKey).toBe(null);
    expect(result.current.status).toBe('not-set');
    expect(localStorage.getItem('gemini_api_key')).toBe(null);
  });

  it('should test key with API call and return success', async () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    // Mock successful fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: 'Success' }),
      } as Response),
    );

    // Set the key first
    act(() => {
      result.current.setApiKey(validKey);
    });

    // Test the key
    let testResult: boolean = false;
    await act(async () => {
      testResult = await result.current.testApiKey();
    });

    expect(testResult).toBe(true);
    expect(result.current.status).toBe('valid');
    expect(result.current.isTesting).toBe(false);

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-Key': validKey,
        }),
      }),
    );
  });

  it('should test key with API call and return failure', async () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    // Mock failed fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      } as Response),
    );

    // Set the key first
    act(() => {
      result.current.setApiKey(validKey);
    });

    // Test the key
    let testResult: boolean = true;
    await act(async () => {
      testResult = await result.current.testApiKey();
    });

    expect(testResult).toBe(false);
    expect(result.current.status).toBe('invalid');
    expect(result.current.isTesting).toBe(false);
  });

  it('should handle test API call network error', async () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    // Mock network error
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    // Set the key first
    act(() => {
      result.current.setApiKey(validKey);
    });

    // Test the key
    let testResult: boolean = true;
    await act(async () => {
      testResult = await result.current.testApiKey();
    });

    expect(testResult).toBe(false);
    expect(result.current.status).toBe('invalid');
    expect(result.current.isTesting).toBe(false);
  });

  it('should reset isTesting after API test completes', async () => {
    const { result } = renderHook(() => useApiKey());
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';

    // Mock successful fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: 'Success' }),
      } as Response),
    );

    // Set the key first
    act(() => {
      result.current.setApiKey(validKey);
    });

    // Before test, isTesting should be false
    expect(result.current.isTesting).toBe(false);

    // Run the test
    await act(async () => {
      await result.current.testApiKey();
    });

    // After completion, isTesting should be false
    expect(result.current.isTesting).toBe(false);
  });

  it('should not test if no API key is set', async () => {
    const { result } = renderHook(() => useApiKey());

    // No API key set, testApiKey should return false without calling fetch
    const testResult = await result.current.testApiKey();

    expect(testResult).toBe(false);
  });
});
