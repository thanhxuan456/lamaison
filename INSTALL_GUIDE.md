# Hướng dẫn cài đặt MAISON DELUXE Hotels lên Windows Server

Script `install.ps1` sẽ tự động cài đặt toàn bộ hệ thống lên 1 Windows Server, bao gồm:
Node.js, pnpm, nginx, Windows Services (NSSM), firewall, và SSL Let's Encrypt cho `maisondeluxehotel.com`.

---

## 1. Yêu cầu trước khi chạy

### 1.1. Máy chủ (VPS / Dedicated)
| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| OS | Windows Server 2019 (build 17763+) | Windows Server 2022 |
| RAM | 2 GB | 4 GB |
| Ổ đĩa C: | 10 GB trống | 20 GB trống |
| Quyền | Tài khoản Administrator | — |
| Mạng | Mở port 80 + 443 ra Internet | — |

### 1.2. Tên miền & DNS (BẮT BUỘC để có SSL)
Trước khi chạy script, vào trang quản lý tên miền (Cloudflare / Mắt Bão / GoDaddy…) và tạo:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `<IP công cộng của Windows Server>` | Auto |
| A | `www` | `<IP công cộng của Windows Server>` | Auto |

Nếu dùng **Cloudflare**: bật trạng thái **DNS Only** (đám mây màu xám), KHÔNG bật proxy (đám mây cam) khi xin SSL lần đầu — sau khi xong có thể bật lại.

Kiểm tra DNS đã trỏ đúng:
```powershell
nslookup maisondeluxehotel.com
nslookup www.maisondeluxehotel.com
```
Cả hai phải trả về đúng IP server, nếu không win-acme sẽ thất bại.

### 1.3. Firewall của nhà cung cấp VPS
Vào Cloud Panel (Vultr / DigitalOcean / Azure / AWS Security Group…) mở:
- TCP **80** (HTTP — ACME challenge + redirect)
- TCP **443** (HTTPS)
- TCP **3389** (RDP — để bạn remote vào)

### 1.4. File source code
Chuẩn bị toàn bộ source code của project (đã clone từ Git hoặc copy từ Replit). Đặt thư mục dự án ở bất kỳ đâu, ví dụ `C:\Source\maisondeluxe`. File `install.ps1` PHẢI nằm cùng thư mục với `package.json` của repo.

---

## 2. Chạy script

### 2.1. Mở PowerShell với quyền Administrator
1. Bấm `Start` → gõ `PowerShell`
2. Click chuột phải → **Run as Administrator**
3. Chấp nhận UAC

### 2.2. Di chuyển vào thư mục source
```powershell
cd C:\Source\maisondeluxe
```

### 2.3. Chạy lệnh chính (cài đầy đủ + SSL)
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Quá trình sẽ chạy 12 bước, mỗi bước có log màu trên console. Tổng thời gian khoảng **8–15 phút** tùy tốc độ mạng (chủ yếu chờ tải Node.js, nginx, win-acme và `pnpm install`).

---

## 3. Các tham số tùy chọn

| Tham số | Khi nào dùng |
|---|---|
| (không có) | **Lần đầu cài** — đầy đủ build + SSL |
| `-SkipBuild` | Đã build trước rồi, chỉ muốn cập nhật cấu hình nginx / service |
| `-SkipSsl` | Demo / test trên IP hoặc DNS chưa trỏ — chạy HTTP-only port 80 |
| `-Reinstall` | Cài lại từ đầu, ép nâng cấp Node / nginx / xóa source cũ |
| `-Uninstall` | Gỡ toàn bộ services + firewall rule (hỏi xác nhận trước khi xóa thư mục) |

### Ví dụ
```powershell
# Cài demo HTTP-only (chưa có SSL)
powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipSsl

# Update code: pull source mới về cùng thư mục, rồi:
powershell -ExecutionPolicy Bypass -File .\install.ps1

# Sửa nginx.conf nhanh, không cần build lại frontend:
powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipBuild

# Gỡ sạch:
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall
```

---

## 4. Cấu trúc sau khi cài xong

```
C:\MaisonDeluxe\
├── app\                    ← source code đã copy + node_modules + dist
├── nginx\                  ← nginx.exe + nginx.conf
├── ssl\                    ← maisondeluxehotel.com-chain.pem + -key.pem
├── acme-challenge\         ← webroot cho Let's Encrypt gia hạn
└── logs\
    ├── MaisonDeluxeAPI-out.log
    ├── MaisonDeluxeAPI-err.log
    └── nginx\access.log + error.log
```

Có 2 Windows Service tự khởi động cùng máy:
- `MaisonDeluxeAPI` — Node.js API (port nội bộ 8080)
- `MaisonDeluxeNginx` — nginx reverse proxy (port 80 + 443)

---

## 5. Các lệnh quản trị thường dùng

### Khởi động lại service
```powershell
Restart-Service MaisonDeluxeAPI
Restart-Service MaisonDeluxeNginx
```

### Xem trạng thái
```powershell
Get-Service MaisonDeluxe*
```

