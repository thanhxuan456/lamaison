#!/bin/bash
# ============================================================
#  Grand Palace Hotels & Resorts — VPS Auto Installer
#  Tested on: Ubuntu 22.04 / 24.04 LTS, Debian 12
#  Requirements: root or sudo access
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
header() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

# ─── Configuration (edit before running) ────────────────────
APP_USER="${APP_USER:-grandpalace}"
APP_DIR="${APP_DIR:-/var/www/grandpalace}"
DB_NAME="${DB_NAME:-grandpalace_db}"
DB_USER="${DB_USER:-grandpalace_user}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)}"
API_PORT="${API_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DOMAIN="${DOMAIN:-}"          # e.g. grandpalace.vn — leave empty to skip nginx
NODE_VERSION="22"             # LTS — change to 24 when Node 24 is LTS-stable
REPO_URL="${REPO_URL:-}"      # Git repo URL, e.g. https://github.com/youruser/grandpalace.git
# ────────────────────────────────────────────────────────────

header "Grand Palace — VPS Installer"
echo "  App dir  : $APP_DIR"
echo "  DB name  : $DB_NAME"
echo "  DB user  : $DB_USER"
echo "  API port : $API_PORT"
[ -n "$DOMAIN" ] && echo "  Domain   : $DOMAIN"
echo ""
warn "This script will install Node.js, PostgreSQL, pnpm, PM2, and Nginx."
read -rp "Continue? (y/N) " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ─── 0. Root check ──────────────────────────────────────────
header "0. Checking permissions"
if [ "$EUID" -ne 0 ]; then
  warn "Not running as root — attempting sudo prefix..."
  SUDO="sudo"
else
  SUDO=""
fi
log "OK"

# ─── 1. System packages ─────────────────────────────────────
header "1. Updating system packages"
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget git unzip build-essential openssl ca-certificates gnupg lsb-release
log "System packages ready"

# ─── 2. Node.js ─────────────────────────────────────────────
header "2. Installing Node.js $NODE_VERSION"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi
log "Node.js $(node -v) installed"

# ─── 3. pnpm ────────────────────────────────────────────────
header "3. Installing pnpm"
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi
log "pnpm $(pnpm --version) installed"

# ─── 4. PM2 ─────────────────────────────────────────────────
header "4. Installing PM2 (process manager)"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
log "PM2 $(pm2 --version) installed"

# ─── 5. PostgreSQL ──────────────────────────────────────────
header "5. Installing PostgreSQL"
if ! command -v psql &>/dev/null; then
  $SUDO apt-get install -y postgresql postgresql-contrib
fi
$SUDO systemctl enable postgresql
$SUDO systemctl start postgresql
log "PostgreSQL $(psql --version) installed"

# ─── 6. Create database ─────────────────────────────────────
header "6. Creating database & user"
$SUDO -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
  ELSE
    ALTER USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE $DB_NAME' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '$DB_NAME'
)\gexec
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
SQL
log "Database '$DB_NAME' and user '$DB_USER' ready"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ─── 7. Nginx ───────────────────────────────────────────────
header "7. Installing Nginx"
if ! command -v nginx &>/dev/null; then
  $SUDO apt-get install -y nginx
fi
$SUDO systemctl enable nginx
$SUDO systemctl start nginx
log "Nginx installed"

# ─── 8. App user ────────────────────────────────────────────
header "8. Creating app user '$APP_USER'"
if ! id "$APP_USER" &>/dev/null; then
  $SUDO useradd -m -s /bin/bash "$APP_USER"
fi
log "User '$APP_USER' ready"

# ─── 9. Clone / copy app ────────────────────────────────────
header "9. Deploying application source"
$SUDO mkdir -p "$APP_DIR"
$SUDO chown "$APP_USER:$APP_USER" "$APP_DIR"

if [ -n "$REPO_URL" ]; then
  log "Cloning from $REPO_URL ..."
  $SUDO -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" 2>/dev/null || \
    ($SUDO -u "$APP_USER" bash -c "cd $APP_DIR && git pull")
else
  warn "No REPO_URL set. Copying current directory to $APP_DIR ..."
  $SUDO rsync -a --exclude=node_modules --exclude=.git --exclude=dist \
    "$(pwd)/" "$APP_DIR/"
  $SUDO chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi
log "Source deployed to $APP_DIR"

# ─── 10. Environment file ───────────────────────────────────
header "10. Writing .env file"
ENV_FILE="$APP_DIR/.env"

$SUDO -u "$APP_USER" tee "$ENV_FILE" > /dev/null <<ENV
# ── Database ──────────────────────────────────────────────
DATABASE_URL=${DATABASE_URL}

# ── API Server ────────────────────────────────────────────
PORT=${API_PORT}
NODE_ENV=production

# ── Clerk Auth ────────────────────────────────────────────
# Get these from https://dashboard.clerk.com/last-active?path=api-keys
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# ── Frontend ──────────────────────────────────────────────
VITE_CLERK_PUBLISHABLE_KEY=
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:${API_PORT}
ENV

log ".env written to $ENV_FILE"
warn "IMPORTANT: Edit $ENV_FILE and fill in your Clerk API keys before starting."

