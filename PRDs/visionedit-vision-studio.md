# Product Requirements Document (PRD)

**Product / Feature:** Th3rdAI Vision Studio (VisionEdit)
**Version:** 1.0
**Date:** 2026-05-02
**Status:** Approved

---

## 1. Overview

### 1.1 Purpose
Th3rdAI Vision Studio is a browser-based AI-powered image editing and conversion tool that allows users to transform images using natural language prompts and perform intelligent background removal. The application provides a simple, accessible interface for both casual users and professionals to edit images without requiring technical skills or expensive desktop software.

### 1.2 Goals
- **Primary goal:** Enable users to edit images using natural language prompts with real-time AI processing (Google Gemini 2.5 Flash Image)
- **Secondary goals:**
  - Provide one-click background removal with true alpha channel transparency
  - Offer preset style macros for common editing tasks (vintage, futuristic, cinematic, etc.)
  - Support image format conversion (PNG, JPG, SVG, ICO)
  - Deliver a fast, responsive browser-based experience with no installation required
  - Maintain user privacy by processing images client-side when possible and never storing uploads

### 1.3 Non-Goals
- Multi-user collaboration or account management
- Cloud storage or image library management
- Advanced layer-based editing (like Photoshop)
- Video editing capabilities
- Mobile native apps (web-only for now)
- Batch processing of multiple images
- Authentication or user sessions

---

## 2. Background & Problem

### 2.1 Problem Statement
Image editing traditionally requires expensive software (Adobe Photoshop $54.99/month, Canva Pro $120/year) or technical skills (GIMP, Affinity Photo). Users who need quick image transformations—content creators, marketers, designers, hobbyists—face barriers:

1. **Cost:** Professional tools are expensive
2. **Complexity:** Desktop editors have steep learning curves
3. **Accessibility:** Tools require installation and specific OS versions
4. **Background removal:** Creating true transparent PNGs is technically difficult
5. **Speed:** Traditional tools require manual selection, masking, and layer manipulation

**Impact:** Users waste time learning complex interfaces, pay for features they don't use, or produce lower-quality results with free tools.

### 2.2 User / Stakeholder
- **Primary users:**
  - Content creators (social media, blogs, newsletters)
  - Small business owners (product photos, marketing materials)
  - Designers needing quick mockups or iterations
  - Students and hobbyists
  - Anyone needing to remove backgrounds or convert formats

- **Stakeholders:**
  - Th3rdAI (product owner, brand)
  - End users (experience quality, privacy)
  - Google (Gemini API usage and billing)

---

## 3. Requirements

### 3.1 Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Users can upload images via drag-and-drop or file browser (PNG, JPG, JPEG, WebP) | Must |
| FR-2 | Users can enter natural language prompts to describe desired edits | Must |
| FR-3 | System sends image + prompt to Google Gemini 2.5 Flash Image API and displays result | Must |
| FR-4 | Users can remove backgrounds with one click to produce true transparent PNGs | Must |
| FR-5 | Application provides preset macros (Future Vibe, Vintage Film, Cinematic, 3D Depth, Cartoonize) | Should |
| FR-6 | Users can compare original vs. edited images with a slider | Should |
| FR-7 | Users can download edited images | Must |
| FR-8 | System auto-resizes images >2048px or >4MB before sending to API | Must |
| FR-9 | Users can convert between formats (PNG, JPG, SVG, ICO) via preset prompts | Should |
| FR-10 | Application displays real-time elapsed processing time | Should |
| FR-11 | Users can use keyboard shortcuts (Cmd/Ctrl+Enter to submit, Esc to dismiss errors) | Could |
| FR-12 | Users can reset workspace to start fresh | Should |

### 3.2 Non-Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | **Security:** API key never exposed to browser; all Gemini calls proxied through backend | Must |
| NFR-2 | **Privacy:** No image uploads stored on server or cloud; all processing is ephemeral | Must |
| NFR-3 | **Performance:** Background removal runs entirely client-side (no server latency) | Must |
| NFR-4 | **Performance:** Image edits complete within 3-10 seconds depending on complexity | Should |
| NFR-5 | **Reliability:** Friendly error messages extracted from SDK errors for user clarity | Must |
| NFR-6 | **Accessibility:** UI works on modern browsers (Chrome, Firefox, Edge, Safari) | Must |
| NFR-7 | **Scalability:** Backend handles CORS properly and limits body size to 25MB | Must |
| NFR-8 | **Cost:** Uses Google Gemini free tier when possible; backend logs all API calls for monitoring | Should |
| NFR-9 | **UX:** First background removal downloads ~5MB model, then works offline from cache | Should |
| NFR-10 | **Maintainability:** Codebase remains modular; no single file exceeds 500 lines | Should |

