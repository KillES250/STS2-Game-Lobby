#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGED_SOURCE_DIR="$SCRIPT_DIR/lobby-service"
REPO_SOURCE_DIR="$ROOT_DIR/lobby-service"

if [[ -f "$PACKAGED_SOURCE_DIR/package.json" ]]; then
  DEFAULT_SOURCE_DIR="$PACKAGED_SOURCE_DIR"
else
  DEFAULT_SOURCE_DIR="$REPO_SOURCE_DIR"
fi

if [[ $EUID -eq 0 ]]; then
  DEFAULT_INSTALL_DIR="${STS2_LOBBY_INSTALL_DIR:-/opt/sts2-lobby}"
else
  DEFAULT_INSTALL_DIR="${STS2_LOBBY_INSTALL_DIR:-$HOME/sts2-lobby}"
fi

SOURCE_DIR="$DEFAULT_SOURCE_DIR"
INSTALL_DIR="$DEFAULT_INSTALL_DIR"
SERVICE_NAME="${STS2_LOBBY_SERVICE_NAME:-sts2-lobby}"
HOST="${STS2_LOBBY_HOST:-0.0.0.0}"
PORT="${STS2_LOBBY_PORT:-8787}"
HEARTBEAT_TIMEOUT_SECONDS="${STS2_HEARTBEAT_TIMEOUT_SECONDS:-35}"
TICKET_TTL_SECONDS="${STS2_TICKET_TTL_SECONDS:-120}"
WS_PATH="${STS2_LOBBY_WS_PATH:-/control}"
RELAY_BIND_HOST="${STS2_LOBBY_RELAY_BIND_HOST:-$HOST}"
RELAY_PUBLIC_HOST="${STS2_LOBBY_RELAY_PUBLIC_HOST:-}"
RELAY_PORT_START="${STS2_LOBBY_RELAY_PORT_START:-39000}"
RELAY_PORT_END="${STS2_LOBBY_RELAY_PORT_END:-39063}"
RELAY_HOST_IDLE_SECONDS="${STS2_LOBBY_RELAY_HOST_IDLE_SECONDS:-20}"
RELAY_CLIENT_IDLE_SECONDS="${STS2_LOBBY_RELAY_CLIENT_IDLE_SECONDS:-90}"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
NPM_BIN="${NPM_BIN:-$(command -v npm || true)}"
SKIP_SYSTEMD=0
RUN_AS_USER="${STS2_LOBBY_RUN_AS_USER:-${SUDO_USER:-$USER}}"
RUN_AS_GROUP="${STS2_LOBBY_RUN_AS_GROUP:-$(id -gn "$RUN_AS_USER" 2>/dev/null || true)}"

usage() {
  cat <<'EOF'
Usage:
  ./install-lobby-service-linux.sh [options]

Options:
  --source-dir <path>   Source directory that contains lobby-service/package.json.
  --install-dir <path>  Target install root. The app will be copied into <path>/lobby-service.
  --service-name <name> systemd service name. Default: sts2-lobby
  --host <value>        HOST written into .env. Default: 0.0.0.0
  --port <value>        PORT written into .env. Default: 8787
  --relay-bind-host <value>
                        RELAY_BIND_HOST written into .env. Default: same as --host
  --relay-public-host <value>
                        RELAY_PUBLIC_HOST written into .env. Default: empty, service uses request host
  --relay-port-start <value>
                        RELAY_PORT_START written into .env. Default: 39000
  --relay-port-end <value>
                        RELAY_PORT_END written into .env. Default: 39063
  --run-user <name>     systemd User value when auto-installing the service.
  --run-group <name>    systemd Group value when auto-installing the service.
  --skip-systemd        Only install files and build the service; do not create/start systemd unit.
  --help                Show this help.

Behavior:
  1. Copies lobby-service into the install directory.
  2. Runs npm ci and npm run build.
  3. Creates .env on first install if it does not already exist.
  4. Creates start-lobby-service.sh for manual startup.
  5. If run as root and systemd is available, installs and starts a persistent systemd service.
EOF
}

log() {
  printf '[sts2-lobby-service] %s\n' "$*"
}

