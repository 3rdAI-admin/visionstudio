/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { notarize } = require('@electron/notarize');

// electron-builder's afterSign hook. Requires APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD
// (or APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER) in the environment —
// never commit these. Skips notarization for local/dev builds where they're unset,
// so `npm run electron:build` still works without Apple credentials configured.
//
// electron-builder invokes this file's module.exports directly (not a .default
// property) when afterSign is a path string in package.json's "build" config.
module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const hasAppleId = process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const hasApiKey =
    process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER;

  if (!hasAppleId && !hasApiKey) {
    console.warn(
      '[notarize] Skipping notarization: set APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD ' +
        '(or APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER) to notarize a release build.',
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: 'com.th3rdai.visionstudio',
    appPath: `${appOutDir}/${appName}.app`,
    ...(hasAppleId
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID || '9LRPX62LGN',
        }
      : {
          appleApiKey: process.env.APPLE_API_KEY,
          appleApiKeyId: process.env.APPLE_API_KEY_ID,
          appleApiIssuer: process.env.APPLE_API_ISSUER,
        }),
  });
};
