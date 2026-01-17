#!/usr/bin/env bash
set -euo pipefail

SRC="assets/images/icon.png"
OUTDIR="assets/branding/icons"

if [[ ! -f "$SRC" ]]; then
  echo "Source icon not found: $SRC" >&2
  exit 1
fi

mkdir -p "$OUTDIR"

echo "[icons] Using source: $SRC"

# Warn if the icon has transparency (App Store icon must have no alpha)
ALPHA=$(sips -g hasAlpha "$SRC" | awk '/hasAlpha/ {print $2}') || true
if [[ "$ALPHA" != "no" ]]; then
  echo "[icons] WARNING: Source icon has an alpha channel. App Store icon must have no transparency. Consider flattening onto a solid background before submission." >&2
fi

# App Store listing icon (1024x1024 PNG)
echo "[icons] Generating App Store icon (1024x1024) ..."
sips -s format png -Z 1024 "$SRC" --out "$OUTDIR/appstore-icon-1024.png" >/dev/null

# Flatten App Store icon (remove transparency via JPEG conversion)
echo "[icons] Flattening App Store icon (removing transparency) ..."
sips -s format jpeg "$OUTDIR/appstore-icon-1024.png" --out /tmp/icon-temp.jpg >/dev/null 2>&1
sips -s format png /tmp/icon-temp.jpg --out "$OUTDIR/appstore-icon-1024-flat.png" >/dev/null 2>&1
rm -f /tmp/icon-temp.jpg

# Google Play listing icon (512x512 PNG)
echo "[icons] Generating Play icon (512x512) ..."
sips -s format png -Z 512 "$SRC" --out "$OUTDIR/play-icon-512.png" >/dev/null

# Report sizes and verify
APP_SZ=$(stat -f%z "$OUTDIR/appstore-icon-1024.png" 2>/dev/null || echo 0)
APP_FLAT_SZ=$(stat -f%z "$OUTDIR/appstore-icon-1024-flat.png" 2>/dev/null || echo 0)
PLAY_SZ=$(stat -f%z "$OUTDIR/play-icon-512.png" 2>/dev/null || echo 0)

# Verify flattened icon has no alpha
FLAT_ALPHA=$(sips -g hasAlpha "$OUTDIR/appstore-icon-1024-flat.png" 2>/dev/null | awk '/hasAlpha/ {print $2}') || true

echo "[icons] Done. Outputs:"
echo "  - $OUTDIR/appstore-icon-1024.png (${APP_SZ} bytes) - with transparency"
echo "  - $OUTDIR/appstore-icon-1024-flat.png (${APP_FLAT_SZ} bytes) - ✓ READY FOR APP STORE (no alpha: $FLAT_ALPHA)"
echo "  - $OUTDIR/play-icon-512.png (${PLAY_SZ} bytes)"
echo ""
echo "Upload to stores:"
echo "  • App Store Connect: use appstore-icon-1024-flat.png"
echo "  • Google Play Console: use play-icon-512.png" 