# ─── 11. Install dependencies ───────────────────────────────
header "11. Installing npm dependencies"
$SUDO -u "$APP_USER" bash -c "cd $APP_DIR && pnpm install --frozen-lockfile"
log "Dependencies installed"

# ─── 12. Run DB migrations ──────────────────────────────────
header "12. Running database migrations"
$SUDO -u "$APP_USER" bash -c "cd $APP_DIR && set -a && source .env && set +a && pnpm --filter @workspace/db run push"
log "Database schema applied"

# ─── 13. Build the project ──────────────────────────────────
header "13. Building project (this may take a few minutes)"
$SUDO -u "$APP_USER" bash -c "cd $APP_DIR && set -a && source .env && set +a && \
  VITE_CLERK_PUBLISHABLE_KEY=\$VITE_CLERK_PUBLISHABLE_KEY \
  BASE_PATH=/ \
  pnpm --filter @workspace/hotel-system run build && \
  pnpm --filter @workspace/api-server run build"
log "Build complete"

# ─── 14. PM2 ecosystem file ─────────────────────────────────
header "14. Creating PM2 ecosystem config"
$SUDO -u "$APP_USER" tee "$APP_DIR/ecosystem.config.cjs" > /dev/null <<'PM2'
module.exports = {
  apps: [
    {
      name: "grandpalace-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: __dirname,
      env_file: ".env",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "./logs/api-error.log",
      out_file:   "./logs/api-out.log",
      log_file:   "./logs/api-combined.log",
      time: true,
    },
  ],
};
PM2

$SUDO -u "$APP_USER" mkdir -p "$APP_DIR/logs"
log "PM2 ecosystem config written"

# ─── 15. Start with PM2 ─────────────────────────────────────
header "15. Starting application with PM2"
$SUDO -u "$APP_USER" bash -c "cd $APP_DIR && pm2 delete grandpalace-api 2>/dev/null || true && pm2 start ecosystem.config.cjs"
$SUDO env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null | tail -1 | bash || true
$SUDO -u "$APP_USER" bash -c "pm2 save"
log "API server running on port $API_PORT"

# ─── 16. Nginx config ───────────────────────────────────────
header "16. Configuring Nginx"

NGINX_STATIC_ROOT="$APP_DIR/artifacts/hotel-system/dist/public"

if [ -n "$DOMAIN" ]; then
  NGINX_SERVER_NAME="$DOMAIN www.$DOMAIN"
else
  NGINX_SERVER_NAME="_"
fi

$SUDO tee /etc/nginx/sites-available/grandpalace > /dev/null <<NGINX
server {
    listen 80;
    server_name ${NGINX_SERVER_NAME};

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    # Static frontend (built Vite files)
    root ${NGINX_STATIC_ROOT};
    index index.html;

    # API proxy — forward /api/* to Express
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
    }

    # WebSocket for live chat
    location /api/chat/ws/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Host \$host;
    }

    # SPA fallback — serve index.html for all non-API routes
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 20M;
}
NGINX

$SUDO ln -sf /etc/nginx/sites-available/grandpalace /etc/nginx/sites-enabled/grandpalace
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl reload nginx
log "Nginx configured and reloaded"

# ─── 17. SSL (optional) ─────────────────────────────────────
if [ -n "$DOMAIN" ] && command -v certbot &>/dev/null; then
  header "17. Setting up SSL with Let's Encrypt"
  $SUDO certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
    warn "Certbot failed — run manually: sudo certbot --nginx -d $DOMAIN"
elif [ -n "$DOMAIN" ]; then
  warn "certbot not installed. Install it with: sudo apt install certbot python3-certbot-nginx"
  warn "Then run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# ─── Summary ────────────────────────────────────────────────
header "✅ Installation Complete"
echo ""
echo -e "  ${GREEN}Frontend${NC} : http://${DOMAIN:-localhost}/"
echo -e "  ${GREEN}API      ${NC} : http://${DOMAIN:-localhost}/api/"
echo -e "  ${GREEN}App dir  ${NC} : $APP_DIR"
echo -e "  ${GREEN}DB name  ${NC} : $DB_NAME"
echo -e "  ${GREEN}DB user  ${NC} : $DB_USER"
echo -e "  ${GREEN}DB pass  ${NC} : $DB_PASS"
echo ""
echo -e "${YELLOW}⚠  Next steps:${NC}"
echo "  1. Edit $ENV_FILE and fill in CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, VITE_CLERK_PUBLISHABLE_KEY"
echo "  2. Restart the API: pm2 restart grandpalace-api"
echo "  3. Rebuild frontend with your Clerk key:"
echo "     cd $APP_DIR && source .env && VITE_CLERK_PUBLISHABLE_KEY=\$VITE_CLERK_PUBLISHABLE_KEY BASE_PATH=/ pnpm --filter @workspace/hotel-system run build"
if [ -n "$DOMAIN" ]; then
  echo "  4. Set up SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi
echo ""
echo -e "${CYAN}PM2 commands:${NC}"
echo "  pm2 status              — check running apps"
echo "  pm2 logs grandpalace-api — view API logs"
echo "  pm2 restart grandpalace-api — restart API"
echo ""
echo -e "${CYAN}Save database credentials somewhere safe!${NC}"
echo "  DATABASE_URL=$DATABASE_URL"
