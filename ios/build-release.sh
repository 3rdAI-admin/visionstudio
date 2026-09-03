#!/usr/bin/env bash
# Build a signed, installable ad-hoc .ipa for VisionStudio's iOS app.
#
# Requires VITE_BACKEND_URL — fails loudly rather than silently falling back
# to a LAN IP, since a release build shipped with the wrong backend baked in
# is a confusing bug to track down later.
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

if [[ -z "${VITE_BACKEND_URL:-}" ]]; then
  echo "error: VITE_BACKEND_URL is required for a release build (no LAN-IP fallback)." >&2
  echo "  e.g. VITE_BACKEND_URL=https://vision.th3rdai.com $0" >&2
  exit 1
fi

echo "==> Building web bundle (VITE_BACKEND_URL=$VITE_BACKEND_URL)"
cd "$ROOT"
VITE_BACKEND_URL="$VITE_BACKEND_URL" npm run build
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
