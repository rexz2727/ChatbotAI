# Thiết kế: Refactor kiến trúc phân lớp (Layered Architecture)

- **Ngày:** 2026-07-30
- **Branch:** `refactor/layered-architecture`
- **Trạng thái:** Đã duyệt thiết kế — chờ bung kế hoạch thực thi (writing-plans)
- **Phạm vi:** Refactor toàn bộ `src/` sang kiến trúc phân lớp. KHÔNG đụng `docker-compose.yml`, volume, path data, Dockerfile `CMD`.

---

## 1. Bối cảnh & Mục tiêu

Dự án **Chatbot CA Phường** đang **Live trên Facebook**. Mã nguồn hiện là các "fat file":
`index.js` (747 dòng), `chatbot.js` (750), `admin.js` (505), `db.js` (451) — trộn lẫn routing,
business logic và data access → khó test, khó bảo trì, dễ vỡ khi sửa.

**Mục tiêu:** Tách thành kiến trúc phân lớp (routes → controllers → services → repositories),
**giữ nguyên tuyệt đối hành vi**, an toàn cho bản Live, tuân thủ 5 tiêu chí:
**Mạnh · Nhanh · Bền · Hiện đại · Tuyệt đối Bảo mật**.

## 2. Ràng buộc quan trọng (bất biến)

1. **2 entrypoint, 2 container:** `src/index.js` (`chatbot-app`, qua Dockerfile `CMD`) và
   `src/admin.js` (`chatbot-admin`, qua `command: node src/admin.js`).
   → **Đường dẫn `src/index.js` và `src/admin.js` PHẢI giữ nguyên**, nếu không container không khởi động.
2. **Bind-mount:** `./src:/app/src` và `./public:/app/public` mount vào cả 2 container.
   Code chỉ áp dụng sau `podman restart` (hoặc restart tự động 3:00 sáng).
3. **`db.js` dùng chung** bởi cả 2 entrypoint → tách phải cẩn trọng nhất, luôn có facade.
4. **Không đụng** volume/path data (`chroma_data/`, `chromadb_data/`, `logs/`, `data/`),
   `docker-compose.yml`, Dockerfile.
5. **Bất biến vận hành phải giữ:** `dns ipv4first`, `trust proxy`, ghi `system.log`,
   graceful shutdown (SIGTERM drain 8s), `WORKER_CONCURRENCY=3`, `pLimit(3)`, dòng log `[TIMING]`.

## 3. Kiến trúc đích

`src/index.js` và `src/admin.js` trở thành **entrypoint mỏng**; logic dời vào các lớp con:

```
src/
├── index.js         # THIN: require bootstrap + tạo app + listen + khởi động queue
├── admin.js         # THIN: require adminApp + listen (giữ path cho container admin)
├── app.js           # tạo & trả về Express app CHÍNH (KHÔNG listen) → test được
│
├── bootstrap/
│   ├── runtime.js       # dotenv, dns ipv4first, ensure data dir
│   └── logger.js        # override console.log/error/warn → system.log
├── config/
│   └── index.js         # đọc & validate ENV (PORT, HOST, rate-limit, FB/Zalo token)
│
├── routes/
│   ├── webhook.routes.js    # /webhook/facebook, /webhook/zalo
│   └── pages.routes.js      # /, /health, /privacy
├── controllers/
│   ├── facebook.controller.js
│   └── zalo.controller.js
├── middlewares/
│   ├── facebookSignature.js
│   ├── zaloSignature.js
│   └── rateLimiter.js
│
├── services/
│   ├── chatbot.service.js    # ← chatbot.js
│   ├── honeypot.service.js   # ← honeypot.js
│   ├── flow.service.js       # ← flow.js
│   ├── queue.service.js      # ← queue worker (processOne/startQueueWorker/shutdown)
│   └── messaging/
│       ├── facebook.js       # sendTypingOn, splitMessageText, postToFacebook, sendFacebookResponse
│       └── zalo.js           # sendZaloResponse
├── repositories/             # (tách từ db.js — Bước 9, có facade)
│
├── admin/                    # cụm admin (độc lập, container riêng)
│   ├── app.js
│   ├── routes/
│   ├── controllers/
│   └── middlewares/auth.js
│
├── domains/flows/            # ← src/flows (giữ nguyên nội dung)
└── utils/
```

**Luồng request:** Middleware → Route → Controller → Service → Repository → DB. Một chiều, không đi ngược.

## 4. Chiến lược facade (giữ hành vi không đổi)

Mỗi bước dời code sang module mới, file cũ (`chatbot.js`, `db.js`, `honeypot.js`, `flow.js`,
`flows/index.js`) **giữ nguyên path** và chỉ còn `module.exports = require('./services/...')`.
→ Mọi `require` cũ và mọi test hiện có **vẫn chạy** ở từng bước.
Gỡ facade + cập nhật import nội bộ trong **1 bước riêng ở cuối** (Bước 10).

