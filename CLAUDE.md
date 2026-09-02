# visionstudio — agent context

Browser-based image editor + converter. **React 18 + TypeScript + Vite** frontend, **Node + Express** backend that proxies Google's `gemini-2.5-flash-image` (Nano Banana). See `README.md` for setup/run/API.

## Stack — what this project actually is

- **NOT** Python. Do not suggest `pip`, `pytest`, `pydantic`, `FastAPI`, `SQLAlchemy`, or virtual envs.
- **NOT** an agent framework / LLM application — it is a single-purpose image editor that calls one Gemini endpoint + client-side background removal.
- Frontend: React 18 + TypeScript, Vite 6, Tailwind utility classes (inlined; no `tailwind.config`), `motion/react` for animations, `lucide-react` for icons, `@imgly/background-removal` for client-side background removal.
- Backend: plain Express in one file (`backend/index.js`), `@google/generative-ai@0.24.1`. Two endpoints: the implicit `OPTIONS /` (CORS preflight) and `POST /api/generate`.
- Two `package.json`s: project root (frontend) and `backend/` (backend). They are independent — `npm install` in one does not affect the other.

## Conventions

- **Single source of truth for the API key**: `backend/.env` → `GOOGLE_API_KEY`. Never reference it in `src/`. Frontend has no `.env` and should not gain one — that would re-introduce the bug where the key shipped to the browser.
- **All Gemini calls go through the backend**, never directly from the React app. The browser must not import `@google/generative-ai`.
- **Background removal runs client-side**: The `@imgly/background-removal` library runs entirely in the browser using WebAssembly. First use downloads a ~5MB model that's cached. No backend or API key needed.
- **Image data is base64**, no `data:` prefix, paired with `mimeType`. Both directions (request + response) follow this shape — see `README.md` § API contract.
- **Logos & favicon** are imported from `../assets/` (project root), not `./assets/images/`. The root files are smaller (1.4 MB + 279 KB) than the `src/assets/images/` versions (3.6 MB + 3.1 MB) which were causing slow/broken first paint. Favicon is `Digital_Eye_icon.png` (6KB).
- **Backend logs every request** via the inline middleware in `index.js` (`console.log` of timestamp + method + path + status + duration + bytes). Don't replace with morgan/winston unless there's a specific reason.
- **Image input is auto-resized** in `App.tsx` `resizeImageIfNeeded()` before being sent to the backend: max `MAX_DIM` (2048 px on the long edge) and max `MAX_BYTES` (4 MB). PNGs stay PNG; everything else recompresses to JPEG @ 0.92. Don't lift these limits without checking Gemini's current inline-data cap (~7 MB at time of writing).
- **Error messages** flow through `extractFriendlyError()` (frontend) and `friendlyError()` (backend) so users never see `"[GoogleGenerativeAI Error]: Error fetching from https://... [400 Bad Request] ..."`. Both functions strip the SDK envelope to surface just the human sentence. If you add a new error path, run it through these helpers.

## Things that have broken before — don't repeat

| Bug                                                                                                                                                                           | Root cause                                                                                                   | Fix that stuck                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend showed `Failed to fetch`                                                                                                                                             | Backend wasn't running because `gemini-pro` was retired and the catch returned a generic message that hid it | Use `gemini-2.5-flash-image`; surface `error.message` in 5xx responses                                                                                  |
| `API_KEY_INVALID` for "correct" key                                                                                                                                           | `.env` literally said `GOOGLE_API_KEY=your-secure-key-here`                                                  | Diagnostic: `node -e "require('dotenv').config(); console.log(process.env.GOOGLE_API_KEY.length)"` — real keys are 39 chars                             |
| Logos appeared broken                                                                                                                                                         | 3.6 MB + 3.1 MB PNGs from `src/assets/images/` were slow to load                                             | Switched imports to project-root `assets/` (1.4 MB + 279 KB)                                                                                            |
| CORS errors from browser                                                                                                                                                      | Backend missing `cors` middleware                                                                            | `app.use(cors({ origin: 'http://localhost:3000' }))`                                                                                                    |
| Code mismatched between `App.tsx` and `App.tsx.backup`                                                                                                                        | A previous AI session simplified `App.tsx` to a text-only stub while keeping the real version as `.backup`   | Treat `App.tsx.backup` as canonical until/unless explicitly merged. Don't simplify the real app.                                                        |
| "Transparency" macro created checkerboard pixels                                                                                                                              | Gemini image generation models draw checkerboard patterns instead of creating true alpha channels            | Removed macro, added dedicated "Remove Background" button using `@imgly/background-removal` library (client-side, produces true transparent PNGs)       |
| Drag and drop didn't work                                                                                                                                                     | Event handlers weren't implemented, only UI existed                                                          | Added `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers with visual feedback                                                                |
| Phone photos (5–12 MB) failed with confusing Google errors                                                                                                                    | Gemini's inline-data cap is ~7 MB; the SDK didn't surface that clearly                                       | Client-side `resizeImageIfNeeded()` downscales to 2048 px / 4 MB before upload                                                                          |
| Latency display lied (`"4.2s (avg)"` was hardcoded)                                                                                                                           | A placeholder shipped to prod                                                                                | `useEffect`-backed `elapsedMs` ticker shows real time during `isProcessing` / `isRemovingBackground`                                                    |
| Wall-of-text Google errors (`"[GoogleGenerativeAI Error]: Error fetching from https://... [400 Bad Request] API key not valid. Please pass a valid API key. [{...JSON...}]"`) | Raw SDK error message bubbled all the way to the UI                                                          | `friendlyError()` (backend) + `extractFriendlyError()` (frontend) strip the envelope; UI shows just `"API key not valid. Please pass a valid API key."` |

## Working with the backend

- Restart picks up `.env` and code changes. There's no nodemon — kill and re-run `node index.js` after edits.
- The model `gemini-2.5-flash-image` returns `candidates[].content.parts[].inlineData` for image output. The handler in `index.js` walks the parts looking for `inlineData`; if none, it falls back to `response.text()`. Don't change this without testing both paths.
- `responseModalities: ['Text', 'Image']` in `generationConfig` is required — without it the model may refuse to return images.

## When the user says "the app"

They mean the visionstudio React app, not Code Companion (the IDE/agent tool the user often uses to edit this project).

## What NOT to add

- Auth, sessions, multi-user — out of scope; this is a local single-user tool.
- A database — there's no persistence, by design.
- A test framework — none currently configured. If adding, use `node:test` (already on Node 18+); do not introduce Jest/Vitest without asking.
- TypeScript on the backend — backend is intentionally plain `.js` to keep it one file with no build step.
