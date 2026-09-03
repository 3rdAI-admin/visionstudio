/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// Fixed to match src/backendUrl.ts's DEV_DEFAULT ('http://localhost:3001'),
// so the renderer needs no VITE_BACKEND_URL baked in and no config wiring —
// it just falls through to that default like local dev already does.
const BACKEND_PORT = 3001;

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  // backend/ ships via electron-builder's extraResources (see package.json's
  // "build" config), not the asar archive — it's a separate npm project with
  // its own node_modules, and extraResources copies it verbatim (including
  // node_modules) rather than going through files' dependency-pruning logic,
  // which otherwise strips out a nested project's node_modules entirely.
  const backendEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'index.js')
    : path.join(__dirname, '..', 'backend', 'index.js');

  backendProcess = fork(backendEntry, [], {
    cwd: path.dirname(backendEntry),
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: 'pipe',
  });

  backendProcess.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backendProcess.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[backend] exited with code ${code}`);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0A0A0A',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[renderer] failed to load ${url}: ${desc} (${code})`);
  });
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[renderer console] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  backendProcess?.kill();
});
