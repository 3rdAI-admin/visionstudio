/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('fs');
const path = require('path');

// electron-builder's afterPack hook. Works around a hardcoded limitation in
// electron-builder itself: its file-copy filter unconditionally excludes any
// directory literally named "node_modules" (see
// node_modules/app-builder-lib/out/util/filter.js and upstream issue
// electron-userland/electron-builder#867) — no extraResources filter pattern
// can override this, since the exclusion happens before patterns are even
// evaluated. package.json's extraResources config explicitly excludes
// backend/node_modules for this reason; this hook copies it in afterward,
// verbatim, the same way extraResources was meant to.
//
// electron-builder invokes this file's module.exports directly (not a
// .default property) when afterPack is a path string in package.json's
// "build" config.
module.exports = async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = packager.appInfo.productFilename;
  const src = path.join(__dirname, '..', 'backend', 'node_modules');
  const dest = path.join(appOutDir, `${appName}.app`, 'Contents', 'Resources', 'backend', 'node_modules');

  if (!fs.existsSync(src)) {
    throw new Error(`[afterPack] backend/node_modules not found at ${src} — run npm install in backend/ first`);
  }

  fs.cpSync(src, dest, { recursive: true, dereference: true });
  console.log(`[afterPack] copied backend/node_modules -> ${dest}`);
};
