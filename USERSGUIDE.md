# Th3rdAI Vision Studio - User Guide

Welcome to **Th3rdAI Vision Studio** — your AI-powered image editing and transformation tool. This guide will help you get started and make the most of all available features.

This guide covers the **web app**, run locally as described below. VisionStudio also ships as a native **iOS app** (install the `.ipa` you were given, or ask whoever built it for one) and a native **macOS app** (a `.dmg`/`.pkg`, no local server setup needed — the app runs its own backend). The features, prompts, and UI described here are the same across all three; only the setup steps differ.

---

## 🚀 Quick Start (Web App)

### First-Time Setup

1. **Start the Backend Server**
   - Open a terminal/command prompt
   - Navigate to the `backend` folder
   - Run: `node index.js`
   - You should see: "Backend running at http://localhost:3001"

2. **Start the Frontend**
   - Open a second terminal/command prompt
   - Navigate to the project root folder
   - Run: `npm run dev`
   - You should see: "VITE v6.4.2 ready"

3. **Open the App**
   - Open your web browser
   - Go to: `http://localhost:3002`
   - You're ready to start editing!

---

## 🔑 Managing Your API Key

VisionStudio can use either a shared backend API key or your personal Nano Banana API Key.

### To add your own key:

1. Get a free Nano Banana API Key from https://aistudio.google.com/apikey
2. Click the Settings icon (⚙️) in the top-right corner
3. Paste your key (it should start with "AIzaSy" and be 39 characters)
4. Click "Test Nano Banana API Key" to verify it works
5. Click "Save"

### Security considerations:

- Your key is stored locally in your browser
- It's sent with each image edit request
- Never share screenshots of your settings page
- Use incognito mode or remove your key on shared computers

### To remove your key:

1. Click Settings (⚙️)
2. Click "Remove Nano Banana API Key"
3. Your key is deleted from browser storage

---

## 📸 Uploading Images

There are two ways to upload images:

### Method 1: Drag and Drop

1. Find an image file on your computer
2. Drag it into the upload area (the dark box with "Import Media")
3. The upload area will brighten when you drag over it
4. Release to upload

### Method 2: Click to Browse

1. Click anywhere on the "Import Media" box
2. A file browser will open
3. Select your image file
4. Click "Open"

**Supported formats:** JPG, PNG, GIF, WebP, SVG, BMP, TIFF

---

## ✨ Features & How to Use Them

### 1. Natural Language Editing

Transform your images by describing what you want in plain English.

**How to use:**

1. Upload an image
2. Type your prompt in the text box (e.g., "Add futuristic neon lights")
3. Click "Process Synthesis"
4. Wait 5-10 seconds for the AI to process
5. Your edited image appears on the right
6. Click "Export Image" to download

**Example prompts:**

- "Make this look like a vintage photograph from the 1970s"
- "Add dramatic sunset lighting"
- "Turn this into a watercolor painting"
- "Make the colors more vibrant and saturated"
- "Add a professional studio background blur"

### 2. Preset Macros (One-Click Styles)

Quick transformations with a single click.

**Available presets:**

- **Future Vibe** - Adds futuristic, high-tech aesthetics with neon accents
- **Vintage Film** - Creates an old film photograph look with grain and warm tones
- **Cinematic** - Applies dramatic lighting and high contrast like a movie scene
- **Replace Sky** - Swaps the sky with a dramatic starry galaxy or sunset
- **3D Depth** - Converts to a 3D effect with realistic shading and volume
- **Cartoonize** - Transforms into a clean 2D cartoon illustration style

**How to use:**

1. Upload an image
2. Scroll down to "Preset Macros"
3. Click any preset button
4. The prompt field will auto-fill
5. Click "Process Synthesis"
6. Download your result

### 3. Background Removal (Transparency)

Remove backgrounds to create transparent PNGs — perfect for logos, product photos, and graphics.

**How to use:**

1. Upload an image
2. Click the "Remove Background" button
3. Wait 5-15 seconds (first time may take longer as the AI model downloads)
4. Your image now has a transparent background
5. Click "Export Image" to save as PNG

**Note:** The first time you use this feature, a ~5MB AI model will download to your browser. After that, it works offline and is much faster!

**Best results with:**

- Clear subject in the foreground
- Good contrast between subject and background
- Well-lit images
- Single main subject

### 4. Format Conversion

Convert between image formats easily.

**Available conversions:**

- To PNG
- To JPG
- To SVG (vector format)
- To ICO (icon format)

**How to use:**

1. Upload an image
2. Click a format button under "Format Migration"
3. The prompt field will auto-fill with conversion instructions
4. Click "Process Synthesis"
5. Download the converted file

---

## 💡 Common Use Cases

### Use Case 1: Creating a Logo with Transparent Background

**Goal:** Turn a logo with a background into a clean PNG cutout

**Steps:**

1. Upload your logo file
2. Click "Remove Background"
3. Wait for processing
4. Export the transparent PNG
5. Use in presentations, websites, or documents

**Tip:** For best results, start with a logo that has good contrast with its background.

---

### Use Case 2: Enhancing Product Photos

**Goal:** Make product photos look professional

**Try these prompts:**

- "Add professional studio lighting"
- "Make the background pure white"
- "Add subtle shadow underneath the product"
- "Increase sharpness and clarity"

---

### Use Case 3: Creating Social Media Graphics

**Goal:** Transform a regular photo into an eye-catching post

**Try these presets/prompts:**

1. Upload your photo
2. Use "Future Vibe" for tech content
3. Use "Cinematic" for dramatic effect
4. Use "Vintage Film" for nostalgic content
5. Or try: "Add bold text overlay area at the top"

