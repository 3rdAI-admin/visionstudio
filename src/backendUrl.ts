/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'backend_url';

// Ships as the app's default once Track 1 (hosting) is live — set via
// VITE_BACKEND_URL at build time so a Capacitor build always points at a
// real HTTPS host (iOS blocks plain http:// outside a browser tab, and
// there's no "localhost dev server" to fall back on in a native bundle).
const BUILD_DEFAULT = import.meta.env.VITE_BACKEND_URL as string | undefined;

// Local development fallback when no VITE_BACKEND_URL is set — matches
// backend/index.js's own default port.
const DEV_DEFAULT = 'http://localhost:3001';

/**
 * Backend base URL. Order of precedence: a value saved via setBackendUrl()
 * (e.g. from a future settings UI) > VITE_BACKEND_URL baked in at build time
 * > local dev default. Trailing slashes are stripped so callers can safely
 * do `${getBackendUrl()}/api/...`.
 */
export function getBackendUrl(path: string = ''): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  const base = (saved || BUILD_DEFAULT || DEV_DEFAULT).replace(/\/+$/, '');
  return `${base}${path}`;
}

export function setBackendUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ''));
}

export function resetBackendUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}
