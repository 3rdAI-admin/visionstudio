# Th3rdAI Vision Studio (visionstudio)

Browser-based image editor and converter that transforms images via natural-language prompts and AI-powered background removal. React + TypeScript frontend, Node/Express backend proxy in front of Google's `gemini-2.5-flash-image` model (Nano Banana), plus client-side background removal.

> View in AI Studio: https://ai.studio/apps/9516ebad-6c76-4d79-a898-40fd8116c3b3

## Features

- ✨ **Natural Language Editing** - Transform images with text prompts (e.g., "Add futuristic neon accents", "Make it look vintage")
- 🎨 **Preset Macros** - One-click style transformations (Future Vibe, Vintage Film, Cinematic, 3D Depth, Cartoonize)
- 🖼️ **Format Conversion** - Convert between PNG, JPG, SVG, ICO formats
- ✂️ **Background Removal** - AI-powered background removal that creates true transparent PNGs (runs client-side, no API needed)
- ↩️ **Undo/Redo** - Navigate through edit history with ⌘Z / ⌘⇧Z shortcuts or UI buttons (up to 50 states)
- ↔️ **Before / After Compare** - Drag a slider over the result to reveal the original underneath
- ⌨️ **Keyboard Shortcuts** - `⌘/Ctrl + Enter` submits prompt; `Esc` dismisses errors; `⌘/Ctrl + Z` undo; `⌘/Ctrl + Shift + Z` redo
- 🪶 **Auto-Resize** - Large uploads (> 2048px or > 4 MB) are downscaled in the browser before being sent, so phone photos don't blow Gemini's 7 MB inline-data limit
- 🖱️ **Drag & Drop** - Upload images by dragging into the browser
- 📊 **Real Elapsed Timer** - Shows live processing time (no fake "4.2s avg" placeholder)
- 💾 **Export** - Download edited images with one click

## Architecture

```
┌─────────────────────────────────────┐         ┌──────────────────────┐         ┌────────────────────────────┐
│ Frontend (Vite + React)             │  POST   │ Backend (Express)    │  HTTPS  │ Google Generative Language │
│ http://localhost:3000               │────────▶│ http://localhost:3001│────────▶│ gemini-2.5-flash-image     │
│                                     │  /api/  │ backend/index.js     │         │ (image edit/convert/gen)   │
│ + @imgly/background-removal         │ generate└──────────────────────┘         └────────────────────────────┘
│   (client-side WASM, ~5MB model)    │
└─────────────────────────────────────┘
```

**Security:** The Gemini API key never reaches the browser — the React app talks only to the Node backend, which holds the key in `backend/.env`.

**Background Removal:** Runs 100% client-side using WebAssembly. First use downloads a ~5MB AI model, then works offline.

## Prerequisites

- **Node.js** ≥ 18
- A **Gemini API key** from <https://aistudio.google.com/apikey>. The key must have access to `gemini-2.5-flash-image` (free tier works for low volume; production use needs billing enabled).

## Setup

```bash
# 1. Install frontend deps
npm install

# 2. Install backend deps (separate package.json)
cd backend
npm install
cd ..

# 3. Add your API key
echo 'GOOGLE_API_KEY=AIzaSy...your-39-char-key' > backend/.env
```

A real Gemini API key is exactly 39 characters and starts with `AIzaSy`. Anything else (including `your-secure-key-here`) will produce `API_KEY_INVALID` from Google.

## Using Your Own API Key (Optional)

VisionStudio supports two modes:

**Option 1: Shared Backend Key (Current)**
Add `GOOGLE_API_KEY` to `backend/.env` - all users share this key and rate limits.

**Option 2: Bring Your Own Key (BYOK)**

1. Click the Settings icon (⚙️) in the top-right
2. Enter your Gemini API key from https://aistudio.google.com/apikey
3. Click "Test Key" to verify it works
4. Click "Save" - your key is stored in browser localStorage

**Security Note:** Your API key is stored in your browser's localStorage and sent with each request.
This is secure for personal use but vulnerable to XSS attacks. Never use this on untrusted networks
or shared computers. You can remove your key anytime via Settings.

## Run

Two processes, two terminals:

```bash
# Terminal 1 — backend (port 3001)
cd backend && node index.js
# → "Backend running at http://localhost:3001"

# Terminal 2 — frontend (port 3000)
npm run dev
# → "VITE v6.4.2 ready"
```

