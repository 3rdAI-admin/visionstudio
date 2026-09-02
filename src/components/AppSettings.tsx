/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Server, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getBackendPort, setBackendPort, getBackendUrl } from '../backendUrl';

export interface AppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const FRONTEND_PORT_KEY = 'frontend_port';
const DEFAULT_FRONTEND_PORT = window.location.port ? Number(window.location.port) : 3002;

function getSavedFrontendPort(): number {
  const saved = localStorage.getItem(FRONTEND_PORT_KEY);
  const port = saved ? Number(saved) : NaN;
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_FRONTEND_PORT;
}

type RestartState = 'idle' | 'restarting' | 'waiting' | 'ready' | 'error';

/**
 * Settings modal for backend/frontend port config and restarting both
 * processes. Port changes only take effect after Restart — Vite and the
 * backend can't rebind their listener live.
 */
export default function AppSettings({ isOpen, onClose }: AppSettingsProps) {
  const [backendPort, setBackendPortInput] = useState(String(getBackendPort()));
  const [frontendPort, setFrontendPortInput] = useState(String(getSavedFrontendPort()));
  const [restartState, setRestartState] = useState<RestartState>('idle');
  const [restartError, setRestartError] = useState<string | null>(null);
  const [appliedFrontendPort, setAppliedFrontendPort] = useState<number | null>(null);

  const validatePort = (value: string): number | null => {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
  };

  const backendPortValid = validatePort(backendPort) !== null;
  const frontendPortValid = validatePort(frontendPort) !== null;

  const handleRestart = async () => {
    const validBackendPort = validatePort(backendPort);
    const validFrontendPort = validatePort(frontendPort);
    if (validBackendPort === null || validFrontendPort === null) return;

    // Persist locally so this tab (and future loads) use the new backend
    // port once it comes back up.
    setBackendPort(validBackendPort);
    localStorage.setItem(FRONTEND_PORT_KEY, String(validFrontendPort));
    setAppliedFrontendPort(validFrontendPort);

    setRestartState('restarting');
    setRestartError(null);

    try {
      await fetch(getBackendUrl('/api/restart'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backendPort: validBackendPort, frontendPort: validFrontendPort }),
      });
    } catch {
      // The backend often drops the connection as it exits before the
      // response finishes — that's expected, not a failure.
    }

    setRestartState('waiting');

    // Poll the (possibly new) backend port until it responds again.
    const backendUrl = `http://localhost:${validBackendPort}/api/key-status`;
    const deadline = Date.now() + 30_000;
    const poll = async () => {
      if (Date.now() > deadline) {
        setRestartState('error');
        setRestartError('Backend did not come back within 30s. Check .run/backend.log.');
        return;
      }
      try {
        const res = await fetch(backendUrl, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setRestartState('ready');
          return;
        }
      } catch {
        // still down — keep polling
      }
      setTimeout(poll, 1000);
    };
    setTimeout(poll, 1500);
  };

  const isRestarting = restartState === 'restarting' || restartState === 'waiting';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isRestarting ? undefined : onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold">App Settings</h2>
              </div>
              <button onClick={onClose} disabled={isRestarting} aria-label="Close">
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700 disabled:opacity-30" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Port changes only take effect after Restart. If you change the frontend port,
                you'll need to manually open the new URL in your browser afterward.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backend port
                </label>
                <input
                  type="number"
                  value={backendPort}
                  onChange={(e) => setBackendPortInput(e.target.value)}
                  disabled={isRestarting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                {!backendPortValid && (
                  <p className="text-xs text-red-600 mt-1">Enter a port 1–65535</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frontend port
                </label>
                <input
                  type="number"
                  value={frontendPort}
                  onChange={(e) => setFrontendPortInput(e.target.value)}
                  disabled={isRestarting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                {!frontendPortValid && (
                  <p className="text-xs text-red-600 mt-1">Enter a port 1–65535</p>
                )}
              </div>
            </div>

            {restartState === 'restarting' && (
              <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                <span className="text-sm text-gray-700">Stopping and relaunching…</span>
              </div>
            )}
            {restartState === 'waiting' && (
              <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                <span className="text-sm text-gray-700">Waiting for backend to come back up…</span>
              </div>
            )}
            {restartState === 'ready' && (
              <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">
                  Backend is back up.
                  {appliedFrontendPort !== null && appliedFrontendPort !== DEFAULT_FRONTEND_PORT
                    ? ` Open http://localhost:${appliedFrontendPort} to continue.`
                    : ' Reload this page to continue.'}
                </span>
              </div>
            )}
            {restartState === 'error' && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">{restartError}</span>
              </div>
            )}

            <button
              onClick={handleRestart}
              disabled={isRestarting || !backendPortValid || !frontendPortValid}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
              {isRestarting ? 'Restarting…' : 'Save & Restart App'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