### Xem log realtime
```powershell
# API log
Get-Content C:\MaisonDeluxe\logs\MaisonDeluxeAPI-out.log -Wait -Tail 50

# nginx access
Get-Content C:\MaisonDeluxe\logs\nginx\access.log -Wait -Tail 50

# nginx error
Get-Content C:\MaisonDeluxe\logs\nginx\error.log -Wait -Tail 50
```

### Test API
```powershell
Invoke-WebRequest http://127.0.0.1:8080/api/healthz -UseBasicParsing
Invoke-WebRequest https://maisondeluxehotel.com/api/healthz -UseBasicParsing
```

---

## 6. Cập nhật code mới

Khi có phiên bản mới:
1. RDP vào server.
2. Pull source mới về thư mục source ban đầu (vd `C:\Source\maisondeluxe`):
   ```powershell
   cd C:\Source\maisondeluxe
   git pull
   ```
3. Chạy lại installer (sẽ tự copy source mới + rebuild + restart service):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```

Cấu hình SSL không bị mất vì cert được lưu riêng trong `C:\MaisonDeluxe\ssl\`.

---

## 7. Xử lý sự cố

### 7.1. Lỗi "DNS chưa trỏ" / win-acme thất bại
```
Khong xin duoc SSL (exit X)
```
**Cách sửa:**
- Kiểm tra `nslookup maisondeluxehotel.com` đã trỏ đúng IP chưa.
- Đợi 5–30 phút sau khi đổi DNS (TTL).
- Tắt Cloudflare proxy (đám mây cam → xám).
- Kiểm tra firewall VPS đã mở port 80.
- Sau khi sửa, chạy lại:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipBuild
  ```

### 7.2. Service không start
```powershell
# Xem log lỗi
Get-Content C:\MaisonDeluxe\logs\MaisonDeluxeAPI-err.log -Tail 30

# Kiểm tra port có bị chiếm không
netstat -ano | findstr ":8080"
netstat -ano | findstr ":80"
netstat -ano | findstr ":443"
```
Nếu IIS đang dùng port 80/443 → tắt: `Stop-Service W3SVC -Force; Set-Service W3SVC -StartupType Disabled`.

### 7.3. Let's Encrypt rate limit
Mỗi domain chỉ được tối đa 5 cert/tuần. Nếu test nhiều lần bị chặn:
- Đợi đến tuần sau, hoặc
- Dùng staging trước (sửa `wacs.exe` chạy với `--baseuri https://acme-staging-v02.api.letsencrypt.org/`).

### 7.4. Frontend hiển thị trang nginx mặc định
- Kiểm tra `dir C:\MaisonDeluxe\app\artifacts\hotel-system\dist` có file `index.html` không.
- Nếu không, build lại: `cd C:\MaisonDeluxe\app; pnpm --filter @workspace/hotel-system run build`.

### 7.5. WebSocket live chat không kết nối
- Kiểm tra block `location /api/chat/ws/` trong `C:\MaisonDeluxe\nginx\conf\nginx.conf` có headers `Upgrade` + `Connection "upgrade"`.
- Restart nginx: `Restart-Service MaisonDeluxeNginx`.

---

## 8. Gia hạn SSL

`win-acme` tự tạo Scheduled Task gia hạn cert trước hạn 30 ngày. Kiểm tra:
```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like "*win-acme*" }
```

**Lưu ý:** Sau khi cert được gia hạn, nginx **không tự reload**. Đặt lịch chạy mỗi tháng:
```powershell
# Tạo task restart nginx hàng tháng
schtasks /Create /SC MONTHLY /D 1 /TN "MaisonDeluxe-NginxReload" /TR "powershell.exe -Command Restart-Service MaisonDeluxeNginx" /RU SYSTEM /F
```

---

## 9. Sau khi cài đặt xong

Truy cập:
- 🌐 Frontend: **https://maisondeluxehotel.com**
- 📊 Admin: **https://maisondeluxehotel.com/admin** (đăng nhập Clerk)
- ❤️ Health: **https://maisondeluxehotel.com/api/healthz**

Vào Admin → **Tích Hợp** để cấu hình:
- **Hóa đơn / Hóa đơn điện tử** — mẫu, logo, MST
- **Mạng Xã Hội** — link Zalo / Facebook / Hotline cho nút chat nổi
- **Đăng Bài Tự Động** — token Facebook Page, Instagram, Threads, Google Business, Zalo OA để tự đẩy blog post

Vào **Trò Chuyện** để admin trực live chat (presence sẽ broadcast cho khách thấy "Tư vấn viên đang trực").

---

## 10. Backup & Bảo trì định kỳ

- **Database (Neon)**: Neon đã có Point-in-Time Recovery 7 ngày sẵn trên gói free, không cần backup thủ công.
- **SSL cert**: Backup thư mục `C:\MaisonDeluxe\ssl\` để khôi phục nhanh khi cài lại.
- **Logs**: Xóa log cũ định kỳ:
  ```powershell
  Get-ChildItem C:\MaisonDeluxe\logs -Recurse -Include *.log |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
  ```

---

Mọi thắc mắc kỹ thuật, gửi log đầy đủ:
- File transcript cài đặt: `%TEMP%\MaisonDeluxe_<timestamp>.log`
- Log API: `C:\MaisonDeluxe\logs\MaisonDeluxeAPI-err.log`
- Log nginx: `C:\MaisonDeluxe\logs\nginx\error.log`
