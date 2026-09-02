require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
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

app.get('/api/key-status', (req, res) => {
  const key = process.env.GOOGLE_API_KEY;
  const configured = !!key && /^AIzaSy[A-Za-z0-9_-]{33}$/.test(key);
  res.json({ configured });
});

const isValidPort = (n) => Number.isInteger(n) && n > 0 && n < 65536;

// Restarts both processes via startup.sh. Optional backendPort/frontendPort
// in the body are written to .run/ports.env first so startup.sh picks them
// up; ports are validated here since they end up sourced by a shell script.
// Responds before exiting so the frontend's fetch doesn't just hang against
// a dying connection.
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

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, image } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt (non-empty string) is required' });
    }

    // Accept API key from X-API-Key header or fall back to .env
    const apiKey = req.headers['x-api-key'] || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'API key required. Add X-API-Key header or set GOOGLE_API_KEY in .env'
      });
    }

    // Validate API key format (39 chars starting with AIzaSy)
    if (!/^AIzaSy[A-Za-z0-9_-]{33}$/.test(apiKey)) {
      return res.status(400).json({
        error: 'Invalid API key format. Expected 39 characters starting with AIzaSy'
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
