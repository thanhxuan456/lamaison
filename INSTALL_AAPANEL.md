# Hướng dẫn cài đặt trên aaPanel (BaoTa Panel)

> aaPanel hỗ trợ Node.js và PostgreSQL đầy đủ — đây là cách cài đặt dễ nhất trên VPS có aaPanel.

---

## Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|---|---|
| OS | Ubuntu 20.04+ / CentOS 7+ / Debian 10+ |
| RAM | 1 GB (khuyến nghị 2 GB+) |
| Disk | 10 GB trống |
| aaPanel | 7.x trở lên |

---

## Bước 1 — Cài đặt các thành phần từ aaPanel App Store

1. Đăng nhập vào aaPanel → **App Store**
2. Cài đặt theo thứ tự:
   - **Nginx** (phiên bản bất kỳ ≥ 1.20)
   - **PM2 Manager** (Node.js process manager — tìm "Node.js" trong App Store)
   - **PostgreSQL** (≥ 14, tìm trong App Store → Database)

---

## Bước 2 — Tạo Database PostgreSQL

1. aaPanel → **Database** → chọn tab **PostgreSQL**
2. Nhấn **Add Database**:
   - Database Name: `maisondeluxe_db`
   - Username: `maisondeluxe_user`
   - Password: đặt mật khẩu mạnh (ghi lại!)
   - Encoding: `UTF8`
3. Nhấn **Submit**
4. Ghi lại connection string:
   ```
   postgresql://maisondeluxe_user:YOUR_PASSWORD@127.0.0.1:5432/maisondeluxe_db
   ```

---

## Bước 3 — Upload source code

**Cách A — Upload ZIP:**
1. Nén toàn bộ project thành `.zip` (bỏ qua thư mục `node_modules`, `dist`, `.git`)
2. aaPanel → **File Manager** → vào `/www/wwwroot/`
3. Nhấn **Upload** → chọn file zip → **Extract** vào `/www/wwwroot/maisondeluxe/`

**Cách B — Clone từ Git:**
1. aaPanel → **Terminal** (hoặc SSH vào server)
2. Chạy:
   ```bash
   cd /www/wwwroot
   git clone https://github.com/youruser/maisondeluxe.git maisondeluxe
   ```

---

## Bước 4 — Thiết lập biến môi trường

1. SSH vào server hoặc dùng aaPanel Terminal
2. Tạo file `.env`:
   ```bash
   cd /www/wwwroot/maisondeluxe
   cp .env.example .env 2>/dev/null || touch .env
   nano .env
   ```
3. Nội dung file `.env`:
   ```env
   DATABASE_URL=postgresql://maisondeluxe_user:YOUR_PASSWORD@127.0.0.1:5432/maisondeluxe_db
   PORT=8080
   NODE_ENV=production

   # Lấy từ https://dashboard.clerk.com/last-active?path=api-keys
   CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
   CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx

   BASE_PATH=/
   ```

---

## Bước 5 — Cài đặt Node.js phiên bản phù hợp

1. aaPanel → **PM2 Manager** → **Node Version Manager**
2. Cài **Node.js 22 LTS** (hoặc 20 LTS nếu 22 không có)
3. Set làm phiên bản mặc định

---

## Bước 6 — Cài đặt dependencies và build

SSH vào server, chạy lần lượt:

```bash
# Cài pnpm nếu chưa có
npm install -g pnpm

# Di chuyển vào thư mục app
cd /www/wwwroot/maisondeluxe

# Cài đặt dependencies
pnpm install --frozen-lockfile

# Chạy migration database
source .env && pnpm --filter @workspace/db run push

# Build frontend
VITE_CLERK_PUBLISHABLE_KEY=$(grep VITE_CLERK_PUBLISHABLE_KEY .env | cut -d= -f2) \
  BASE_PATH=/ pnpm --filter @workspace/hotel-system run build

# Build API server
pnpm --filter @workspace/api-server run build
```

---

## Bước 7 — Chạy với PM2 (qua aaPanel)

**Cách A — Qua aaPanel PM2 Manager:**
1. aaPanel → **PM2 Manager** → **Add**
2. Điền thông tin:
   - Name: `maisondeluxe-api`
   - Script: `/www/wwwroot/maisondeluxe/artifacts/api-server/dist/index.mjs`
   - Working dir: `/www/wwwroot/maisondeluxe`
3. Nhấn **Save** → **Start**

**Cách B — Qua terminal:**
```bash
cd /www/wwwroot/maisondeluxe
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Bước 8 — Cấu hình Website (Nginx) trên aaPanel

1. aaPanel → **Website** → **Add site**
2. Điền:
   - Domain: `maisondeluxe.vn` (hoặc IP server nếu chưa có domain)
   - Document root: `/www/wwwroot/maisondeluxe/artifacts/hotel-system/dist/public`
   - PHP: **không chọn** (chọn **Pure Static** hoặc **Other**)
3. Nhấn **Submit**

4. Sau khi tạo, vào **Settings** của site → **Config** → thay toàn bộ nội dung bằng:

```nginx
server {
    listen 80;
    server_name maisondeluxe.vn www.maisondeluxe.vn;

    root /www/wwwroot/maisondeluxe/artifacts/hotel-system/dist/public;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    # API — proxy đến Express
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket live chat
    location /api/chat/ws/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 20M;
}
```

5. Nhấn **Save** → **Reload Nginx**

---

## Bước 9 — SSL miễn phí (Let's Encrypt)

1. aaPanel → **Website** → chọn site → **SSL**
2. Chọn tab **Let's Encrypt**
3. Nhập email → nhấn **Apply**
4. Bật **Force HTTPS** sau khi cấp thành công

---

## Kiểm tra

```bash
# Xem API có đang chạy không
pm2 status

# Xem log API
pm2 logs maisondeluxe-api

# Test API
curl http://localhost:8080/api/healthz
```

Truy cập `http://YOUR_DOMAIN` — website sẽ hiển thị trang chủ MAISON DELUXE.

---

## Cập nhật code sau này

```bash
cd /www/wwwroot/maisondeluxe
git pull                                      # nếu dùng git

pnpm install --frozen-lockfile                # nếu có thay đổi dependency
pnpm --filter @workspace/db run push          # nếu có thay đổi schema DB

# Rebuild
source .env
VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY BASE_PATH=/ \
  pnpm --filter @workspace/hotel-system run build
pnpm --filter @workspace/api-server run build

pm2 restart maisondeluxe-api
```
