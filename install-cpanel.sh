#!/bin/bash
# ============================================================
#  Grand Palace Hotels & Resorts — cPanel VPS Installer
#  Hỗ trợ: CentOS 7/8, CloudLinux 7/8, AlmaLinux 8/9,
#           Rocky Linux 8/9, Ubuntu 20.04/22.04
#  Yêu cầu: SSH root (hoặc sudo) vào VPS cPanel/WHM
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
info()   { echo -e "${BLUE}[i]${NC} $1"; }
header() {
  echo -e "\n${CYAN}══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}══════════════════════════════════════════════${NC}"
}

# ─── Cấu hình (chỉnh trước khi chạy) ───────────────────────
APP_DIR="${APP_DIR:-/home/grandpalace/public_html}"   # thư mục gốc app
CPANEL_USER="${CPANEL_USER:-grandpalace}"             # username cPanel
DB_NAME="${DB_NAME:-${CPANEL_USER}_gpdb}"             # cPanel prefix tự thêm
DB_USER="${DB_USER:-${CPANEL_USER}_gpuser}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c 18)}"
API_PORT="${API_PORT:-3100}"                           # port cho Express API
DOMAIN="${DOMAIN:-}"                                  # ví dụ: grandpalace.vn
REPO_URL="${REPO_URL:-}"                              # git repo nếu có
NODE_VERSION="22"
# ────────────────────────────────────────────────────────────

# Phát hiện hệ điều hành
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
  elif [ -f /etc/redhat-release ]; then
    OS_ID="centos"
    OS_VERSION=$(grep -oE '[0-9]+' /etc/redhat-release | head -1)
  else
    OS_ID="unknown"
  fi
}
detect_os

header "Grand Palace — cPanel VPS Installer"
echo "  Hệ điều hành : $OS_ID $OS_VERSION"
echo "  Thư mục app  : $APP_DIR"
echo "  cPanel user  : $CPANEL_USER"
echo "  DB name      : $DB_NAME"
echo "  DB user      : $DB_USER"
echo "  API port     : $API_PORT"
[ -n "$DOMAIN" ] && echo "  Domain       : $DOMAIN"
echo ""
warn "Script sẽ cài PostgreSQL, Node.js, pnpm, PM2 trực tiếp lên server."
warn "Cần quyền root hoặc sudo."
read -rp "Tiếp tục? (y/N) " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Đã hủy."; exit 0; }

# Root check
if [ "$EUID" -ne 0 ]; then
  command -v sudo &>/dev/null || error "Cần quyền root. Chạy: sudo bash install-cpanel.sh"
  SUDO="sudo"
  info "Dùng sudo..."
else
  SUDO=""
fi

# ─── Hàm cài theo OS ────────────────────────────────────────
pkg_install() {
  case "$OS_ID" in
    ubuntu|debian)
      $SUDO apt-get install -y "$@"
      ;;
    centos|rhel|almalinux|rocky|cloudlinux)
      $SUDO yum install -y "$@" 2>/dev/null || $SUDO dnf install -y "$@"
      ;;
    *)
      error "Hệ điều hành không được hỗ trợ: $OS_ID"
      ;;
  esac
}

# ─── 1. Gói hệ thống cơ bản ─────────────────────────────────
header "1. Cập nhật và cài gói cơ bản"
case "$OS_ID" in
  ubuntu|debian)
    $SUDO apt-get update -y
    pkg_install curl wget git unzip build-essential openssl ca-certificates gnupg
    ;;
  centos|rhel|almalinux|rocky|cloudlinux)
    $SUDO yum update -y 2>/dev/null || $SUDO dnf update -y
    pkg_install curl wget git unzip gcc gcc-c++ make openssl ca-certificates
    # Enable EPEL
    pkg_install epel-release 2>/dev/null || true
    ;;
esac
log "Gói cơ bản đã sẵn sàng"

# ─── 2. PostgreSQL ──────────────────────────────────────────
header "2. Cài đặt PostgreSQL 16"
PG_VERSION=16

install_postgres_ubuntu() {
  if ! command -v psql &>/dev/null; then
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
      $SUDO gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] \
      https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \
      $SUDO tee /etc/apt/sources.list.d/pgdg.list
    $SUDO apt-get update -y
    $SUDO apt-get install -y "postgresql-$PG_VERSION" postgresql-client-$PG_VERSION
  fi
}

