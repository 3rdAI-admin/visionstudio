require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Set HOSTED=true on a public deployment (e.g. the systemd unit's env file).
// Disables the local-only self-restart endpoint and the shared .env-key
// fallback — both are fine for a single-user localhost dev tool but unsafe
// once the server is reachable by anyone on the internet: /api/restart
// would let a stranger kill/respawn the process, and the fallback would let
// anyone burn the deployer's own Gemini quota with no key of their own.
const HOSTED = process.env.HOSTED === 'true';

// Hosted deployments sit behind nginx (see README's "Hosted / production
// backend" section) — without this, express-rate-limit and req.ip would see
// every request as coming from nginx's own IP (127.0.0.1), making the limiter
// either share one bucket across all real clients or (worse) let one bad
// actor's rate-limit response affect everyone. `1` trusts exactly one hop
// (the local nginx reverse proxy), matching nginx's own X-Forwarded-For.
if (HOSTED) {
  app.set('trust proxy', 1);
}

// Shared "this request came from a real copy of the app" secret (see
// src/backendUrl.ts's getAppSecretHeaders()). Not per-user auth — every
// install of a given build shares the same value — it filters out random
// internet scanners/scripts hitting a public hosted URL, since they won't
// know this value. Only enforced when both HOSTED=true and this env var is
// set, so a hosted deploy that hasn't configured a secret yet still works
// exactly as before (opt-in hardening, not a breaking requirement).
const APP_SECRET = process.env.APP_SECRET;

// Capacitor's iOS WebView serves the app from a fixed native scheme, not an
// http(s) origin — allow those alongside the configurable web origin so the
// same backend serves both the dev web app and the native iOS build.
const NATIVE_ORIGINS = ['capacitor://localhost', 'ionic://localhost'];
const webOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const FRONTEND_PORT = new URL(webOrigin).port || '3000';

// Local dev's Vite server binds --host=0.0.0.0 so another device on the LAN
// (e.g. a phone) can load it at http://<mac-lan-ip>:3002 — that request's
// Origin won't match the fixed localhost webOrigin above. Only relevant in
// dev (HOSTED=true locks this down to exactly webOrigin, as intended for a
// deployment reachable by strangers): matches a private RFC1918 IP on the
// same port the dev frontend runs on.
const LAN_ORIGIN_PATTERN = HOSTED
  ? null
  : new RegExp(`^https?://(10\\.|172\\.(1[6-9]|2\\d|3[01])\\.|192\\.168\\.)[\\d.]+:${FRONTEND_PORT}$`);

app.use(
  cors({
    // The Electron desktop app loads the UI via loadFile() (a file:// page),
    // which sends no Origin header (or "null") on same-process fetches — allow
    // that alongside the configured web origin and Capacitor's native schemes.
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === 'null' ||
        [webOrigin, ...NATIVE_ORIGINS].includes(origin) ||
        (LAN_ORIGIN_PATTERN && LAN_ORIGIN_PATTERN.test(origin))
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
  }),
);
// Images sent as base64 are large — bump default 100KB limit.
app.use(express.json({ limit: '25mb' }));

// Request log: time + method + path + status + duration + body size
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const len = res.getHeader('content-length') || 0;
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${ms}ms ${len}B`);
  });
  next();
});

// Reject requests without the shared app secret when one is configured on a
// hosted deployment — see APP_SECRET above. Runs before route handlers so an
// unrecognized caller never reaches Gemini-calling code.
if (HOSTED && APP_SECRET) {
  app.use((req, res, next) => {
    if (req.headers['x-app-secret'] !== APP_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}

// Generous per-IP limit on the expensive endpoint — enough for real
// interactive use (nobody submits dozens of edits a minute by hand), low
// enough to blunt a scanner or script hammering the server. Only /api/generate
// is limited; /api/key-status is cheap and unauthenticated-safe either way.
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

app.get('/api/key-status', (req, res) => {
  const key = process.env.GOOGLE_API_KEY;
  const configured = !!key && /^AIzaSy[A-Za-z0-9_-]{33}$/.test(key);
  res.json({ configured });
});

// Local-dev-only: lets the Settings UI change ports and respawn the local
// startup.sh-managed processes. Meaningless (and unsafe, unauthenticated
// process control) once hosted, so it's not registered when HOSTED=true.
if (!HOSTED) {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');

  const isValidPort = (n) => Number.isInteger(n) && n > 0 && n < 65536;

  app.post('/api/restart', (req, res) => {
    const { backendPort, frontendPort } = req.body || {};
    const root = path.join(__dirname, '..');

    if (backendPort !== undefined || frontendPort !== undefined) {
      if (backendPort !== undefined && !isValidPort(backendPort)) {
        return res.status(400).json({ error: 'backendPort must be an integer between 1 and 65535' });
      }
      if (frontendPort !== undefined && !isValidPort(frontendPort)) {
        return res.status(400).json({ error: 'frontendPort must be an integer between 1 and 65535' });
      }
      const lines = [];
      if (backendPort !== undefined) lines.push(`BACKEND_PORT=${backendPort}`);
      if (frontendPort !== undefined) lines.push(`FRONTEND_PORT=${frontendPort}`);
      fs.mkdirSync(path.join(root, '.run'), { recursive: true });
      fs.writeFileSync(path.join(root, '.run', 'ports.env'), lines.join('\n') + '\n');
    }

    res.json({ restarting: true });
    const startupScript = path.join(root, 'startup.sh');
    spawn(startupScript, ['restart'], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
    }).unref();
    setTimeout(() => process.exit(0), 250);
  });
}

app.post('/api/generate', generateLimiter, async (req, res) => {
  try {
    const { prompt, image } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt (non-empty string) is required' });
    }

    // Local dev: X-API-Key header or fall back to .env's shared key.
    // Hosted: no fallback — a public server must not let a keyless caller
    // spend the deployer's own Gemini quota, so every request needs its
    // own key.
    const apiKey = req.headers['x-api-key'] || (!HOSTED && process.env.GOOGLE_API_KEY);

    if (!apiKey) {
      return res.status(400).json({
        error: HOSTED
          ? 'Nano Banana API Key required. Add an X-API-Key header with your own Nano Banana API Key.'
          : 'Nano Banana API Key required. Add X-API-Key header or set GOOGLE_API_KEY in .env'
      });
    }

    // Validate API key format (39 chars starting with AIzaSy)
    if (!/^AIzaSy[A-Za-z0-9_-]{33}$/.test(apiKey)) {
      return res.status(400).json({
        error: 'Invalid Nano Banana API Key format. Expected 39 characters starting with AIzaSy'
      });
    }

    // Create GoogleGenerativeAI instance with the selected API key
    const genAI = new GoogleGenerativeAI(apiKey);

    // gemini-2.5-flash-image supports both text-only and image+text input,
    // and can return text or images in its response. responseModalities tells
    // it we want both kinds back so it picks the appropriate one.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: { responseModalities: ['Text', 'Image'] },
    });

    const parts = [{ text: prompt }];
    if (image && image.data && image.mimeType) {
      parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
    }

    const result = await model.generateContent(parts);
    const response = result.response;

    // Walk response parts — image generation returns inlineData; text fallback uses text.
    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      const responseParts = candidate.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          return res.json({
            image: {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
            },
          });
        }
      }
    }

    // No image in response — fall back to text so the client gets something useful
    let text;
    try { text = response.text(); } catch { text = null; }
    if (text) return res.json({ result: text });

    res.status(502).json({
      error: 'Model returned no image and no text. Try a more specific prompt.',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: friendlyError(error) });
  }
});

// Strip Google SDK boilerplate so the user sees "API key not valid"
// instead of the full "[GoogleGenerativeAI Error]: Error fetching from ... [{...JSON...}]"
function friendlyError(err) {
  const raw = err?.message || String(err || 'Unknown error');
  // Pattern: "[400 Bad Request] <human message> [{...JSON details...}]"
  const m = raw.match(/\[\d{3}[^\]]*\]\s*([^[]+?)(?:\s*\[\{|$)/);
  if (m) return m[1].trim();
  // Strip the SDK prefix if no status block matched
  return raw
    .replace(/^\[GoogleGenerativeAI Error\]:\s*/, '')
    .replace(/^Error fetching from [^:]+:\s*/, '');
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