Open <http://localhost:3000>.

## API contract

`POST /api/generate`

```jsonc
// Request
{
  "prompt": "Replace the sky with a starry galaxy",
  "image": {                       // optional — text-only prompts also work
    "data": "iVBORw0KG...",        // base64-encoded bytes (no data: prefix)
    "mimeType": "image/png"
  }
}

// Response — image edit/generation
{ "image": { "data": "iVBORw0KG...", "mimeType": "image/png" } }

// Response — text-only fallback (if model returns no image)
{ "result": "explanatory text..." }

// Response — error
{ "error": "human-readable message from Google or local validation" }
```

CORS is restricted to `http://localhost:3000`. Body limit is 25 MB so typical UI uploads fit.

## Smoke test

```bash
curl -sS -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a tiny red square as PNG"}' | head -c 200
# → {"image":{"data":"iVBORw0KGgo..."
```

## Usage

### Image Editing with Prompts

1. Upload an image (drag & drop or click to browse)
2. Enter a natural language prompt or select a preset macro
3. Click "Process Synthesis"
4. Download the result

**Example prompts:**

- "Add a futuristic, high-tech vibe with neon accents"
- "Make it look like a vintage film photograph with grain and warm tones"
- "Apply dramatic cinematic lighting and high contrast"
- "Convert this image to PNG format"

### Background Removal

1. Upload an image
2. Click "Remove Background" button
3. Wait a few seconds (first run downloads ~5MB AI model)
4. Download the transparent PNG

**Note:** The background removal model downloads once on first use and is cached in the browser. The process runs entirely client-side and works offline after the initial download.

## Project layout

```
visionstudio/
├── assets/                      # Brand logos imported by App.tsx (project root)
│   ├── Digital_Eye_medium.png   # Eye logo (header + footer)
│   └── th3rdai-clear.png        # Wordmark (hero)
├── backend/
│   ├── index.js                 # Express server, single /api/generate route
│   ├── .env                     # GOOGLE_API_KEY (gitignored)
│   └── package.json             # express, cors, dotenv, @google/generative-ai
├── src/
│   ├── App.tsx                  # Single-page editor (upload → prompt → result + bg removal)
│   ├── main.tsx
│   ├── index.css
│   └── assets/images/           # Larger logo PNGs (unused; kept for reference)
├── index.html
├── vite.config.ts
└── package.json                 # react, motion/react, lucide-react, vite,
                                 # @imgly/background-removal
```

## Troubleshooting

| Symptom                                                  | Cause / fix                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{"error":"... API_KEY_INVALID ..."}`                    | `backend/.env` still has placeholder, or wrong key type. Real keys are 39 chars starting with `AIzaSy`. Restart backend after updating.              |
| `{"error":"models/gemini-2.5-flash-image is not found"}` | Backend's `@google/generative-ai` SDK is too old. `cd backend && npm install @google/generative-ai@latest`                                           |
| Browser shows broken-image icons for logos               | Hard reload (Cmd-Shift-R). Logos are imported from `../assets/` and served by Vite.                                                                  |
| `CORS policy` errors in browser console                  | Frontend running somewhere other than `:3000`. Update `app.use(cors({ origin: ... }))` in `backend/index.js`.                                        |
| `Failed to fetch` from frontend                          | Backend isn't running, or crashed. Check `tail -20 /tmp/visionstudio-backend.log` (or whatever you redirect stdout to).                                |
| Backend silently restarts when editing                   | Vite watches the project root including `backend/` — that's expected dev-loop behavior. Production should run them separately.                       |
| Background removal stuck on "Processing..."              | First run downloads ~5MB model. Check browser DevTools Network tab. If download fails, check internet connection and try again.                      |
| Background removal fails with error                      | Browser may not support WebAssembly. Try Chrome/Edge/Firefox latest. Safari should also work.                                                        |
| Transparency has checkerboard pattern                    | This is the browser's default way of showing transparency. The actual PNG has a true alpha channel - download and open in an image editor to verify. |

## Logs

Backend logs every request (timestamp, method, path, status, duration, response bytes). If you start it with `nohup node index.js > /tmp/visionstudio-backend.log 2>&1 &`, tail that file. Otherwise it's stdout.