install_postgres_rhel() {
  if ! command -v psql &>/dev/null; then
    RHEL_VER="${OS_VERSION%%.*}"
    $SUDO yum install -y "https://download.postgresql.org/pub/repos/yum/reporpms/EL-${RHEL_VER}-x86_64/pgdg-redhat-repo-latest.noarch.rpm" 2>/dev/null || \
    $SUDO dnf install -y "https://download.postgresql.org/pub/repos/yum/reporpms/EL-${RHEL_VER}-x86_64/pgdg-redhat-repo-latest.noarch.rpm"
    # Disable built-in PostgreSQL module (RHEL8+)
    $SUDO dnf -qy module disable postgresql 2>/dev/null || true
    $SUDO yum install -y "postgresql${PG_VERSION}-server" "postgresql${PG_VERSION}" 2>/dev/null || \
    $SUDO dnf install -y "postgresql${PG_VERSION}-server" "postgresql${PG_VERSION}"
    $SUDO "/usr/pgsql-${PG_VERSION}/bin/postgresql-${PG_VERSION}-setup" initdb
  fi
}

case "$OS_ID" in
  ubuntu|debian) install_postgres_ubuntu ;;
  *) install_postgres_rhel ;;
esac

# Chỉnh pg_hba.conf cho phép kết nối local bằng password
PG_HBA=""
for f in \
  "/etc/postgresql/$PG_VERSION/main/pg_hba.conf" \
  "/var/lib/pgsql/$PG_VERSION/data/pg_hba.conf" \
  "/var/lib/postgresql/$PG_VERSION/main/pg_hba.conf"; do
  [ -f "$f" ] && PG_HBA="$f" && break
done

if [ -n "$PG_HBA" ]; then
  # Thêm dòng md5 cho local trước các dòng ident/peer
  $SUDO sed -i '/^local\s\+all\s\+all\s\+peer/s/peer/md5/' "$PG_HBA" 2>/dev/null || true
  $SUDO sed -i '/^host\s\+all\s\+all\s\+127.0.0.1/s/ident/md5/' "$PG_HBA" 2>/dev/null || true
fi

# Enable và start PostgreSQL
PG_SERVICE="postgresql"
case "$OS_ID" in
  centos|rhel|almalinux|rocky|cloudlinux)
    PG_SERVICE="postgresql-$PG_VERSION"
    ;;
esac
$SUDO systemctl enable "$PG_SERVICE"
$SUDO systemctl restart "$PG_SERVICE"
log "PostgreSQL $PG_VERSION đã khởi động"

# ─── 3. Tạo database & user ─────────────────────────────────
header "3. Tạo database và user"
$SUDO -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
  ELSE
    ALTER USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME}' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '${DB_NAME}'
)\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
SQL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
log "Database '${DB_NAME}' và user '${DB_USER}' đã tạo"

# ─── 4. Node.js ─────────────────────────────────────────────
header "4. Cài đặt Node.js $NODE_VERSION"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  case "$OS_ID" in
    ubuntu|debian)
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | $SUDO bash -
      $SUDO apt-get install -y nodejs
      ;;
    *)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | $SUDO bash -
      $SUDO yum install -y nodejs 2>/dev/null || $SUDO dnf install -y nodejs
      ;;
  esac
fi
log "Node.js $(node -v) đã cài"

# ─── 5. pnpm & PM2 ──────────────────────────────────────────
header "5. Cài đặt pnpm và PM2"
command -v pnpm &>/dev/null || npm install -g pnpm
command -v pm2  &>/dev/null || npm install -g pm2
log "pnpm $(pnpm --version)  |  PM2 $(pm2 --version)"

# ─── 6. Tạo user cPanel (nếu chưa có) ──────────────────────
header "6. Kiểm tra user hệ thống '$CPANEL_USER'"
if ! id "$CPANEL_USER" &>/dev/null; then
  warn "User '$CPANEL_USER' chưa tồn tại."
  warn "Hãy tạo account trong WHM trước, hoặc tạo nhanh bằng lệnh dưới:"
  echo "  useradd -m -s /bin/bash $CPANEL_USER"
  read -rp "Tạo user hệ thống đơn giản ngay bây giờ? (y/N) " CREATE_USER
  if [[ "$CREATE_USER" =~ ^[Yy]$ ]]; then
    $SUDO useradd -m -s /bin/bash "$CPANEL_USER"
    log "Đã tạo user '$CPANEL_USER'"
  else
    warn "Tiếp tục với user hiện tại: $(whoami)"
    CPANEL_USER=$(whoami)
    APP_DIR="/home/$CPANEL_USER/public_html"
  fi
fi
log "User '$CPANEL_USER' sẵn sàng"