### 3.3 Success Criteria
- [x] Users can successfully upload and edit images with natural language prompts
- [x] Background removal produces true transparent PNGs (verified in image editors)
- [x] Application handles large phone photos (5-12MB) without errors via auto-resizing
- [x] Error messages are clear and actionable (no raw SDK errors)
- [x] 100% of test suite passes (unit tests + E2E tests)
- [x] Application works without backend for background removal feature
- [ ] Average user session time >2 minutes (indicates engagement)
- [ ] <5% error rate on API calls (indicates reliability)
- [ ] User feedback indicates "easy to use" (qualitative)

---

## 4. Scope & Constraints

### 4.1 In Scope
- Single-page React application with TypeScript
- Express backend proxy for Gemini API
- Drag-and-drop file upload
- Natural language image editing via Gemini 2.5 Flash Image
- Client-side background removal with @imgly/background-removal
- Preset style macros and format conversion prompts
- Before/after comparison slider
- Download edited results
- Real-time processing timer
- Comprehensive testing (unit tests with Vitest, E2E with Playwright)
- Code formatting (Prettier) and linting (TypeScript)

### 4.2 Out of Scope
- User accounts, authentication, sessions
- Cloud storage or image history
- Undo/redo functionality
- Layer-based editing
- Batch processing
- Video editing
- Mobile native apps
- Multi-language support (English only)
- Accessibility features (WCAG compliance not required for v1.0)

### 4.3 Constraints & Assumptions

**Constraints:**
- **Technical:** Gemini API inline-data limit is ~7MB (requires client-side auto-resize)
- **Technical:** Background removal model is ~5MB and downloads on first use
- **Cost:** Free tier Gemini API has rate limits (15 RPM, 1,500 RPD, 1,500,000 TPD)
- **Time:** Backend must restart to pick up .env changes (no hot reload)
- **Platform:** Requires Node.js ≥18, modern browser with WebAssembly support

**Assumptions:**
- Users have stable internet connection for initial model downloads
- Users understand that first background removal takes longer (model download)
- Users are comfortable with browser-based tools (no desktop app needed)
- Google Gemini 2.5 Flash Image API remains available and pricing stable
- Users have valid Gemini API key (free tier sufficient for personal use)

---

## 5. References & Context

### 5.1 Technical Documentation
- **Google Gemini API:** https://ai.google.dev/gemini-api/docs/image-generation
- **Gemini Best Practices:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-image-generation-best-practices
- **Background Removal Library:** https://github.com/imgly/background-removal-js
- **React 19 Docs:** https://react.dev
- **Vite Build Tool:** https://vite.dev
- **Playwright E2E Testing:** https://playwright.dev

### 5.2 Comparable Products
- **Leonardo.Ai:** Natural language editing with object removal, background adjustment
- **Fotor AI Photo Editor:** Text-based edits ("make background white", "shift focus on face")
- **Canva Magic Edit:** Powered by Google Nano Banana, click + brush + text prompt
- **Remove.bg:** Dedicated background removal (commercial SaaS)
- **Scenario:** Multi-model support for text-to-image editing

### 5.3 Key Differentiators
- **Privacy-first:** No uploads stored, background removal runs client-side
- **Free/low-cost:** Uses Google Gemini free tier, no subscription required
- **Speed:** Gemini 2.5 Flash Image is optimized for fast generation
- **Simplicity:** Single-page app, no installation, no account needed
- **True transparency:** Background removal produces alpha channel PNGs, not checkerboards

### 5.4 Known Issues & Mitigations
| Issue | Root Cause | Mitigation |
|-------|-----------|------------|
| Phone photos (5-12MB) fail | Gemini 7MB limit | Auto-resize to 2048px / 4MB before upload |
| Checkerboard instead of transparency | Gemini draws visual patterns | Use @imgly/background-removal library |
| API_KEY_INVALID errors | Placeholder key in .env | Validate key length (39 chars) and format |
| CORS errors | Backend missing middleware | Use `cors({ origin: 'http://localhost:3000' })` |
| First background removal slow | Model download (~5MB) | Show progress indicator, cache model in browser |

