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
│ http://localhost:3002               │────────▶│ http://localhost:3001│────────▶│ gemini-2.5-flash-image     │
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

# Terminal 2 — frontend (port 3002)
npm run dev
# → "VITE v6.4.2 ready"
```

Or use `./startup.sh start` to launch both as background processes (see `./startup.sh status`/`stop`/`restart`); it defaults to the same ports and can be reconfigured via the app's Settings UI.

Open <http://localhost:3002>.

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

CORS is restricted to the frontend's origin (`http://localhost:3002` by default, configurable via `FRONTEND_ORIGIN`). Body limit is 25 MB so typical UI uploads fit.

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

| Symptom                                                                                   | Cause / fix                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{"error":"... API_KEY_INVALID ..."}`                                                     | `backend/.env` still has placeholder, or wrong key type. Real keys are 39 chars starting with `AIzaSy`. Restart backend after updating.                                                                                                                                                                                                                                                           |
| `{"error":"models/gemini-2.5-flash-image is not found"}`                                  | Backend's `@google/generative-ai` SDK is too old. `cd backend && npm install @google/generative-ai@latest`                                                                                                                                                                                                                                                                                        |
| Browser shows broken-image icons for logos                                                | Hard reload (Cmd-Shift-R). Logos are imported from `../assets/` and served by Vite.                                                                                                                                                                                                                                                                                                               |
| `CORS policy` errors in browser console                                                   | Frontend running on a port the backend doesn't expect. Set `FRONTEND_ORIGIN` env var (or use the Settings UI's port config, which sets it automatically) to match.                                                                                                                                                                                                                                                                                     |
| `Failed to fetch` from frontend                                                           | Backend isn't running, or crashed. Check `tail -20 /tmp/visionstudio-backend.log` (or whatever you redirect stdout to).                                                                                                                                                                                                                                                                           |
| Backend silently restarts when editing                                                    | Vite watches the project root including `backend/` — that's expected dev-loop behavior. Production should run them separately.                                                                                                                                                                                                                                                                    |
| Background removal stuck on "Processing..."                                               | First run downloads ~5MB model. Check browser DevTools Network tab. If download fails, check internet connection and try again.                                                                                                                                                                                                                                                                   |
| Background removal fails with error                                                       | Browser may not support WebAssembly. Try Chrome/Edge/Firefox latest. Safari should also work.                                                                                                                                                                                                                                                                                                     |
| Transparency has checkerboard pattern                                                     | This is the browser's default way of showing transparency. The actual PNG has a true alpha channel - download and open in an image editor to verify.                                                                                                                                                                                                                                              |
| Safari: "Safari Can't Open the Page" / can't establish a secure connection to `localhost` | Safari force-upgrades the request to `https://`, even if you type `http://` explicitly. Caused by a stale HSTS entry for the bare `localhost` host (left behind by some other local HTTPS dev server you've run before) — the app itself only ever serves plain HTTP. Fix: quit Safari, delete `~/Library/Containers/com.apple.Safari/Data/Library/Caches/WebKit/HSTS/HSTS.plist`, reopen Safari. |

## Logs

Backend logs every request (timestamp, method, path, status, duration, response bytes). If you start it with `nohup node index.js > /tmp/visionstudio-backend.log 2>&1 &`, tail that file. Otherwise it's stdout.

## iOS app (Capacitor)