---

### Use Case 4: Photo Restoration

**Goal:** Improve old or low-quality photos

**Try these prompts:**

- "Restore this old photograph, enhance clarity and remove noise"
- "Fix the colors and make them more vibrant"
- "Remove scratches and improve sharpness"

---

### Use Case 5: Converting Formats

**Goal:** Get the right file type for your needs

**When to use each format:**

- **PNG:** Logos, graphics with transparency, screenshots
- **JPG:** Photos, images for web (smaller file size)
- **SVG:** Scalable graphics, icons (keeps quality at any size)
- **ICO:** Website favicons, app icons

---

## 🎯 Tips & Tricks

### Writing Better Prompts

1. **Be specific** - Instead of "make it better," try "increase brightness and saturation"
2. **Use descriptive words** - "dramatic," "subtle," "professional," "vintage"
3. **Mention style references** - "like a movie poster," "studio photography style"
4. **Combine multiple effects** - "Add neon glow and increase contrast"

### Getting the Best Results

1. **Start with high-quality images** - Higher resolution inputs = better outputs
2. **Try multiple prompts** - Experiment with different wording
3. **Use the reset button** - Start over if you don't like the result
4. **Combine techniques** - Use background removal first, then apply effects

### Undo/Redo Your Edits

Made a mistake or want to compare different edits? Use undo and redo:

- **Undo:** Press ⌘Z (Mac) or Ctrl+Z (Windows), or click the "Undo" button
- **Redo:** Press ⌘⇧Z (Mac) or Ctrl+Shift+Z (Windows), or click the "Redo" button
- **History:** The app remembers your last 50 edits in the current session
- **Reset:** Uploading a new image or clicking "Reset Workspace" clears history

Pro tip: Experiment with different prompts knowing you can always undo!

### Speeding Up Your Workflow

1. **Keep both terminals running** - Leave the backend and frontend running while you work
2. **Reuse successful prompts** - Save prompts that work well in a text file
3. **Use presets first** - Try preset macros before writing custom prompts
4. **Cache background removal** - The first use downloads the model; subsequent uses are faster

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Why is my image taking so long to process?

**A:**

- First-time background removal downloads a 5MB model (one-time delay)
- Large images (>5MB) take longer
- Complex prompts may require more processing time
- Typical processing: 5-10 seconds

### Q: Can I edit the same image multiple times?

**A:** Yes! Each new prompt builds on your most recent result, so you can keep refining an image through as many prompts as you like — add neon lighting, then make it black and white, then add a vignette, each one applying on top of the last. Use Undo (⌘Z) to step back to an earlier point in the chain and branch off from there instead, or "Reset Workspace" to start completely over from the original upload.

### Q: What happens if I close the browser?

**A:**

- All images and edits are lost (nothing is saved to a server)
- You'll need to re-upload images
- The background removal model stays cached in your browser

### Q: Why does my transparent PNG show a checkerboard?

**A:** That's just how browsers display transparency! The actual PNG file has true transparency. Download it and open in any image editor to verify — the checkerboard won't be in the saved file.

### Q: Can I use this offline?

**A:**

- Background removal works offline (after first download)
- Image editing requires internet (connects to the Nano Banana API)
- You need the backend server running locally

### Q: What's the maximum file size?

**A:** The backend accepts up to 25MB files. Most images are much smaller (typical photos are 2-5MB).

### Q: Do my images get stored anywhere?

**A:** No! Everything runs locally. Images are processed in real-time and nothing is saved to any server.

### Q: The "Process Synthesis" button is disabled. Why?

**A:** You need to:

1. Upload an image (check for the preview)
2. Enter a prompt (text box cannot be empty)

### Q: Can I undo an edit?

**A:** Click "Reset Workspace" in the header to start over with a new image. Individual edits cannot be undone — each process creates a new result.

### Q: Why did I get an error message?

**A:** Common errors and fixes:

- **"Failed to communicate with the backend"** → Backend server isn't running
- **"Failed to generate"** → Try a different/simpler prompt
- **"Failed to remove background"** → First use requires internet; check connection
- Red error box appears → Read the message and try again

### Q: What browsers are supported?

**A:**

- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Firefox
- ✅ Safari — if Safari refuses to open `http://localhost:3002` (forces `https://` and fails), see the Troubleshooting section in `README.md` for the one-time HSTS-cache fix
- Background removal requires WebAssembly support (all modern browsers have this)

### Q: Can I use this for commercial projects?

**A:** Check the Nano Banana (Gemini API) terms of service for commercial use. The tool itself is for local use.

---

## 🆘 Need Help?

**If something isn't working:**

1. **Check both terminals are running**
   - Backend on port 3001
   - Frontend on port 3002

2. **Hard refresh your browser**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Restart the servers**
   - Stop both (Ctrl+C)
   - Start backend first, then frontend

4. **Check the browser console**
   - Press `F12` to open developer tools
   - Look for red error messages
   - Share these with technical support

---

## 🎨 Getting Creative

Don't be afraid to experiment! Here are some creative ideas:

- **Layer effects:** Apply "Cinematic" preset, export, re-upload, then add "Future Vibe"
- **Text overlay preparation:** Use prompts like "create space at the top for text"
- **Color schemes:** "convert to black and white," "make everything blue-tinted"
- **Artistic styles:** "Van Gogh style," "pixel art," "oil painting"
- **Lighting experiments:** "add rim lighting," "golden hour glow," "neon underglow"

---

**Enjoy creating with Th3rdAI Vision Studio!** 🎉

For technical documentation, see [README.md](README.md).
