#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="$SCRIPT_DIR/install-sts2-lan-connect-macos.sh"

chmod +x "$INSTALLER"
exec "$INSTALLER" --package-dir "$SCRIPT_DIR" "$@"