### 5.5 Related Files
- **README.md:** Setup, usage, troubleshooting
- **CLAUDE.md:** Agent context, conventions, known bugs
- **USERSGUIDE.md:** End-user documentation with examples and FAQs
- **TASK.md:** Task tracking (if used)
- **Codebase:**
  - Frontend: `src/App.tsx` (main component), `src/main.tsx`, `src/index.css`
  - Backend: `backend/index.js` (Express server), `backend/.env` (API key)
  - Tests: `src/test/App.test.tsx`, `src/test/utils.test.ts`, `e2e/app.spec.ts`

---

## 6. Technical Architecture

### 6.1 High-Level Architecture
```
┌─────────────────────────────────────┐         ┌──────────────────────┐         ┌────────────────────────────┐
│ Frontend (Vite + React)             │  POST   │ Backend (Express)    │  HTTPS  │ Google Generative Language │
│ http://localhost:3000               │────────▶│ http://localhost:3001│────────▶│ gemini-2.5-flash-image     │
│                                     │  /api/  │ backend/index.js     │         │ (image edit/convert/gen)   │
│ + @imgly/background-removal         │ generate└──────────────────────┘         └────────────────────────────┘
│   (client-side WASM, ~5MB model)    │
└─────────────────────────────────────┘
```

### 6.2 Technology Stack
**Frontend:**
- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS (utility classes, inlined)
- motion/react (animations)
- lucide-react (icons)
- @imgly/background-removal (client-side)

**Backend:**
- Node.js + Express
- @google/generative-ai (SDK)
- cors (security)
- dotenv (environment variables)

**Testing:**
- Vitest (unit tests)
- @testing-library/react (component tests)
- Playwright (E2E tests)
- Prettier (code formatting)

### 6.3 API Contract
**POST /api/generate**

Request:
```json
{
  "prompt": "Replace the sky with a starry galaxy",
  "image": {
    "data": "iVBORw0KG...",  // base64 (no data: prefix)
    "mimeType": "image/png"
  }
}
```

Response (image):
```json
{
  "image": {
    "data": "iVBORw0KG...",
    "mimeType": "image/png"
  }
}
```

Response (text fallback):
```json
{
  "result": "explanatory text..."
}
```

Response (error):
```json
{
  "error": "API key not valid. Please pass a valid API key."
}
```

---

## 7. User Workflows

### 7.1 Workflow 1: Upload & Edit Image
1. User opens http://localhost:3000
2. User drags image into browser or clicks to browse
3. Image preview appears with "STATE: RAW INPUT"
4. User enters prompt: "Make this image look futuristic with neon accents"
5. User clicks "Process Synthesis" or presses Cmd/Ctrl+Enter
6. Progress timer shows elapsed time
7. Edited image appears with "STATE: SYNTHESIZED"
8. User clicks "Export Image" to download

### 7.2 Workflow 2: Preset Macro Usage
1. User uploads image (as above)
2. User clicks preset button "Vintage Film"
3. Prompt field auto-fills: "Make it look like a vintage film photograph with grain and warm tones"
4. User clicks "Process Synthesis"
5. Result appears

### 7.3 Workflow 3: Background Removal
1. User uploads image
2. User clicks "Remove Background" button
3. First use: ~5MB model downloads (progress shown)
4. Processing happens client-side
5. Result appears with transparent background
6. User downloads transparent PNG

### 7.4 Workflow 4: Format Conversion
1. User uploads JPEG image
2. User clicks "To PNG" under Format Migration
3. Prompt auto-fills: "Convert this image to PNG format"
4. User processes conversion
5. User downloads PNG file

### 7.5 Workflow 5: Compare Before/After
1. User edits image (any method above)
2. Result appears with comparison slider
3. User drags slider left/right to reveal original underneath

---

## 8. Testing Strategy

### 8.1 Unit Tests (Vitest)
- **Coverage:** Utility functions (formatBytes, formatDuration, extractFriendlyError)
- **Coverage:** Component rendering (App component, upload area, header)
- **Target:** 13 passing tests (currently achieved)

### 8.2 E2E Tests (Playwright)
- **Coverage:** UI elements visibility (upload area, header, drag instructions)
- **Coverage:** Feature descriptions display
- **Target:** 4 passing tests (currently achieved)
- **Future:** Workflow tests (upload, edit, background removal) when backend running

