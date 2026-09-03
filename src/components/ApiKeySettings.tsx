/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Key, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import type { UseApiKeyReturn } from '../hooks/useApiKey';

export interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyHook: UseApiKeyReturn;
}

/**
 * Settings modal for managing Gemini API key.
 * Allows users to add, test, edit, and remove their API key with BYOK pattern.
 *
 * Takes apiKeyHook as a prop rather than calling useApiKey() itself — the
 * hook holds React state (the loaded key, its status), and a second
 * independent call site would get its own separate copy of that state
 * instead of sharing it with App.tsx, which is what actually sends the
 * X-API-Key header on edit/generate requests. Saving a key here previously
 * updated only this component's own copy, leaving App.tsx's apiKeyHook.apiKey
 * null until the app was fully reloaded.
 */
export default function ApiKeySettings({ isOpen, onClose, apiKeyHook }: ApiKeySettingsProps) {
  const { apiKey, status, isTesting, setApiKey, removeApiKey, testApiKey, validateFormat } =
    apiKeyHook;
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Update input value when apiKey changes (e.g., loaded from localStorage)
  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);

  const handleSave = () => {
    // Validate before saving
    if (!validateFormat(inputValue)) {
      setTestResult('error');
      return;
    }
    setApiKey(inputValue);
    setTestResult('success');
  };

  const handleTest = async () => {
    if (!validateFormat(inputValue)) {
      setTestResult('error');
      return;
    }
    setTestResult(null);
    const valid = await testApiKey(inputValue);
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
          {/* Dark overlay - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-6 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-brand-blue" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  API Key Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2.5 -m-2.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Security warning */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-500/80 leading-relaxed">
                Your API key is stored in browser localStorage and sent with each request. Use only
                on trusted devices. Never share screenshots of this page.
              </p>
            </div>

            {/* Input field with show/hide toggle */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                Google Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg pr-10
                           text-base sm:text-sm font-mono text-white/80 placeholder:text-white/20
                           focus:outline-none focus:border-brand-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-1 font-mono">
                39 characters starting with "AIzaSy"
              </p>
            </div>

            {/* Test result feedback */}
            {testResult === 'success' && (
              <div className="mb-4 p-2 bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500/90">API key is valid!</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="mb-4 p-2 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500/90">Invalid API key or test failed</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleTest}
                disabled={!inputValue || isTesting}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-brand-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-lg
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                {isTesting ? 'Testing...' : 'Test Key'}
              </button>
              <button
                onClick={handleSave}
                disabled={!inputValue}
                className="flex-1 px-4 py-2 bg-brand-gradient text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] text-[10px] font-bold uppercase tracking-widest rounded-lg
                         hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
              >
                Save
              </button>
            </div>

            <button
              onClick={handleRemove}
              disabled={!apiKey}
              className="w-full px-4 py-2 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-lg
                       hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed mb-4 transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Remove Key
            </button>

            {/* Link to get API key */}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-brand-blue hover:text-brand-purple transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
            >
              Get API Key from Google AI Studio
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
