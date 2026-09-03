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
// backend/index.js's own default port. Derived from the page's own hostname
// (not a hardcoded 'localhost') so it works both from the Mac itself and
// from another device on the LAN loading the dev server's --host=0.0.0.0
// address (e.g. a phone browsing to http://192.168.x.x:3002) — a hardcoded
// 'localhost' would resolve to the phone itself in that case, not the Mac.
// Electron loads the UI via loadFile() (a file:// page), where
// window.location.hostname is '' — falls back to 'localhost' there, same
// as the non-browser (SSR/test) case where `window` itself is undefined.
const DEV_DEFAULT =
  typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:3001`
    : 'http://localhost:3001';

// Shared "this request came from a real copy of the app" secret, baked in
// at build time via VITE_APP_SECRET (see ios/build-release.sh — the only
// build that needs it, since it's the only one talking to the shared hosted
// backend; Electron forks its own local backend and never sets HOSTED, so
// the check never triggers there regardless of what's baked in). Not
// per-user auth — every install of a given build shares the same value —
// it's a bot/scanner filter for the public hosted backend, not access
// control. The server only enforces this when HOSTED=true.
const APP_SECRET = import.meta.env.VITE_APP_SECRET as string | undefined;

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

/**
 * Headers every backend request should send, beyond Content-Type/X-API-Key
 * (which callers already set per-request). Currently just the shared app
 * secret when one was baked into this build; an empty object otherwise, so
 * spreading it into a headers object is always safe.
 */
export function getAppSecretHeaders(): Record<string, string> {
  return APP_SECRET ? { 'X-App-Secret': APP_SECRET } : {};
}