die() {
  printf '[sts2-lobby-service] ERROR: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir)
      [[ $# -ge 2 ]] || die "--source-dir requires a value"
      SOURCE_DIR="$2"
      shift 2
      ;;
    --install-dir)
      [[ $# -ge 2 ]] || die "--install-dir requires a value"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --service-name)
      [[ $# -ge 2 ]] || die "--service-name requires a value"
      SERVICE_NAME="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || die "--host requires a value"
      HOST="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || die "--port requires a value"
      PORT="$2"
      shift 2
      ;;
    --relay-bind-host)
      [[ $# -ge 2 ]] || die "--relay-bind-host requires a value"
      RELAY_BIND_HOST="$2"
      shift 2
      ;;
    --relay-public-host)
      [[ $# -ge 2 ]] || die "--relay-public-host requires a value"
      RELAY_PUBLIC_HOST="$2"
      shift 2
      ;;
    --relay-port-start)
      [[ $# -ge 2 ]] || die "--relay-port-start requires a value"
      RELAY_PORT_START="$2"
      shift 2
      ;;
    --relay-port-end)
      [[ $# -ge 2 ]] || die "--relay-port-end requires a value"
      RELAY_PORT_END="$2"
      shift 2
      ;;
    --run-user)
      [[ $# -ge 2 ]] || die "--run-user requires a value"
      RUN_AS_USER="$2"
      shift 2
      ;;
    --run-group)
      [[ $# -ge 2 ]] || die "--run-group requires a value"
      RUN_AS_GROUP="$2"
      shift 2
      ;;
    --skip-systemd)
      SKIP_SYSTEMD=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || die "node was not found. Install Node.js 20+ first."
[[ -n "$NPM_BIN" && -x "$NPM_BIN" ]] || die "npm was not found. Install Node.js 20+ first."
[[ -f "$SOURCE_DIR/package.json" ]] || die "Source directory '$SOURCE_DIR' does not contain package.json"

node_major="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" -lt 20 ]]; then
  die "Node.js 20+ is required. Current version: $("$NODE_BIN" -v)"
fi

APP_DIR="$INSTALL_DIR/lobby-service"
ENV_FILE="$APP_DIR/.env"
START_SCRIPT="$INSTALL_DIR/start-lobby-service.sh"

mkdir -p "$INSTALL_DIR"

if command -v rsync >/dev/null 2>&1; then
  log "Copying service files to: $APP_DIR"
  mkdir -p "$APP_DIR"
  rsync -a --delete --exclude node_modules --exclude dist --exclude .env "$SOURCE_DIR/" "$APP_DIR/"
else
  log "rsync not found; using a clean copy fallback."
  env_backup=""
  if [[ -f "$ENV_FILE" ]]; then
    env_backup="$(mktemp)"
    cp "$ENV_FILE" "$env_backup"
  fi
  rm -rf "$APP_DIR"
  mkdir -p "$APP_DIR"
  cp -R "$SOURCE_DIR/." "$APP_DIR/"
  rm -rf "$APP_DIR/node_modules" "$APP_DIR/dist"
  rm -f "$APP_DIR/.env"
  if [[ -n "$env_backup" ]]; then
    cp "$env_backup" "$ENV_FILE"
    rm -f "$env_backup"
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
HOST=$HOST
PORT=$PORT
HEARTBEAT_TIMEOUT_SECONDS=$HEARTBEAT_TIMEOUT_SECONDS
TICKET_TTL_SECONDS=$TICKET_TTL_SECONDS
WS_PATH=$WS_PATH
RELAY_BIND_HOST=$RELAY_BIND_HOST
RELAY_PUBLIC_HOST=$RELAY_PUBLIC_HOST
RELAY_PORT_START=$RELAY_PORT_START
RELAY_PORT_END=$RELAY_PORT_END
RELAY_HOST_IDLE_SECONDS=$RELAY_HOST_IDLE_SECONDS
RELAY_CLIENT_IDLE_SECONDS=$RELAY_CLIENT_IDLE_SECONDS
EOF
  log "Created default environment file: $ENV_FILE"
else
  log "Keeping existing environment file: $ENV_FILE"
fi

log "Installing Node.js dependencies"
(cd "$APP_DIR" && "$NPM_BIN" ci)

log "Building lobby service"
(cd "$APP_DIR" && "$NPM_BIN" run build)

cat > "$START_SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR"
exec "$NPM_BIN" start
EOF
chmod +x "$START_SCRIPT"

if [[ $EUID -eq 0 ]]; then
  chown -R "$RUN_AS_USER:$RUN_AS_GROUP" "$INSTALL_DIR"
fi

if [[ "$SKIP_SYSTEMD" -eq 1 ]]; then
  log "systemd installation skipped."
  log "Manual start: $START_SCRIPT"
  exit 0
fi

if ! command -v systemctl >/dev/null 2>&1; then
  log "systemctl not found. Manual start: $START_SCRIPT"
  exit 0
fi

if [[ $EUID -ne 0 ]]; then
  log "Run as root to auto-install systemd. Manual start: $START_SCRIPT"
  exit 0
fi

UNIT_PATH="/etc/systemd/system/$SERVICE_NAME.service"
cat > "$UNIT_PATH" <<EOF
[Unit]
Description=STS2 Lobby Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$NPM_BIN start
Restart=always
RestartSec=3
User=$RUN_AS_USER
Group=$RUN_AS_GROUP

[Install]
WantedBy=multi-user.target
EOF

log "Installed systemd unit: $UNIT_PATH"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
log "Service started. Health check: curl http://127.0.0.1:$PORT/health"
log "If relay fallback is needed, open UDP ports $RELAY_PORT_START-$RELAY_PORT_END on the server firewall/security group."
