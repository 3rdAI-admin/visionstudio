/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl, getAppSecretHeaders } from '../backendUrl';

const STORAGE_KEY = 'gemini_model';

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

// Mirrors backend/index.js's MODELS — used as the picker's content until
// /api/models responds, and as a fallback if that request fails.
const FALLBACK_MODELS: ModelOption[] = [
  { id: 'gemini-3.1-flash-image', label: 'Nano Banana 2', description: 'Default — fast, ~$0.067/image' },
  { id: 'gemini-3-pro-image', label: 'Nano Banana Pro', description: 'Higher quality, ~$0.13/image' },
];
const FALLBACK_DEFAULT = FALLBACK_MODELS[0].id;

export interface UseModelReturn {
  models: ModelOption[];
  selectedModel: string;
  setSelectedModel: (id: string) => void;
}

/**
 * Manages which Gemini image model to use, with localStorage persistence.
 * Fetches the allowlist from /api/models so the picker always matches what
 * the backend will actually accept — falls back to a local copy if that
 * request fails (e.g. backend not reachable yet).
 */
export function useModel(): UseModelReturn {
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS);
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || FALLBACK_DEFAULT;
  });

  useEffect(() => {
    let cancelled = false;
    fetch(getBackendUrl('/api/models'), { headers: getAppSecretHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.models) || data.models.length === 0) return;
        setModels(data.models);
        // If the persisted choice isn't in the server's list (e.g. it was
        // removed), fall back to the server's default instead of sending an
        // id the backend will reject.
        setSelectedModelState((current) =>
          data.models.some((m: ModelOption) => m.id === current) ? current : data.default || FALLBACK_DEFAULT,
        );
      })
      .catch(() => {
        // Keep the fallback list — /api/generate still validates server-side.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedModel = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedModelState(id);
  }, []);

  return { models, selectedModel, setSelectedModel };
}
