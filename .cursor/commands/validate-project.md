---
description: Comprehensive validation for VisionStudio codebase
---

# Validate VisionStudio Project

> **Complete validation workflow** for React + TypeScript frontend with Express backend

This validation ensures code quality, type safety, and complete user workflow testing for the VisionStudio AI-powered image editing application.

**Execute ONLY the validation in this file.** Do not run another project's validation. Use **`/validate-project`** (not `/validate`) to avoid conflicts with team/global commands.

## Phase 1: Linting

**Frontend TypeScript Linting:**
`npm run lint`

**Expected output:** No type errors or compilation issues

## Phase 2: Type Checking

**TypeScript Type Checking:**
`npm run lint`

Note: The project uses TypeScript with `--noEmit` flag for type checking via the lint script.

## Phase 3: Style Checking

**Prettier Code Formatting:**
`npm run format:check`

**Expected output:** "All matched files use Prettier code style!"

**To auto-fix formatting issues:**
`npm run format`

## Phase 4: Unit Testing

**Run Vitest Tests:**
`npm run test:run`

**Expected output:** All tests should pass

**Test Coverage:**
- App component rendering
- Utility functions (formatBytes, formatDuration, extractFriendlyError)
- Upload validation
- Error handling

## Phase 5: End-to-End Testing

### Setup: Start Services

**Terminal 1 - Start Frontend:**
`npm run dev`

**Terminal 2 - Start Backend:**
`cd backend && node index.js`

**Wait for services:**
`timeout 30 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'`
`timeout 30 bash -c 'until curl -f http://localhost:3001; do sleep 2; done'`

### E2E Level 1: Internal API Testing

**Backend health check:**
`curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "{\\"prompt\\":\\"test\\"}" -w "\\nHTTP Status: %{http_code}\\n"`

Expected: 400 status (missing image is expected validation error)

**Test error handling - missing prompt:**
`curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "{}" -w "\\nHTTP Status: %{http_code}\\n"`

Expected: 400 status with error message about missing prompt

**Test error handling - invalid prompt type:**
`curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "{\\"prompt\\":123}" -w "\\nHTTP Status: %{http_code}\\n"`

Expected: 400 status with error message about prompt type

### E2E Level 2: External Integration Testing

**Nano Banana API Integration (requires valid GOOGLE_API_KEY in backend/.env):**

First, create a small test image as base64:
`echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" > /tmp/test_image_b64.txt`

**Test text-only generation (no image):**
`curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "{\\"prompt\\":\\"Generate a small red square\\"}" -s | grep -E "(image|result|error)"`

Expected: Returns either an image object or text result (depending on model behavior)

**Test image + text generation:**
`curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "{\\"prompt\\":\\"Make this image blue\\",\\"image\\":{\\"data\\":\\"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\\",\\"mimeType\\":\\"image/png\\"}}" -s | grep -E "(image|result|error)"`

Expected: Returns modified image or text response

**Verify CORS is configured:**
`curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:3001/api/generate -v 2>&1 | grep -i "access-control"`

Expected: Should see Access-Control-Allow-Origin header

### E2E Level 3: Complete User Workflows

Based on the application's actual user journey from the UI:

**Workflow 1: Upload Image → Generate Edit → Download Result**

Manual testing required (browser-based):
1. Open http://localhost:3000
2. Click "Import Media" or drag/drop an image file
3. Verify image preview appears with "STATE: RAW INPUT"
4. Enter prompt: "Make this image look futuristic with neon accents"
5. Click "Process Synthesis"
6. Wait for "STATE: SYNTHESIZED" status
7. Click "Export Image" button
8. Verify downloaded file opens correctly

**Workflow 2: Preset Macro Usage**

Manual testing required (browser-based):
1. Open http://localhost:3000
2. Upload an image
3. Click preset button "Vintage Film"
4. Verify prompt field auto-populates with: "Make it look like a vintage film photograph with grain and warm tones"
5. Click "Process Synthesis"
6. Verify result matches prompt intent

**Workflow 3: Format Conversion**

Manual testing required (browser-based):
1. Open http://localhost:3000
2. Upload a JPEG image
3. Click "To PNG" under Format Migration
4. Process the conversion
5. Download and verify file format changed to PNG

**Workflow 4: Error Handling**

Manual testing required (browser-based):
1. Open http://localhost:3000
2. Upload an image
3. Leave prompt empty and click "Process Synthesis"
4. Verify button is disabled (validation works)
5. Enter a prompt
6. Stop backend server (simulate backend failure)
7. Click "Process Synthesis"
8. Verify error message appears in red box

**Workflow 5: Reset and Re-upload**

Manual testing required (browser-based):
1. Open http://localhost:3000
2. Upload image and process edit
3. Click "Reset Workspace" in header
4. Verify all state clears (back to upload screen)
5. Upload new image
6. Verify new image loads correctly

### Cleanup

**Stop services:**
`pkill -f "vite.*--port=3000"`
`pkill -f "node.*backend/index.js"`

Or manually Ctrl+C in both terminal windows

## Summary

**Validation Complete!**

Status breakdown:
- ✅ Phase 1 (Linting): TypeScript type checking via npm lint
- ✅ Phase 2 (Type Checking): Covered by Phase 1
- ✅ Phase 3 (Style): Prettier formatting configured and passing
- ✅ Phase 4 (Unit Tests): Vitest with 13 passing tests
- ✅ Phase 5 (E2E): Manual testing of complete user workflows

**Optional Recommendations:**
1. Add ESLint for additional code quality rules
2. Consider adding Playwright or Cypress for automated E2E tests
3. Add test coverage reporting with `npm run test:coverage`
4. Add environment variable validation on startup

## Journal Entry

After completing validation, record results in the project journal:

**Create journal directory if needed:**
`mkdir -p journal`

**Append validation result to today's journal:**
`echo "$(date +%H:%M) | Pass/Fail | P1:OK P2:OK P3:SKIP P4:SKIP P5:MANUAL | VisionStudio validation" >> journal/$(date +%Y-%m-%d).md`

**Update journal README:**
`echo "$(date +%Y-%m-%d) | Pass/Fail | P1:OK P2:OK P3:SKIP P4:SKIP P5:MANUAL | VisionStudio validation" >> journal/README.md`

Replace "Pass/Fail" with actual outcome (Pass if all configured phases succeeded, Fail if any errors occurred)
