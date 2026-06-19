# KẾ HOẠCH TRIỂN KHAI CHATBOT AI TRÊN DEBIAN MINIMAL (NO GUI)

Tài liệu này hướng dẫn từng bước thiết lập bản demo Chatbot AI phục vụ Facebook/Zalo, tối ưu hóa tối đa tài nguyên bằng việc sử dụng Debian Minimal (No GUI).

---

## GIAI ĐOẠN 1: THIẾT LẬP MÁY ẢO HYPER-V & CÀI ĐẶT DEBIAN MINIMAL

1. **Chuẩn bị file cài đặt:**
   - Tải file ISO của **Debian Netinst** từ trang chủ Debian (khoảng 300MB-400MB).

2. **Tạo máy ảo trên Hyper-V:**
   - Mở Hyper-V Manager -> Chọn **New** -> **Virtual Machine...**
   - Đặt tên máy ảo (VD: `Chatbot_Debian`), lưu vào **ổ D**.
   - Chọn **Generation 2** (hoặc Gen 1 đều được).
   - **RAM:** Gán `4096` MB (4GB) hoặc 8GB tùy ý. Bỏ chọn "Dynamic Memory".
   - **Mạng (Network):** Chọn card mạng đang có Internet (thường là Default Switch).
   - **Ổ cứng ảo:** 30GB - 50GB.
   - **Installation Options:** Chọn cài từ file ISO Debian Netinst vừa tải.
   - Chuột phải vào máy ảo vừa tạo -> **Settings** -> **Processor** -> Cấp **2 đến 4 nhân CPU**.

3. **Cài đặt Hệ điều hành (Mấu chốt để "No GUI"):**
   - Khởi động máy ảo, chọn "Install" hoặc "Graphical Install" (chỉ là giao diện cài đặt, không phải HĐH đồ họa).
   - Khai báo mật khẩu `root` và tạo một user mới (VD: tên là `chatbot`).
   - Đến bước **Software selection** (Chọn phần mềm cài đặt): **BỎ TÍCH** mục "Debian desktop environment" và "GNOME/XFCE...". Chỉ tích chọn **"SSH server"** và **"Standard system utilities"**.
   - Hoàn tất cài đặt và khởi động lại. Máy ảo sẽ chỉ hiện màn hình đen dòng lệnh đăng nhập.

---

## GIAI ĐOẠN 2: THIẾT LẬP MÔI TRƯỜNG LÕI (TRÊN GIAO DIỆN TERMINAL)

Đăng nhập vào máy ảo bằng user `root` (hoặc user bạn tạo có quyền sudo) để cài các công cụ cần thiết.

**1. Cài các công cụ cơ bản:**
```bash
apt update && apt upgrade -y
apt install -y curl wget git nano sudo
```

**2. Cài đặt Node.js (Bản LTS) & PM2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
npm install pm2 -g
```

**3. Cài đặt Python 3 (Thường Debian 12 đã có sẵn Python 3.11):**
```bash
apt install -y python3 python3-pip python3-venv
```

---

## GIAI ĐOẠN 3: TRIỂN KHAI MÃ NGUỒN (OPENCLAW + CHROMADB)

**1. Đưa mã nguồn vào máy ảo:**
Bạn có thể dùng lệnh `git clone` để kéo mã nguồn từ Github, hoặc dùng SFTP (như FileZilla) để chép file từ máy thật Windows vào máy ảo thông qua IP của máy ảo.
```bash
# Ví dụ lấy code bằng git
git clone <link-github-cua-du-an>
cd <thu-muc-du-an>
```

**2. Cài đặt thư viện của mã nguồn:**
```bash
npm install
```

**3. Khởi tạo Cơ sở dữ liệu Luật (ChromaDB):**
- Đảm bảo bạn đã chép các file `.txt` văn bản luật vào đúng thư mục cấu hình của mã nguồn.
- Chạy lệnh nạp dữ liệu:
```bash
node init_db.js
```
*(Lưu ý: Thay `init_db.js` bằng tên file nạp dữ liệu thực tế trong dự án của bạn).*

**4. Thiết lập file .env:**
```bash
nano .env
```
Dán các thông số sau vào (Ctrl+O để lưu, Ctrl+X để thoát):
```env
GEMINI_API_KEY=key_lay_tu_aistudio.google.com
ZALO_ACCESS_TOKEN=token_zalo
FB_PAGE_ACCESS_TOKEN=token_facebook
FB_VERIFY_TOKEN=ma_tu_chon_de_xac_minh
```

---

## GIAI ĐOẠN 4: THIẾT LẬP CLOUDFLARE TUNNEL QUA CLI

Vì chúng ta không có giao diện đồ họa, Tunnel sẽ được chạy trực tiếp qua dòng lệnh.

**1. Tải và cài Cloudflared:**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb
```

**2. Mở đường hầm (Giả sử Chatbot chạy ở cổng 3000):**
Mở một phiên terminal mới (nếu dùng SSH) hoặc đẩy nó chạy ngầm. Để nhanh nhất phục vụ demo:
```bash
cloudflared tunnel --url http://localhost:3000
```
Màn hình sẽ in ra đường link có dạng `https://<chuỗi-ngẫu-nhiên>.trycloudflare.com`. **Hãy ghi chú lại đường link này.**

---

## GIAI ĐOẠN 5: CHẠY HỆ THỐNG VÀ ĐẤU NỐI WEBHOOK

**1. Chạy mã nguồn bằng PM2:**
Mở một tab terminal khác, di chuyển vào thư mục code và gõ:
```bash
pm2 start index.js --name "Chatbot_CA"
pm2 save
pm2 startup
```

**2. Thiết lập Webhook trên Facebook/Zalo:**
Trở về máy thật Windows của bạn (mở trình duyệt Chrome/Edge):
- Truy cập trình quản lý ứng dụng Facebook (Meta for Developers) hoặc Zalo.
- Tìm đến phần thiết lập **Webhook**.
- Dán đường link `https://<chuỗi-ngẫu-nhiên>.trycloudflare.com/webhook/...` vào.
- Nhập Verify Token trùng khớp với file `.env`.
- Nhấn xác nhận.

**3. Test Demo:**
Mở ứng dụng Messenger hoặc Zalo trên điện thoại, nhắn tin thẳng vào Fanpage/OA vừa kết nối. Chờ 2-4 giây để xem Chatbot AI (Gemini) truy xuất luật từ ChromaDB và trả lời!

Chúc bạn thao tác thành công trên giao diện dòng lệnh của Debian! Hẹn gặp lại bạn khi bắt tay vào cấu hình bên trong máy ảo.
