# Chatbot AI Công an Phường

Hệ thống Chatbot tự động hỗ trợ giải đáp thủ tục hành chính và pháp luật cho người dân trên các nền tảng mạng xã hội (Facebook Messenger, Zalo). Hệ thống được trang bị Trí tuệ nhân tạo (AI) kết hợp công nghệ RAG (Retrieval-Augmented Generation) để trả lời chính xác, an toàn và luôn có dẫn chứng pháp lý rõ ràng.

## 🌟 Tính năng chính

- **Giải đáp thủ tục hành chính**: Cư trú, Căn cước, Giao thông, An ninh trật tự, PCCC, Ngoại kiều, Tố giác/Khiếu nại.
- **Tư vấn pháp luật tự động**: Sử dụng mô hình AI và Vector Database để tra cứu, phân tích và trích dẫn trực tiếp các điều khoản từ văn bản pháp luật hiện hành.
- **Menu thông minh (Quick Replies)**: Hướng dẫn người dân thao tác nhanh chóng, tránh gõ phím nhiều.
- **Danh bạ cán bộ phân quyền**: Cung cấp đường dây nóng và số điện thoại của cán bộ phụ trách theo đúng ngữ cảnh lĩnh vực người dân đang hỏi.
- **Bảo mật & Chống tấn công**: Tích hợp cơ chế Rate Limiting, Honeypot phát hiện tấn công, và mã hóa thông tin cá nhân (PII) trong log.
- **Quản lý ngữ cảnh**: Duy trì mạch hội thoại của người dùng xuyên suốt thông qua SQLite.

## 🛠 Công nghệ sử dụng

- **Ngôn ngữ & Framework**: Node.js, Express.js
- **Trí tuệ nhân tạo**: Google Gemini API
- **Cơ sở dữ liệu Vector**: ChromaDB
- **Quản lý Session**: SQLite
- **Triển khai**: PM2 (Cluster Mode với 8 workers), Cloudflare Tunnel
- **Tích hợp**: Facebook Graph API (Webhook)

## 🚀 Hướng dẫn cài đặt (Môi trường phát triển)

### 1. Yêu cầu hệ thống
- Node.js (v18 trở lên)
- PM2 (Cài đặt toàn cục qua `npm install -g pm2`)
- Cloudflared (Nếu cần chạy Webhook nội bộ)

### 2. Cài đặt thư viện
```bash
git clone https://github.com/rexz2727/ChatbotAI.git
cd ChatbotAI
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc và cung cấp các khóa API cần thiết:
```env
GEMINI_API_KEY=your_gemini_api_key
FB_PAGE_ACCESS_TOKEN=your_fb_access_token
FB_VERIFY_TOKEN=your_fb_verify_token
FB_APP_SECRET=your_fb_app_secret
PORT=3000
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### 4. Nạp dữ liệu pháp luật (Vector Search)
Hệ thống cần nạp các tệp PDF luật từ `docs/legal_pdfs/` vào ChromaDB trước khi có thể trả lời câu hỏi:
```bash
npm run init-db
```

### 5. Khởi chạy hệ thống (Production)
```bash
# Khởi chạy ứng dụng với PM2
pm2 start src/index.js -i 8 --name "CA_Phuong_Chatbot"

# Khởi chạy Webhook Tunnel
pm2 start tools/cloudflared --name "cloudflare_tunnel" -- tunnel run chatbot-tunnel

# Lưu cấu hình PM2
pm2 save
```

## 🔒 Quy chuẩn cốt lõi (Agent Rules)
- **Quy tắc 3b (Chống ảo giác AI)**: Tuyệt đối không tự bịa điều luật. Chỉ được trích dẫn Điều/Khoản, Nghị định khi nội dung đó thực sự tồn tại trong tài liệu tham chiếu (Database).
- **Phân tách trách nhiệm**: Mọi file code đều đảm nhiệm đúng một vai trò duy nhất (`chatbot.js` cho luồng AI, `flow.js` cho kịch bản tĩnh, `index.js` cho Webhook).

---
*Dự án phục vụ mục tiêu cải cách thủ tục hành chính, xây dựng Công an Phường điển hình, kiểu mẫu về an ninh trật tự và văn minh đô thị.*
