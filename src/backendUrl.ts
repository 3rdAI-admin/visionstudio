/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'backend_port';
const DEFAULT_PORT = 3001;

/**
 * Backend port, editable from Settings and persisted in localStorage.
 * Falls back to the default (matches backend/index.js's own default) when unset.
 */
export function getBackendPort(): number {
  const saved = localStorage.getItem(STORAGE_KEY);
  const port = saved ? Number(saved) : NaN;
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

export function setBackendPort(port: number): void {
  localStorage.setItem(STORAGE_KEY, String(port));
}

export function getBackendUrl(path: string): string {
  return `http://localhost:${getBackendPort()}${path}`;
}
