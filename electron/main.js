/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');

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
      preload: path.join(__dirname, 'preload.js'),
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

// GitHub-Releases-backed auto-update. electron-builder's "publish" config
// (package.json) points electron-updater at this repo — no separate update
// server needed. autoUpdater.checkForUpdatesAndNotify() is a no-op unless
// app.isPackaged (it reads app-update.yml, which only exists in a packaged
// build), so this is always safe to call in dev too.
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false; // we prompt instead, see below

  autoUpdater.on('error', (err) => {
    console.error(`[updater] ${err?.message || err}`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update ready',
        message: `VisionStudio ${info.version} has been downloaded.`,
        detail: 'Restart the app to install the update.',
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  // Check on launch, then every 4 hours for as long as the app stays open.
  // checkForUpdatesAndNotify() rejects (e.g. no GitHub releases published
  // yet, or offline) separately from emitting 'error', so both must be
  // handled or Electron logs an UnhandledPromiseRejectionWarning.
  const check = () => autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error(`[updater] check failed: ${err?.message || err}`);
  });
  check();
  setInterval(check, 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
  setupAutoUpdater();

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

// Renderer-triggered full app restart (Settings UI "Restart App" button) —
// relaunch() schedules a new instance on exit. app.exit() terminates
// immediately WITHOUT firing before-quit/will-quit (unlike app.quit()), so
// the forked backend must be killed explicitly here or it's orphaned —
// confirmed via a real restart that leaked the old backend process.
//
// isRestarting guards against a double-click sending this twice: relaunch()
// called more than once starts multiple new instances on exit (per Electron's
// own docs), each forking its own backend on the same hardcoded BACKEND_PORT.
// Also waits for the old backend's 'exit' event (not just calling kill(),
// which is fire-and-forget) so its port is actually released before the new
// instance forks its own backend — otherwise the new fork can lose an
// EADDRINUSE race, and backend/index.js has no listen-error handler to
// recover from that. A timeout caps the wait in case the process is already
// dead or hangs on shutdown.
let isRestarting = false;
ipcMain.on('restart-app', () => {
  if (isRestarting) return;
  isRestarting = true;

  const doRelaunch = () => {
    app.relaunch();
    app.exit(0);
  };

  if (!backendProcess || backendProcess.exitCode !== null) {
    doRelaunch();
    return;
  }
  const timeout = setTimeout(doRelaunch, 2000);
  backendProcess.once('exit', () => {
    clearTimeout(timeout);
    doRelaunch();
  });
  backendProcess.kill();
});