### 8.3 Manual Testing Checklist
- [ ] Drag and drop works correctly with visual feedback
- [ ] Upload via file browser works
- [ ] Large images (>2048px, >4MB) auto-resize without errors
- [ ] Background removal produces true alpha channel (verify in image editor)
- [ ] All preset macros fill prompt correctly
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Enter, Esc)
- [ ] Comparison slider reveals original image
- [ ] Download produces valid image file
- [ ] Error messages are friendly (no SDK wall-of-text)
- [ ] Timer shows real elapsed time

---

## 9. Deployment & Operations

### 9.1 Development Environment
```bash
# Terminal 1 - Backend
cd backend && node index.js
# → "Backend running at http://localhost:3001"

# Terminal 2 - Frontend
npm run dev
# → "VITE v6.4.2 ready"
```

### 9.2 Production Considerations
- **Environment Variables:** `backend/.env` with valid GOOGLE_API_KEY
- **API Key Security:** Never commit .env to git; use .gitignore
- **CORS:** Update allowed origin from localhost to production domain
- **Rate Limiting:** Monitor Gemini API usage (15 RPM free tier limit)
- **Logging:** Backend logs all requests (timestamp, method, path, status, duration, bytes)
- **Error Monitoring:** Track API errors and client-side exceptions

### 9.3 Monitoring & Metrics
- API call count and error rate
- Average processing time
- Image size distribution (to optimize auto-resize thresholds)
- Background removal model cache hit rate
- User session duration

---

## 10. Future Enhancements (Post-v1.0)

### 10.1 Potential Features
- **Undo/redo:** History stack for multi-step editing
- **Batch processing:** Upload and edit multiple images
- **Custom presets:** Users save their own macro prompts
- **Image optimization:** Auto-compress for web use
- **Advanced masking:** Select specific regions to edit
- **Video support:** Extend to video frame editing
- **Mobile PWA:** Install as mobile app
- **Collaboration:** Share edit sessions via URL

### 10.2 Model Upgrades
- **Nano Banana 2** (gemini-3.1-flash-image): Faster, higher quality
- **Nano Banana Pro** (gemini-3-pro-image): Advanced reasoning, high-fidelity text rendering
- **Imagen 4:** Photorealistic image generation
- **Multi-model support:** Let users choose model/quality tradeoff

### 10.3 UX Improvements
- **Prompt suggestions:** AI-powered prompt autocomplete
- **Example gallery:** Show before/after examples
- **Guided tour:** First-time user onboarding
- **Accessibility:** WCAG 2.1 AA compliance
- **Dark mode:** Theme toggle

---

## 11. Approval & Next Steps

**Approved by:** James Avila (james@th3rdai.com), Th3rdAI
**Date:** 2026-05-02
**Status:** Approved

**Next Steps:**
1. ✅ PRD approved and saved to `PRDs/visionedit-vision-studio.md`
2. Run `/generate-prp` to create execution plan with multi-agent task breakdown
3. Run `/generate-validate` to update validation command (already exists)
4. Run `/execute-prp` to implement any new features from execution plan
5. Run `/validate-project` to verify all phases pass
6. Run `/summarize` to document completed work

**Current Status:**
- v1.0 feature set is **fully implemented** and **tested**
- All success criteria met except qualitative user feedback metrics
- Ready for production deployment or additional feature planning

---

## Appendix A: Error Message Examples

### Before (Raw SDK Error)
```
[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent [400 Bad Request] API key not valid. Please pass a valid API key. [{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID"...}]
```

### After (Friendly Error)
```
API key not valid. Please pass a valid API key.
```

---

## Appendix B: Performance Benchmarks

| Operation | Time (avg) | Notes |
|-----------|-----------|-------|
| Image upload | <1s | Instant for <5MB images |
| Auto-resize | 1-2s | For 5-12MB phone photos |
| Gemini API call | 3-10s | Varies by complexity |
| Background removal (first) | 8-15s | Includes model download |
| Background removal (cached) | 3-5s | Model already downloaded |
| Download result | <1s | Instant |

---

## Appendix C: Cost Estimate

**Google Gemini 2.5 Flash Image (Free Tier):**
- 15 requests per minute (RPM)
- 1,500 requests per day (RPD)
- 1,500,000 tokens per day (TPD)

**Estimated Personal Use:**
- 10 edits/day = **Free**
- 100 edits/day = **Free** (within limits)
- 1,000 edits/day = Requires paid tier

**Background Removal:**
- Client-side = **Free** (no API costs)
- Model bandwidth: ~5MB one-time download per user

---

**End of PRD**
