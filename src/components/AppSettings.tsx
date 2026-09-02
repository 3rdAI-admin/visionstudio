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
                       w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-6 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-brand-blue" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  App Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                disabled={isRestarting}
                aria-label="Close"
                className="p-2.5 -m-2.5 rounded text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/70 leading-relaxed">
                Port changes only take effect after Restart. If you change the frontend port,
                you'll need to manually open the new URL in your browser afterward.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                  Backend port
                </label>
                <input
                  type="number"
                  value={backendPort}
                  onChange={(e) => setBackendPortInput(e.target.value)}
                  disabled={isRestarting}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg
                           text-sm font-mono text-white/80
                           focus:outline-none focus:border-brand-blue disabled:opacity-50 transition-colors"
                />
                {!backendPortValid && (
                  <p className="text-[10px] text-red-400 mt-1">Enter a port 1–65535</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                  Frontend port
                </label>
                <input
                  type="number"
                  value={frontendPort}
                  onChange={(e) => setFrontendPortInput(e.target.value)}
                  disabled={isRestarting}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg
                           text-sm font-mono text-white/80
                           focus:outline-none focus:border-brand-blue disabled:opacity-50 transition-colors"
                />
                {!frontendPortValid && (
                  <p className="text-[10px] text-red-400 mt-1">Enter a port 1–65535</p>
                )}
              </div>
            </div>

            {restartState === 'restarting' && (
              <div className="mb-4 p-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-white/60 animate-spin" />
                <span className="text-xs text-white/70">Stopping and relaunching…</span>
              </div>
            )}
            {restartState === 'waiting' && (
              <div className="mb-4 p-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-white/60 animate-spin" />
                <span className="text-xs text-white/70">Waiting for backend to come back up…</span>
              </div>
            )}
            {restartState === 'ready' && (
              <div className="mb-4 p-2 bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500/90">
                  Backend is back up.
                  {appliedFrontendPort !== null && appliedFrontendPort !== DEFAULT_FRONTEND_PORT
                    ? ` Open http://localhost:${appliedFrontendPort} to continue.`
                    : ' Reload this page to continue.'}
                </span>
              </div>
            )}
            {restartState === 'error' && (
              <div className="mb-4 p-2 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500/90">{restartError}</span>
              </div>
            )}

            <button
              onClick={handleRestart}
              disabled={isRestarting || !backendPortValid || !frontendPortValid}
              className="w-full px-4 py-2 bg-brand-gradient text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] text-[10px] font-bold uppercase tracking-widest rounded-lg
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
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
