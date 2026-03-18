#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/lobby-service"
RELEASE_DIR="$SOURCE_DIR/release"
PACKAGE_NAME="sts2_lobby_service"
PACKAGE_ROOT="$RELEASE_DIR/$PACKAGE_NAME"
INSTALLER="$ROOT_DIR/scripts/install-lobby-service-linux.sh"

[[ -f "$SOURCE_DIR/package.json" ]] || {
  echo "lobby-service/package.json not found" >&2
  exit 1
}

rm -rf "$PACKAGE_ROOT"
mkdir -p "$PACKAGE_ROOT/lobby-service"

cp -R "$SOURCE_DIR/src" "$PACKAGE_ROOT/lobby-service/"
cp "$SOURCE_DIR/package.json" "$PACKAGE_ROOT/lobby-service/"
cp "$SOURCE_DIR/package-lock.json" "$PACKAGE_ROOT/lobby-service/"
cp "$SOURCE_DIR/tsconfig.json" "$PACKAGE_ROOT/lobby-service/"
cp "$SOURCE_DIR/.env.example" "$PACKAGE_ROOT/lobby-service/"
cp -R "$SOURCE_DIR/deploy" "$PACKAGE_ROOT/lobby-service/"
cp "$SOURCE_DIR/README.md" "$PACKAGE_ROOT/README.md"
cp "$INSTALLER" "$PACKAGE_ROOT/"
chmod +x "$PACKAGE_ROOT/install-lobby-service-linux.sh"

cd "$RELEASE_DIR"
rm -f "${PACKAGE_NAME}.zip"
zip -qr "${PACKAGE_NAME}.zip" "$PACKAGE_NAME"
echo "Package created at: $RELEASE_DIR/${PACKAGE_NAME}.zip"
