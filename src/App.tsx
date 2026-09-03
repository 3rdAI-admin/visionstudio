/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Download,
  RotateCcw,
  Loader2,
  Plus,
  Columns,
  Square,
  Undo,
  Redo,
  Settings,
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

import { useEditHistory } from './hooks/useEditHistory';
import { useApiKey } from './hooks/useApiKey';
import { getBackendUrl } from './backendUrl';
import ApiKeySettings from './components/ApiKeySettings';
import logoEye from '../assets/Digital_Eye_medium.png';

interface ImageState {
  data: string;
  mimeType: string;
}

interface ImageMeta {
  name: string;
  width: number;
  height: number;
  byteSize: number;
}

// Gemini's inline-data limit is ~7 MB; phone photos commonly exceed that.
// Resize anything bigger than 2048 on the long edge or 4 MB on disk.
const MAX_DIM = 2048;
const MAX_BYTES = 4 * 1024 * 1024;
// Restrict to formats Gemini reliably accepts.
const ACCEPT_TYPES = 'image/png,image/jpeg,image/webp,image/heic,image/heif';

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Strip Google SDK boilerplate / fetch errors so users see one human sentence.
function extractFriendlyError(raw: string): string {
  if (!raw) return 'Unknown error';
  const m = raw.match(/\[\d{3}[^\]]*\]\s*([^[]+?)(?:\s*\[\{|$)/);
  if (m) return m[1].trim();
  return raw
    .replace(/^\[GoogleGenerativeAI Error\]:\s*/, '')
    .replace(/^Error fetching from [^:]+:\s*/, '')
    .replace(/^Error:\s*/, '')
    .slice(0, 240);
}

// Canvas-based downscale. Preserves PNG transparency (re-encodes as PNG when
// the source is PNG; otherwise uses JPEG at high quality to keep bytes small).
async function resizeImageIfNeeded(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not decode image'));
      i.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const needsScale = longest > MAX_DIM;
    const needsRecompress = file.size > MAX_BYTES;
    if (!needsScale && !needsRecompress) return file;

    const scale = needsScale ? MAX_DIM / longest : 1;
    const w = Math.max(1, Math.floor(img.naturalWidth * scale));
    const h = Math.max(1, Math.floor(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const isPng = file.type === 'image/png';
    const outType = isPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, isPng ? undefined : 0.92),
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: outType });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function App() {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [prompt, setPrompt] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const [elapsedMs, setElapsedMs] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputAddRef = useRef<HTMLInputElement>(null);
  const genTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = isProcessing || isGenerating || isRemovingBackground;

  // Undo/redo history for edits
  const initialHistoryState = {
    editedImage: null,
    prompt: '',
    timestamp: 0,
    operationType: 'edit' as const,
  };
  const history = useEditHistory(initialHistoryState, 50);

  // API key management
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const apiKeyHook = useApiKey();

  // Undo/redo handlers
  const handleUndo = () => {
    if (!history.canUndo) return;
    history.undo();
    // Restore state from history
    setEditedImage(history.present.editedImage);
    setPrompt(history.present.prompt);
    setCompareMode(!!history.present.editedImage);
  };

  const handleRedo = () => {
    if (!history.canRedo) return;
    history.redo();
    // Restore state from history
    setEditedImage(history.present.editedImage);
    setPrompt(history.present.prompt);
    setCompareMode(!!history.present.editedImage);
  };

  // Real elapsed-time ticker — replaces the hardcoded "4.2s avg" lie
  useEffect(() => {
    if (!isBusy) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 100);
    return () => window.clearInterval(id);
  }, [isBusy]);

  // Keyboard shortcuts: Cmd/Ctrl+Enter submits, Esc dismisses error, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (originalImage && prompt.trim() && !isBusy) {
          e.preventDefault();
          void handleEdit();
        } else if (!originalImage && genPrompt.trim() && !isBusy) {
          e.preventDefault();
          void handleGenerate();
        }
      }
      if (e.key === 'Escape' && error) {
        setError(null);
      }
      // Undo: Cmd/Ctrl+Z (without Shift)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        if (history.canUndo && !isBusy) {
          e.preventDefault();
          handleUndo();
        }
      }
      // Redo: Cmd/Ctrl+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        if (history.canRedo && !isBusy) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage, prompt, genPrompt, isBusy, error, history]);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setError(null);
    try {
      const resized = await resizeImageIfNeeded(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const [header, data] = base64.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        setOriginalImage({ data, mimeType });
        setEditedImage(null);
        setCompareMode(false);
        history.clear(); // Clear history when new image is uploaded

        // Capture dimensions from the resized blob
        const probe = new Image();
        probe.onload = () => {
          setImageMeta({
            name: file.name,
            width: probe.naturalWidth,
            height: probe.naturalHeight,
            byteSize: resized.size,
          });
        };
        probe.src = base64;
      };
      reader.readAsDataURL(resized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read image';
      setError(extractFriendlyError(msg));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processImageFile(file);
    // Reset so re-selecting the same file fires onChange again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processImageFile(file);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    setIsRemovingBackground(true);
    setError(null);
    try {
      const base64Response = await fetch(
        `data:${originalImage.mimeType};base64,${originalImage.data}`,
      );
      const blob = await base64Response.blob();
      const resultBlob = await removeBackground(blob);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImageData = reader.result as string;
        setEditedImage(newImageData);
        setCompareMode(false);

        // Push to history after successful background removal
        history.push({
          editedImage: newImageData,
          prompt: '[Background Removed]',
          timestamp: Date.now(),
          operationType: 'background-removal',
        });
      };
      reader.readAsDataURL(resultBlob);
    } catch (err: unknown) {
      console.error('Error removing background:', err);
      const msg = err instanceof Error ? err.message : 'Background removal failed';
      setError(extractFriendlyError(msg));
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(getBackendUrl('/api/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKeyHook.apiKey && { 'X-API-Key': apiKeyHook.apiKey }),
        },
        body: JSON.stringify({
          image: { data: originalImage.data, mimeType: originalImage.mimeType },
          prompt,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(extractFriendlyError(result.error || `HTTP ${response.status}`));
      } else if (result.image) {
        const newImageData = `data:${result.image.mimeType};base64,${result.image.data}`;
        setEditedImage(newImageData);
        setCompareMode(false);

        // Push to history after successful edit
        history.push({
          editedImage: newImageData,
          prompt: prompt,
          timestamp: Date.now(),
          operationType: 'edit',
        });
      } else if (result.result) {
        // Text-only fallback from the backend — surface it as an info message
        setError(`Model returned text instead of an image: ${result.result}`);
      } else {
        setError('Failed to generate the edited image. Please try a different prompt.');
      }
    } catch (err: unknown) {
      console.error('Error editing image:', err);
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(`Could not reach backend at ${getBackendUrl('')} — ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(getBackendUrl('/api/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKeyHook.apiKey && { 'X-API-Key': apiKeyHook.apiKey }),
        },
        body: JSON.stringify({ prompt: genPrompt }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(extractFriendlyError(result.error || `HTTP ${response.status}`));
      } else if (result.image) {
        setOriginalImage({ data: result.image.data, mimeType: result.image.mimeType });
        setEditedImage(null);
        setCompareMode(false);
        history.clear();

        const probe = new Image();
        probe.onload = () => {
          setImageMeta({
            name: 'generated.png',
            width: probe.naturalWidth,
            height: probe.naturalHeight,
            byteSize: Math.ceil((result.image.data.length * 3) / 4),
          });
        };
        probe.src = `data:${result.image.mimeType};base64,${result.image.data}`;
        setGenPrompt('');
      } else if (result.result) {
        setError(`Model returned text instead of an image: ${result.result}`);
      } else {
        setError('Failed to generate an image. Please try a different prompt.');
      }
    } catch (err: unknown) {
      console.error('Error generating image:', err);
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(`Could not reach backend at ${getBackendUrl('')} — ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setImageMeta(null);
    setPrompt('');
    setError(null);
    setCompareMode(false);
    history.clear();
  };

  const downloadImage = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `visionstudio-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const originalSrc = originalImage
    ? `data:${originalImage.mimeType};base64,${originalImage.data}`
    : null;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0] font-sans selection:bg-white selection:text-black">
      {/* Header — safe-area padding-top so the sticky bar clears the iOS
          status bar/notch in the native (Capacitor) build; a no-op on web,
          where env(safe-area-inset-top) is 0. */}
      <header
        className="h-14 border-b border-white/10 bg-[#161616] sticky top-0 z-30 flex items-center px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src={logoEye} className="w-6 h-6 object-contain" alt="Th3rdAI" />
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-50">
              Th3rdAI Vision Studio — v2.2
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {originalImage && (
              <button
                onClick={reset}
                className="flex items-center gap-2 py-2 -my-2 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
                aria-label="Reset workspace"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Workspace
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative flex items-center gap-2 py-2 -my-2 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
              {/* Status indicator dot */}
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  apiKeyHook.status === 'valid'
                    ? 'bg-green-500'
                    : apiKeyHook.status === 'invalid'
                      ? 'bg-red-500'
                      : apiKeyHook.serverKeyConfigured
                        ? 'bg-blue-500'
                        : 'bg-gray-500'
                }`}
                title={
                  apiKeyHook.status === 'valid'
                    ? 'Browser API key set'
                    : apiKeyHook.status === 'invalid'
                      ? 'Invalid API key'
                      : apiKeyHook.serverKeyConfigured
                        ? 'Using server-configured key (.env)'
                        : 'No API key set'
                }
              />
            </button>
            {editedImage && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={!history.canUndo || isBusy}
                    title="Undo (⌘Z)"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center gap-2
                               text-[10px] font-bold uppercase tracking-widest
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    <Undo className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!history.canRedo || isBusy}
                    title="Redo (⌘⇧Z)"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center gap-2
                               text-[10px] font-bold uppercase tracking-widest
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    <Redo className="w-3 h-3" />
                    <span>Redo</span>
                  </button>
                </div>
              </>
            )}
            {editedImage && (
              <>
                <button
                  onClick={() => setCompareMode((v) => !v)}
                  className="flex items-center gap-2 py-2 -my-2 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
                  aria-pressed={compareMode}
                  aria-label="Toggle before/after comparison"
                  title="Toggle before/after comparison"
                >
                  {compareMode ? <Square className="w-3 h-3" /> : <Columns className="w-3 h-3" />}
                  {compareMode ? 'Single' : 'Compare'}
                </button>
                <button
                  onClick={downloadImage}
                  className="px-4 py-1.5 bg-brand-gradient text-white text-[10px] font-bold uppercase tracking-widest rounded hover:opacity-90 hover:-translate-y-px transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
                >
                  <Download className="w-3 h-3" />
                  Export Image
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait">
          {!originalImage ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="mb-8 sm:mb-12">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <img src={logoEye} className="w-9 h-9 sm:w-12 sm:h-12 object-contain" alt="" />
                  <span className="text-3xl sm:text-5xl font-bold uppercase tracking-tight">
                    <span className="text-white">Th3rd</span>
                    <span className="text-brand-gradient">AI</span>
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] mb-3 sm:mb-4 text-white/40">
                  Neural Imaging Engine
                </h2>
                <h3 className="text-2xl sm:text-4xl font-light mb-6 tracking-tight text-white">
                  Transform any image with{' '}
                  <span className="italic font-serif text-brand-gradient">words</span>
                </h3>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-lg p-5 sm:p-8 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4 sm:mb-6 text-center">
                  Natural Language Prompt
                </h3>
                <textarea
                  ref={genTextareaRef}
                  value={genPrompt}
                  onChange={(e) => {
                    setGenPrompt(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="DESCRIBE THE IMAGE TO GENERATE..."
                  className="w-full h-24 sm:h-28 bg-[#0A0A0A] border border-white/10 rounded p-4 text-xs font-mono text-white/80 placeholder:text-white/35 focus:outline-none focus:border-brand-blue transition-all resize-none uppercase tracking-wider"
                />
                <p className="text-[10px] text-white/45 mt-2 tracking-wide font-mono text-center">
                  ⌘/Ctrl + ENTER to submit
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isBusy || !genPrompt.trim()}
                  className="mt-4 w-full py-3 bg-brand-gradient text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] disabled:opacity-20 rounded text-xs font-bold uppercase tracking-[0.15em] transition-all hover:opacity-90 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Image'}
                </button>
              </div>

              <div className="flex items-center gap-4 my-6 sm:my-8">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
                  Or
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative border-2 border-dashed rounded-lg p-10 sm:p-20 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                  isDragging
                    ? 'border-brand-blue bg-white/[0.08] scale-[1.02]'
                    : 'border-white/25 bg-[#161616] hover:border-white/50 hover:bg-white/[0.03]'
                }`}
                role="button"
                aria-label="Import media: drag and drop or click to browse"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border border-white/25 rounded flex items-center justify-center mb-6 text-white/80 group-hover:text-white group-hover:border-brand-blue transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                    Import Media
                  </p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    DRAG AND DROP OR CLICK TO BROWSE
                  </p>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest mt-3 font-mono">
                    PNG · JPG · WEBP · HEIC · max {MAX_DIM}px / {formatBytes(MAX_BYTES)}{' '}
                    (auto-resized)
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept={ACCEPT_TYPES}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 p-3 bg-red-500/5 border border-red-500/20 rounded text-[10px] uppercase font-bold tracking-widest text-red-500/70">
                  {error}
                </div>
              )}

              <div className="mt-10 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
                {[
                  { title: 'Analysis', desc: 'NEURAL SCENE PARSING' },
                  { title: 'Precision', desc: 'PIXEL-LEVEL CONTROL' },
                  { title: 'Velocity', desc: 'REAL-TIME SYNTHESIS' },
                ].map((feature, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                      {feature.title}
                    </h3>
                    <p className="text-[10px] text-white/20 tracking-widest font-mono">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 items-start"
            >
              {/* Controls Sidebar */}
              <div className="space-y-8 lg:sticky lg:top-24">
                <div className="bg-[#161616] border border-white/10 rounded p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">
                    Adjustment Panel
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3 block">
                        Natural Language Prompt
                      </span>
                      <textarea
                        value={prompt}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="DEFINE TRANSFORMATION..."
                        className="w-full h-40 bg-[#0A0A0A] border border-white/10 rounded p-4 text-xs font-mono text-white/80 placeholder:text-white/10 focus:outline-none focus:border-brand-blue transition-all resize-none uppercase tracking-wider"
                      />
                      <p className="text-[9px] text-white/20 mt-2 tracking-wide font-mono">
                        ⌘/Ctrl + ENTER to submit · ESC to dismiss errors
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded text-[10px] font-bold tracking-widest text-red-500/70 leading-relaxed normal-case">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleEdit}
                      disabled={isBusy || !prompt.trim()}
                      className="w-full py-3 bg-brand-gradient text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] disabled:opacity-20 rounded text-xs font-bold uppercase tracking-[0.15em] transition-all hover:opacity-90 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Process Synthesis'
                      )}
                    </button>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-4">
                      Format Migration
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'To PNG', prompt: 'Convert this image to PNG format' },
                        { label: 'To JPG', prompt: 'Convert this image to JPEG format' },
                        { label: 'To SVG', prompt: 'Convert this image to SVG vector format' },
                        { label: 'To ICO', prompt: 'Convert this image to ICO icon format' },
                      ].map((format, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPrompt(format.prompt);
                            if (error) setError(null);
                          }}
                          className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-brand-blue rounded text-[10px] font-medium uppercase tracking-widest text-white/80 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                        >
                          {format.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-4">
                      Background Removal
                    </h3>
                    <button
                      onClick={handleRemoveBackground}
                      disabled={isBusy}
                      className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 disabled:bg-white/5 border border-white/10 rounded text-[10px] font-bold uppercase tracking-widest text-white disabled:text-white/30 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    >
                      {isRemovingBackground ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Remove Background'
                      )}
                    </button>
                    <p className="text-[9px] text-white/20 mt-2 tracking-wide">
                      Creates PNG with transparent background (client-side, no API)
                    </p>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-4">
                      Preset Macros
                    </h3>
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          label: 'Future Vibe',
                          prompt: 'Add a futuristic, high-tech vibe with neon accents',
                        },
                        {
                          label: 'Vintage Film',
                          prompt:
                            'Make it look like a vintage film photograph with grain and warm tones',
                        },
                        {
                          label: 'Cinematic',
                          prompt: 'Apply dramatic cinematic lighting and high contrast',
                        },
                        {
                          label: 'Replace Sky',
                          prompt: 'Replace the sky with a dramatic starry galaxy or sunset',
                        },
                        {
                          label: '3D Depth',
                          prompt:
                            'Convert this image to have a high-quality 3D depth effect with realistic shading and volume',
                        },
                        {
                          label: 'Cartoonize',
                          prompt: 'Convert this image into a clean 2D cartoon illustration style',
                        },
                      ].map((hint, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPrompt(hint.prompt);
                            if (error) setError(null);
                          }}
                          className="w-full px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-brand-blue rounded text-[10px] font-medium uppercase tracking-widest text-white/80 hover:text-white text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                        >
                          {hint.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input asset card with real metadata */}
                <div className="bg-[#161616] border border-white/10 rounded p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0A0A0A] border border-white/10 rounded overflow-hidden flex-shrink-0">
                    {originalSrc && (
                      <img
                        src={originalSrc}
                        alt="Source"
                        className="w-full h-full object-cover grayscale opacity-50"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest truncate"
                      title={imageMeta?.name || 'Input Asset'}
                    >
                      {imageMeta?.name || 'Input Asset'}
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono truncate">
                      {imageMeta
                        ? `${imageMeta.width}×${imageMeta.height} · ${formatBytes(imageMeta.byteSize)}`
                        : 'READY'}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputAddRef.current?.click()}
                    className="w-11 h-11 flex items-center justify-center border border-white/20 hover:border-brand-blue hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    aria-label="Replace source image"
                    title="Replace source image"
                  >
                    <Plus className="w-4 h-4" />
                    <input
                      type="file"
                      ref={fileInputAddRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept={ACCEPT_TYPES}
                    />
                  </button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex flex-col space-y-4">
                <div className="relative bg-[#0A0A0A] border border-white/10 rounded aspect-[4/3] flex items-center justify-center p-12 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  ></div>

                  <AnimatePresence mode="wait">
                    {isBusy ? (
                      <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                      >
                        <div className="flex space-x-1 mb-4">
                          <div className="w-1 h-1 bg-white/40 animate-pulse"></div>
                          <div className="w-1 h-1 bg-white/40 animate-pulse delay-75"></div>
                          <div className="w-1 h-1 bg-white/40 animate-pulse delay-150"></div>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/40">
                          {isRemovingBackground ? 'Removing Background' : 'Synthesizing Layers'}
                        </p>
                        <p className="text-[10px] text-white/20 mt-2 font-mono tracking-widest">
                          {formatDuration(elapsedMs)}
                        </p>
                      </motion.div>
                    ) : compareMode && editedImage && originalSrc ? (
                      <motion.div
                        key="compare"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative shadow-2xl select-none"
                      >
                        <div className="relative inline-block">
                          {/* After (full) */}
                          <img
                            src={editedImage}
                            alt="After"
                            className="max-w-full h-auto block border border-white/5"
                            referrerPolicy="no-referrer"
                          />
                          {/* Before (clipped from right by split %) */}
                          <img
                            src={originalSrc}
                            alt="Before"
                            className="absolute inset-0 max-w-full h-auto block border border-white/5"
                            style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                            referrerPolicy="no-referrer"
                          />
                          {/* Divider */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none"
                            style={{ left: `${compareSplit}%` }}
                          >
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold shadow-lg">
                              ◀▶
                            </div>
                          </div>
                          {/* Labels */}
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[9px] font-bold tracking-widest uppercase rounded">
                            Before
                          </span>
                          <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[9px] font-bold tracking-widest uppercase rounded">
                            After
                          </span>
                          {/* Range input overlay */}
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={compareSplit}
                            onChange={(e) => setCompareSplit(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                            aria-label="Drag to compare before and after"
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={editedImage ? 'edited' : 'original'}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative shadow-2xl"
                      >
                        <div className="relative min-w-[200px] min-h-[150px] max-w-full">
                          <img
                            src={editedImage || originalSrc!}
                            alt="Preview"
                            className={`max-w-full h-auto border border-white/5 transition-all duration-700 ${!editedImage ? 'filter grayscale-[0.5] opacity-80' : ''}`}
                            referrerPolicy="no-referrer"
                          />

                          {/* Viewfinder UI */}
                          <div className="absolute -top-2 -left-2 border-t border-l border-white/30 w-6 h-6"></div>
                          <div className="absolute -top-2 -right-2 border-t border-r border-white/30 w-6 h-6"></div>
                          <div className="absolute -bottom-2 -left-2 border-b border-l border-white/30 w-6 h-6"></div>
                          <div className="absolute -bottom-2 -right-2 border-b border-r border-white/30 w-6 h-6"></div>
                        </div>

                        <div className="absolute -bottom-8 left-0 text-[10px] text-white/30 font-mono tracking-widest uppercase">
                          {editedImage ? 'STATE: SYNTHESIZED' : 'STATE: RAW INPUT'} | FORMAT:{' '}
                          {(editedImage
                            ? editedImage.match(/^data:(.*?);/)?.[1]
                            : originalImage?.mimeType
                          )
                            ?.split('/')[1]
                            ?.toUpperCase()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-between items-center px-2">
                  <div className="flex space-x-6">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-tighter text-white/20 font-bold">
                        Engine
                      </span>
                      <p className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                        Gemini 2.5 Flash Image
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-tighter text-white/20 font-bold">
                        {isBusy ? 'Elapsed' : 'Last Run'}
                      </span>
                      <p className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                        {isBusy ? formatDuration(elapsedMs) : editedImage ? 'Done' : 'Idle'}
                      </p>
                    </div>
                  </div>
                  {editedImage && (
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-white/60">
                        Export Ready
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-white/5 py-10 opacity-30">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={logoEye} className="w-4 h-4 grayscale" alt="Logo" />
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]">
              TH3RDAI VISION SYSTEM — 2026
            </div>
          </div>
          <div className="flex space-x-8">
            <span className="text-[10px] tracking-widest font-mono uppercase">Status: Online</span>
            <span className="text-[10px] tracking-widest font-mono uppercase">Region: US-WEST</span>
          </div>
        </div>
      </footer>

      {/* API Key Settings Modal */}
      <ApiKeySettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
