/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { contextBridge, ipcRenderer } = require('electron');

// Only exposes a fixed, no-argument restart trigger — nothing that accepts
// renderer-supplied data, so this can't be used to reach arbitrary main-process
// APIs even though contextIsolation is on and nodeIntegration is off.
contextBridge.exposeInMainWorld('electronAPI', {
  restartApp: () => ipcRenderer.send('restart-app'),
});
