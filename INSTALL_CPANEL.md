# Hướng dẫn cài đặt trên cPanel

> **Lưu ý quan trọng:** cPanel truyền thống dùng MySQL/MariaDB. Grand Palace dùng **PostgreSQL**. Bạn cần một trong hai phương án:
> - **A (Khuyến nghị):** Dùng PostgreSQL bên ngoài (ví dụ: Supabase, Neon, Aiven — đều có free tier)
> - **B:** Yêu cầu host cài thêm PostgreSQL (nhiều VPS cPanel cho phép)
>
> Nếu host của bạn hỗ trợ VPS với cPanel + SSH root, hãy dùng `install.sh` thay thế — đơn giản hơn nhiều.

---

## Phương án A — PostgreSQL cloud (dễ nhất, hoạt động trên mọi cPanel host)

### 1. Tạo database PostgreSQL miễn phí trên Supabase

1. Đăng ký tại [supabase.com](https://supabase.com) (free)
2. Tạo project mới → chọn region gần nhất (Singapore)
3. Vào **Settings** → **Database** → copy **Connection string** (URI mode):
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres
   ```
4. Lưu lại — đây là `DATABASE_URL`

**Hoặc dùng [neon.tech](https://neon.tech) (cũng free):**
1. Đăng ký → tạo project → copy connection string

---

### 2. Thiết lập Node.js App trên cPanel

1. Đăng nhập cPanel → tìm **Setup Node.js App** (thường trong phần Software)
2. Nhấn **Create Application**:
   - **Node.js version:** chọn 20 hoặc 22 (tùy host cung cấp)
   - **Application mode:** Production
   - **Application root:** `grandpalace` (tạo thư mục mới)
   - **Application URL:** chọn domain hoặc subdomain
   - **Application startup file:** `artifacts/api-server/dist/index.mjs`
3. Nhấn **Create**
4. Ghi lại **virtual environment path** (ví dụ: `/home/username/nodevenv/grandpalace/...`)

---

### 3. Upload source code

**Cách A — Upload ZIP qua File Manager:**
1. Nén project (bỏ `node_modules`, `dist`, `.git`) → tạo `grandpalace.zip`
2. cPanel → **File Manager** → vào `/home/username/grandpalace/`
3. Upload → Extract

**Cách B — qua SSH (nếu host hỗ trợ):**
```bash
cd ~/grandpalace
git clone https://github.com/youruser/grandpalace.git .
```

---

### 4. Tạo file .env

Qua cPanel File Manager hoặc SSH, tạo file `.env` trong thư mục app:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
PORT=3000
NODE_ENV=production

# Từ https://dashboard.clerk.com/last-active?path=api-keys
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx

BASE_PATH=/
```

> **Lưu ý PORT:** cPanel Node.js App tự động gán port — xem trong giao diện Setup Node.js App, thường là `300x`. Đặt PORT cho đúng.

---

### 5. Cài đặt dependencies

1. cPanel → **Setup Node.js App** → chọn app → **Run NPM Install**
   - Hoặc SSH: `cd ~/grandpalace && npm install -g pnpm && pnpm install`

2. Chạy migration database qua SSH:
   ```bash
   cd ~/grandpalace
   source .env
   npx drizzle-kit push --config=lib/db/drizzle.config.ts
   ```
   > Nếu không có SSH, bạn có thể dùng Supabase dashboard → SQL Editor để chạy migration thủ công

---

### 6. Build project

Qua SSH:
```bash
cd ~/grandpalace

# Build frontend
VITE_CLERK_PUBLISHABLE_KEY=$(grep VITE_CLERK_PUBLISHABLE_KEY .env | cut -d= -f2) \
  BASE_PATH=/ npx pnpm --filter @workspace/hotel-system run build

# Build API
npx pnpm --filter @workspace/api-server run build
```

---

### 7. Cấu hình .htaccess cho frontend (nếu serve static)

Nếu bạn serve frontend qua public_html (static files):

1. Copy nội dung `artifacts/hotel-system/dist/public/` vào `public_html/` (hoặc subdomain folder)
2. Tạo file `.htaccess` trong đó:

```apache
Options -MultiViews
RewriteEngine On

# API proxy — yêu cầu mod_proxy được bật
RewriteRule ^api/(.*)$ http://localhost:PORT/api/$1 [P,L]

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

> **Lưu ý:** `mod_proxy` cần được host bật. Nếu không có, bạn cần Node.js App phục vụ cả frontend (xem bước 8).

---

### 8. Serve frontend từ Node.js App (không cần mod_proxy)

Thêm đoạn sau vào API server để serve static files. Mở `artifacts/api-server/src/app.ts`, thêm sau phần routes:

```typescript
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticPath = path.resolve(__dirname, "../../../hotel-system/dist/public");

// Serve static frontend
app.use(express.static(staticPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});
```

Sau đó build lại API: `pnpm --filter @workspace/api-server run build`

---

### 9. Khởi động app

1. cPanel → **Setup Node.js App** → chọn app → **Restart**
2. Truy cập URL của app để kiểm tra

---

## Phương án B — PostgreSQL cài trực tiếp (VPS cPanel với SSH root)

Nếu bạn có quyền root SSH trên VPS cPanel:

```bash
# Cài PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib  # Ubuntu/Debian
# hoặc
sudo yum install -y postgresql postgresql-server       # CentOS/RHEL

# Khởi tạo và start
sudo postgresql-setup initdb  # CentOS only
sudo systemctl enable --now postgresql

# Tạo database
sudo -u postgres psql << SQL
CREATE USER grandpalace_user WITH ENCRYPTED PASSWORD 'your_strong_password';
CREATE DATABASE grandpalace_db OWNER grandpalace_user;
GRANT ALL PRIVILEGES ON DATABASE grandpalace_db TO grandpalace_user;
SQL
```

Sau đó dùng `DATABASE_URL=postgresql://grandpalace_user:your_strong_password@localhost:5432/grandpalace_db` trong file `.env`.

---

## Kiểm tra và debug

```bash
# Xem log app
~/.pm2/logs/grandpalace-api-out.log   # nếu dùng PM2
# hoặc qua cPanel → Logs → Error log

# Test API
curl http://YOUR_DOMAIN/api/healthz

# Restart app
# cPanel → Setup Node.js App → Restart
# hoặc: pm2 restart grandpalace-api
```

---

## Cập nhật code

```bash
# Upload file mới qua File Manager hoặc git pull

# Rebuild
cd ~/grandpalace
source .env
VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY BASE_PATH=/ \
  pnpm --filter @workspace/hotel-system run build
pnpm --filter @workspace/api-server run build

# Restart qua cPanel UI hoặc SSH:
pm2 restart grandpalace-api
```

---

## So sánh phương án

| | aaPanel | cPanel + SSH | cPanel Shared |
|---|---|---|---|
| PostgreSQL | Trực tiếp | Trực tiếp | Cloud (Supabase) |
| Khó khăn | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Chi phí | VPS từ ~$5/tháng | VPS từ ~$10/tháng | Shared ~$3–8/tháng |
| **Khuyến nghị** | ✅ Tốt nhất | ✅ Được | ⚠️ Hạn chế |

**Khuyến nghị:** Dùng **aaPanel trên VPS** cho trải nghiệm tốt nhất. Chi phí VPS Ubuntu 1GB RAM từ $5/tháng tại Vultr, DigitalOcean, hoặc Akamai.