## 5. Thứ tự các bước (rủi ro thấp → cao; mỗi bước = 1 commit atomic, revert độc lập)

| Bước | Nội dung | Ghi chú an toàn |
|------|----------|-----------------|
| 0 | Branch + baseline `jest` xanh; **bổ sung test còn thiếu TRƯỚC khi tách** | Lưới an toàn trước di chuyển |
| 1 | Tách `bootstrap/runtime.js` + `bootstrap/logger.js` khỏi đầu `index.js` | Không đụng route/logic |
| 2 | `app.js` tách khỏi `index.js` (export app, không listen) | `admin.js` đã theo pattern này |
| 3 | `services/messaging/facebook.js` + `zalo.js` (hàm send/typing/split/post) | Hàm thuần |
| 4 | Middleware `facebookSignature`, `zaloSignature`, `rateLimiter` | Logic biệt lập |
| 5 | Controller webhook FB/Zalo + `routes/webhook.routes.js` + `pages.routes.js` | Controller chỉ điều phối |
| 6 | `services/queue.service.js` (processOne/startQueueWorker/shutdown) | Giữ concurrency=3, graceful shutdown |
| 7 | `chatbot.js`/`honeypot.js`/`flow.js` → `services/`; `src/flows` → `domains/flows` | Facade giữ require cũ |
| 8 | Cụm admin: `admin.js` thin + `admin/app.js` + routes/controllers/`auth.js` | Container riêng, độc lập |
| 9 | `db.js` → `repositories/` (message/session/cache/security/queue); `db.js` = facade gộp | **Cẩn trọng nhất** |
| 10 | Gỡ facade + cập nhật import nội bộ & test; full `jest` | Bước cuối |

## 6. Kiểm thử, Xác minh & Rollback

### 6.1 Lưới an toàn (Mạnh + Bền)
- **Cổng bắt buộc:** sau mỗi bước `npm test` phải xanh **y hệt baseline**. Khác = dừng.
- **Bổ sung test ở Bước 0** cho phần chưa phủ: webhook FB (chữ ký hợp lệ/sai, dedup theo `mid`,
  tách attachment/location, split >2000 ký tự), webhook Zalo (4 `event_name`), `/health`·`/`·`/privacy`.
- **Facade = bất biến hành vi:** chỉ *di chuyển* code, KHÔNG sửa logic. Ý tưởng cải tiến → ghi "việc sau".

### 6.2 Xác minh hành vi thật (Nhanh + Hiện đại)
- **Smoke-test cục bộ** cuối các bước lớn (2, 5, 6, 8): chạy app port tạm, gọi thật
  `GET /health`, verify challenge `GET /webhook/facebook`, `POST /webhook/facebook` (FB_SIMULATOR),
  `POST /webhook/zalo`, admin `GET /api/health` + login.
- **Đối chiếu hiệu năng:** giữ `WORKER_CONCURRENCY=3`, `pLimit(3)`, dòng `[TIMING]`;
  so mẫu `[TIMING]` trước/sau Bước 6 để chắc không hồi quy độ trễ RAG.

### 6.3 Tuyệt đối Bảo mật (không thoả hiệp)
- **Chữ ký webhook:** HMAC-SHA256 FB (`timingSafeEqual`, chặn sig ≠ 64-hex), MAC Zalo — giữ nguyên,
  test cả nhánh *bypass khi thiếu secret* (phải log cảnh báo).
- **Admin auth:** token HMAC, khoá đăng nhập (`LOGIN_MAX_FAILURES`, global), `SESSION_TTL` — không đổi.
- **Honeypot:** quét attachment độc hại **trước** xử lý — giữ đúng thứ tự gọi.
- **Không lộ bí mật:** không hardcode token; `config/` đọc ENV nhưng KHÔNG in secret ra log;
  `.env` gitignore, chỉ commit `.env.example`.
- **Rate-limit + `trust proxy`:** giữ nguyên cấu hình.

### 6.4 Rollback (Bền)
- Làm trên branch; **main giữ nguyên bản Live** suốt quá trình.
- Mỗi bước 1 commit atomic, revert độc lập (nhờ facade).
- **Chỉ merge khi:** full `jest` xanh + smoke-test pass + rà 5 tiêu chí.
- **Kích hoạt Live:** merge xong `podman restart chatbot-app chatbot-admin` (hoặc chờ 3:00);
  lỗi → `git revert` + restart là quay về ngay.

## 7. Definition of Done

Cấu trúc phân lớp đầy đủ · mọi facade đã gỡ · full test xanh · smoke-test pass ·
không file `src/*.js` gốc nào >400 dòng · 5 tiêu chí được rà & ghi nhận · Live chạy ổn sau restart.

## 8. Ngoài phạm vi (việc sau)

- Dọn/gom thư mục data & sửa volume `docker-compose` (rủi ro ChromaDB — làm riêng, có backup).
- Mọi cải tiến logic/hiệu năng phát sinh trong lúc refactor → gom vào backlog, không trộn vào bước dời code.
