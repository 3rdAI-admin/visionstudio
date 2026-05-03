require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const app = express();

const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors({ origin: 'http://localhost:3000' }));
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