# ─── 7. Triển khai source code ──────────────────────────────
header "7. Triển khai source code"
$SUDO mkdir -p "$APP_DIR"
$SUDO chown "$CPANEL_USER:$CPANEL_USER" "$APP_DIR"

if [ -n "$REPO_URL" ]; then
  info "Clone từ $REPO_URL ..."
  if [ -d "$APP_DIR/.git" ]; then
    $SUDO -u "$CPANEL_USER" bash -c "cd '$APP_DIR' && git pull"
  else
    $SUDO -u "$CPANEL_USER" git clone "$REPO_URL" "$APP_DIR"
  fi
else
  warn "Không có REPO_URL — copy thư mục hiện tại vào $APP_DIR ..."
  $SUDO rsync -a \
    --exclude=node_modules --exclude=.git --exclude=dist \
    --exclude='*.log' \
    "$(pwd)/" "$APP_DIR/"
  $SUDO chown -R "$CPANEL_USER:$CPANEL_USER" "$APP_DIR"
fi
log "Source code tại $APP_DIR"

# ─── 8. Tạo file .env ───────────────────────────────────────
header "8. Tạo file .env"
ENV_FILE="$APP_DIR/.env"

$SUDO -u "$CPANEL_USER" tee "$ENV_FILE" > /dev/null <<ENV
# ── Database ──────────────────────────────────────────────
DATABASE_URL=${DATABASE_URL}

# ── API Server ────────────────────────────────────────────
PORT=${API_PORT}
NODE_ENV=production

# ── Clerk Auth ─────────────────────────────────────────────
# Lấy tại: https://dashboard.clerk.com/last-active?path=api-keys
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
VITE_CLERK_PUBLISHABLE_KEY=

# ── Frontend ───────────────────────────────────────────────
BASE_PATH=/
ENV

chmod 600 "$ENV_FILE"
log ".env đã tạo tại $ENV_FILE"
warn "Hãy điền CLERK_SECRET_KEY và VITE_CLERK_PUBLISHABLE_KEY vào file .env sau khi script chạy xong"

# ─── 9. Cài dependencies ────────────────────────────────────
header "9. Cài đặt npm dependencies"
$SUDO -u "$CPANEL_USER" bash -c "cd '$APP_DIR' && pnpm install --frozen-lockfile"
log "Dependencies đã cài"

# ─── 10. Chạy DB migration ──────────────────────────────────
header "10. Chạy database migration"
$SUDO -u "$CPANEL_USER" bash -c "
  cd '$APP_DIR'
  set -a; source .env; set +a
  pnpm --filter @workspace/db run push
"
log "Schema database đã cập nhật"

# ─── 11. Build project ──────────────────────────────────────
header "11. Build project (có thể mất vài phút)"
warn "Chú ý: Vite cần VITE_CLERK_PUBLISHABLE_KEY để build frontend."
warn "Nếu bạn chưa điền key, frontend sẽ build nhưng auth sẽ không hoạt động."
warn "Bạn có thể build lại sau: cd $APP_DIR && source .env && pnpm --filter @workspace/hotel-system run build"

$SUDO -u "$CPANEL_USER" bash -c "
  cd '$APP_DIR'
  set -a; source .env; set +a
  pnpm --filter @workspace/hotel-system run build
  pnpm --filter @workspace/api-server run build
"
log "Build hoàn tất"

# ─── 12. PM2 ecosystem ──────────────────────────────────────
header "12. Cấu hình PM2"
$SUDO -u "$CPANEL_USER" tee "$APP_DIR/ecosystem.config.cjs" > /dev/null <<'PM2'
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
      max_memory_restart: "400M",
      error_file: "./logs/api-error.log",
      out_file:   "./logs/api-out.log",
      log_file:   "./logs/api-combined.log",
      time: true,
    },
  ],
};
PM2

$SUDO -u "$CPANEL_USER" mkdir -p "$APP_DIR/logs"
log "ecosystem.config.cjs đã tạo"

# ─── 13. Khởi động PM2 ──────────────────────────────────────
header "13. Khởi động API với PM2"
$SUDO -u "$CPANEL_USER" bash -c "
  cd '$APP_DIR'
  pm2 delete grandpalace-api 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save
"
# Auto-start PM2 khi server reboot
$SUDO env PATH="$PATH:/usr/bin:/usr/local/bin" \
  pm2 startup systemd -u "$CPANEL_USER" --hp "/home/$CPANEL_USER" 2>/dev/null | \
  grep "sudo " | bash || \
  warn "Không tự động cấu hình startup được. Chạy thủ công: pm2 startup"
