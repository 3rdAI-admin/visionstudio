#!/usr/bin/env bash
# Build a signed, installable ad-hoc .ipa for VisionStudio's iOS app.
#
# Defaults VITE_BACKEND_URL to the hosted production backend — override for
# a one-off test build (e.g. a LAN IP) by setting the env var before calling
# this script.
#
# VITE_APP_SECRET, if set, is baked in and sent as X-App-Secret on every
# backend request (see src/backendUrl.ts, backend/index.js's APP_SECRET) —
# must match the value configured on the target server, or every request
# gets a 403. Not required: the backend only enforces it when the server has
# its own APP_SECRET configured, so an unset value here is fine against a
# server that hasn't opted into that hardening yet.
#
# Requires (one-time, manual, in the Apple Developer portal / Xcode):
#   - An Apple Distribution certificate for team 9LRPX62LGN (Automatic
#     signing can create this on first archive if Xcode is signed into an
#     account on that team).
#   - Any test devices registered under that team, for the ad-hoc
#     provisioning profile to include them (Certificates, Identifiers &
#     Profiles > Devices).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios"
APP_DIR="$IOS_DIR/App"
BUILD_DIR="$ROOT/build"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
TEAM_ID="9LRPX62LGN"

VITE_BACKEND_URL="${VITE_BACKEND_URL:-https://vision.th3rdai.com}"

echo "==> Building web bundle (VITE_BACKEND_URL=$VITE_BACKEND_URL)"
cd "$ROOT"
VITE_BACKEND_URL="$VITE_BACKEND_URL" VITE_APP_SECRET="${VITE_APP_SECRET:-}" npm run build
npx cap sync ios

echo "==> Bumping build number"
cd "$APP_DIR"
xcrun agvtool next-version -all

echo "==> Archiving (this can take a few minutes)"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
xcodebuild \
  -project "$APP_DIR/App.xcodeproj" \
  -scheme App \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  -allowProvisioningUpdates \
  archive

echo "==> Exporting .ipa"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$APP_DIR/ExportOptions.plist" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates

echo "==> Done: $EXPORT_PATH"
find "$EXPORT_PATH" -maxdepth 1 -iname "*.ipa"