VisionStudio also ships as a native iOS app via [Capacitor](https://capacitorjs.com), wrapping the same `dist/` build. Xcode project: `ios/App/App.xcodeproj`. Bundle ID: `com.th3rdai.visionstudio`.

### Build and sync

The native app needs a backend it can actually reach — `localhost` doesn't resolve on a device/simulator the way it does in a browser, so point the build at your Mac's LAN IP:

```bash
# Find your Mac's LAN IP
ipconfig getifaddr en0

# Build the frontend with that IP baked in, then sync into the Xcode project
VITE_BACKEND_URL=http://<your-lan-ip>:3001 npm run build
npx cap sync ios
```

`ios/App/App/public/` (Capacitor's copy of `dist/`) is gitignored — always re-run the above before opening Xcode if it might be stale. Both the Mac (running `./startup.sh start`) and the device must be on the **same Wi-Fi network** — the simulator shares the Mac's network stack automatically, but a real device does not.

### Run in Simulator

Open `ios/App/App.xcodeproj` in Xcode, pick a simulator, and hit Run — no extra signing setup needed.

### Run on a real device

Real-device builds need a development team, which isn't set in the checked-in `.pbxproj`:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS' \
  DEVELOPMENT_TEAM=<your-team-id> \
  -allowProvisioningUpdates archive ...
# or simplest: open the project in Xcode, select your device as the run
# destination, and set the team under Signing & Capabilities — Xcode
# handles automatic provisioning from there.
```

To install and launch without Xcode's UI (e.g. from a script), use `devicectl`:

```bash
xcrun devicectl list devices    # find your device's CoreDevice identifier
xcrun devicectl device install app --device <coredevice-id> <path-to-.app>
xcrun devicectl device process launch --device <coredevice-id> com.th3rdai.visionstudio
```

`xcrun xctrace list devices` can show a stale "Offline" status for a device that's actually connected — trust `devicectl`'s view over `xctrace`'s if they disagree.

`ios/App/App/Info.plist` has an ATS exception (`NSAllowsLocalNetworking`) to permit plain-HTTP LAN traffic to the dev backend. That's dev-only — don't widen it to `NSAllowsArbitraryLoads` as a shortcut for a hosted backend; use real HTTPS instead (see below).

## Hosted / production backend (`HOSTED=true`)

By default the backend runs in local-dev mode: it accepts a shared key from `backend/.env` and exposes `POST /api/restart` (used by the Settings UI to restart the backend after a port change). Neither is appropriate for a backend reachable from the internet.

Set `HOSTED=true` in the deployment's environment to disable both:

- `/api/restart` is not registered at all (no self-restart endpoint exposed publicly).
- The `.env` shared-key fallback is disabled — every request **must** include its own `X-API-Key` header with a caller-supplied Gemini API key. There's no `GOOGLE_API_KEY` on a hosted server.

```bash
# systemd unit env file, e.g. /etc/visionstudio-backend.env
HOSTED=true
PORT=3011
```

Deploy like any other Node service behind a reverse proxy: app in `/opt/<name>`, secrets in a root-only env file (`chmod 600`), a systemd unit, nginx reverse-proxy + Let's Encrypt. **Do not set `MemoryDenyWriteExecute=true`** in the systemd unit's hardening block — it crashes Node with a fatal V8 OOM (JIT needs executable-memory allocation that directive blocks); every other hardening directive is fine.

Note: Google's Gemini API has been observed geo/IP-reputation-blocking requests from at least one datacenter IP range ("User location is not supported for the API use.") even with a valid key that works fine from a residential/office IP. **This isn't a Linode-wide issue** — it was specific to the `us-lax` (Los Angeles) region; a `us-east` (Newark, NJ) Linode reaches `generativelanguage.googleapis.com` fine. Verify a hosted deployment can actually reach `generativelanguage.googleapis.com` before assuming a `HOSTED=true` deploy is fully working end-to-end — a quick check: `curl -s https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY` from the server itself should return a model list, not an error.

`vision.th3rdai.com` is live and reachable from anywhere with internet access — the iOS app's release build (`npm run build:ios:release`) defaults to this URL, so a distributed `.ipa` doesn't require the Mac or the LAN to be running.

## macOS app auto-updates

The Electron macOS build (`npm run electron:build`) checks GitHub Releases for updates on launch and every 4 hours via [`electron-updater`](https://www.electron.build/auto-update) — no separate update server. When a newer version is found it downloads in the background and prompts to restart once ready.

To cut a release:

```bash
GH_TOKEN=<a GitHub token with repo scope> npm run electron:release
```

This builds and **publishes** the `.dmg`/`.pkg`/`.zip` plus the `latest-mac.yml` manifest directly to a new GitHub Release on this repo (tag = the `version` in `package.json` — bump it first). `electron-updater` requires the `zip` target specifically (not just `dmg`/`pkg`) — macOS updates are applied by unpacking the zip over the existing `.app`, not by re-running the installer — so don't remove `zip` from `mac.target` in `package.json`.

`npm run electron:build` (no `GH_TOKEN`, no `--publish`) still works for local test builds — it just doesn't publish anywhere, matching how `notarize.js` already skips notarization without Apple credentials set.