log "API đang chạy trên port $API_PORT"

# ─── 14. Cấu hình Apache (cPanel dùng Apache) ───────────────
header "14. Cấu hình Apache/proxy cho cPanel"

HTACCESS="$APP_DIR/.htaccess"
STATIC_DIR="$APP_DIR/artifacts/hotel-system/dist/public"

# Kiểm tra mod_proxy
if httpd -M 2>/dev/null | grep -q proxy_module || apache2ctl -M 2>/dev/null | grep -q proxy_module; then
  HAS_PROXY=true
else
  HAS_PROXY=false
  warn "Apache mod_proxy chưa được bật. Hỏi host hoặc bật qua WHM → EasyApache."
fi

# Tạo .htaccess
$SUDO -u "$CPANEL_USER" tee "$HTACCESS" > /dev/null <<HTACCESS
# Grand Palace — Apache config
Options -MultiViews -Indexes
RewriteEngine On

# Bỏ qua file thực
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Proxy /api/ đến Express
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^api/(.*)$ http://127.0.0.1:${API_PORT}/api/\$1 [P,L]

# WebSocket live chat
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{REQUEST_URI} ^/api/chat/ws/ [NC]
RewriteRule ^api/chat/ws/(.*)$ ws://127.0.0.1:${API_PORT}/api/chat/ws/\$1 [P,L]

# SPA fallback — tất cả route về index.html
RewriteRule ^ index.html [L]
HTACCESS

# Copy static files lên public_html nếu thư mục build khác APP_DIR
if [ "$STATIC_DIR" != "$APP_DIR" ] && [ -d "$STATIC_DIR" ]; then
  info "Copy static files vào $APP_DIR ..."
  $SUDO -u "$CPANEL_USER" rsync -a "$STATIC_DIR/" "$APP_DIR/"
  log "Static files đã copy"
fi

log "Apache .htaccess đã cấu hình"

# ─── 15. SSL qua cPanel ─────────────────────────────────────
header "15. SSL / HTTPS"
info "Để bật SSL miễn phí:"
echo "  1. Đăng nhập WHM → SSL/TLS → Manage AutoSSL"
echo "  2. Hoặc cPanel → SSL/TLS → Let's Encrypt SSL"
echo "  3. Bật 'Force HTTPS Redirect' trong cPanel → Domains"

# ─── Tóm tắt ────────────────────────────────────────────────
header "✅ Cài đặt hoàn tất"
echo ""
echo -e "  ${GREEN}Website${NC}      : http://${DOMAIN:-YOUR_DOMAIN}/"
echo -e "  ${GREEN}API endpoint${NC} : http://${DOMAIN:-YOUR_DOMAIN}/api/"
echo -e "  ${GREEN}Thư mục app${NC}  : $APP_DIR"
echo ""
echo -e "  ${CYAN}Database${NC}"
echo -e "    Tên DB      : $DB_NAME"
echo -e "    User DB     : $DB_USER"
echo -e "    Mật khẩu DB : $DB_PASS"
echo -e "    URL kết nối : $DATABASE_URL"
echo ""
echo -e "${YELLOW}⚠  Việc cần làm tiếp theo:${NC}"
echo "  1. Điền Clerk keys vào $ENV_FILE:"
echo "       CLERK_SECRET_KEY=sk_live_..."
echo "       CLERK_PUBLISHABLE_KEY=pk_live_..."
echo "       VITE_CLERK_PUBLISHABLE_KEY=pk_live_..."
echo ""
echo "  2. Build lại frontend với Clerk key:"
echo "       cd $APP_DIR && source .env"
echo "       VITE_CLERK_PUBLISHABLE_KEY=\$VITE_CLERK_PUBLISHABLE_KEY \\"
echo "         BASE_PATH=/ pnpm --filter @workspace/hotel-system run build"
echo "       rsync -a artifacts/hotel-system/dist/public/ ."
echo ""
echo "  3. Restart API:"
echo "       pm2 restart grandpalace-api"
echo ""
echo "  4. Bật SSL trong WHM/cPanel → AutoSSL"
echo ""
echo -e "${RED}Lưu lại thông tin database ở nơi an toàn!${NC}"
echo "  DATABASE_URL=$DATABASE_URL"
echo ""
echo -e "${CYAN}Lệnh PM2 hữu ích:${NC}"
echo "  pm2 status                    — xem trạng thái"
echo "  pm2 logs grandpalace-api      — xem log"
echo "  pm2 restart grandpalace-api   — restart API"
