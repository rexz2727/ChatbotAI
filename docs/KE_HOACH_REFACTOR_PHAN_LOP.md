# Layered Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách `src/` của Chatbot CA Phường (đang Live) từ "fat file" sang kiến trúc phân lớp (routes → controllers → services → repositories), **giữ nguyên tuyệt đối hành vi**.

**Architecture:** Giữ `src/index.js` và `src/admin.js` làm **entrypoint mỏng** (bảo toàn path cho Docker `CMD`/`command`). Logic dời dần vào lớp con; mỗi file gốc trở thành **facade re-export** trong suốt quá trình, gỡ ở bước cuối. Mỗi task = 1 commit atomic, revert độc lập.

**Tech Stack:** Node.js 20, Express 4, Jest 30, SQLite3, ChromaDB, @google/generative-ai. Deploy: Podman + docker-compose, bind-mount `./src`, `./public`.

**Spec:** `docs/superpowers/specs/2026-07-30-layered-refactor-design.md`

## Global Constraints

- **Bất biến path:** `src/index.js` và `src/admin.js` PHẢI giữ nguyên đường dẫn (Dockerfile `CMD ["node","src/index.js"]`, compose `command: node src/admin.js`).
- **Không đụng:** `docker-compose.yml`, volume, path data (`chroma_data/`, `chromadb_data/`, `logs/`, `data/`), `Dockerfile`.
- **Bất biến vận hành phải giữ y nguyên:** `require('dns').setDefaultResultOrder('ipv4first')`, `app.set('trust proxy', 1)`, ghi `data/system.log` qua override `console`, graceful shutdown SIGTERM/SIGINT drain 8s, `WORKER_CONCURRENCY=3`, `pLimit(3)` trong chatbot, dòng log `[TIMING]`.
- **Facade = bất biến hành vi:** chỉ *di chuyển* code, KHÔNG sửa logic. Ý tưởng cải tiến → ghi backlog `## Ngoài phạm vi`, không trộn vào task.
- **Cổng test bắt buộc:** sau MỖI task `npm test` phải xanh **y hệt baseline** (ghi ở Task 0). Khác baseline = dừng, không đi tiếp.
- **Bảo mật không thoả hiệp:** giữ nguyên HMAC-SHA256 FB (`crypto.timingSafeEqual`, chặn sig ≠ 64 hex), MAC Zalo, admin token/khoá đăng nhập, honeypot quét attachment TRƯỚC xử lý, rate-limit. KHÔNG in secret ra log.
- **Branch:** `refactor/layered-architecture`. `main` giữ nguyên bản Live suốt quá trình.

---

## File Structure (đích)

```
src/
├── index.js                         # THIN entrypoint chatbot-app (giữ path)
├── admin.js                         # THIN entrypoint chatbot-admin (giữ path)
├── app.js                           # tạo & export Express app chính (không listen)
├── bootstrap/runtime.js             # dotenv, dns ipv4first, ensure data dir
├── bootstrap/logger.js              # override console.* → data/system.log
├── config/index.js                  # đọc ENV tập trung
├── routes/webhook.routes.js         # /webhook/facebook, /webhook/zalo
├── routes/pages.routes.js           # /, /health, /privacy
├── controllers/facebook.controller.js
├── controllers/zalo.controller.js
├── middlewares/facebookSignature.js
├── middlewares/zaloSignature.js
├── middlewares/rateLimiter.js
├── services/chatbot.service.js      # ← chatbot.js
├── services/honeypot.service.js     # ← honeypot.js
├── services/flow.service.js         # ← flow.js
├── services/queue.service.js        # ← queue worker từ index.js
├── services/messaging/facebook.js   # typing/split/post/sendFacebookResponse
├── services/messaging/zalo.js       # sendZaloResponse
├── repositories/*.js                # ← db.js (Task 9)
├── admin/app.js, admin/routes/, admin/controllers/, admin/middlewares/auth.js
├── domains/flows/*                  # ← src/flows
└── utils/
```
**Facade giữ lại (path cũ) đến Task 10:** `src/chatbot.js`, `src/db.js`, `src/honeypot.js`, `src/flow.js`, `src/flows/index.js`.

---

## Task 0: Baseline + bổ sung test lưới an toàn

**Files:**
- Create: `tests/webhook_facebook.test.js`, `tests/webhook_zalo.test.js`, `tests/pages.test.js`
- Test: chạy toàn bộ `tests/`

**Interfaces:**
- Consumes: `src/index.js` hiện tại (chưa export app → test hiện gọi được gì thì test nấy; phần webhook cần app export ⇒ xem lưu ý dưới).
- Produces: baseline snapshot + bộ test hành vi webhook/pages làm mốc so sánh cho mọi task sau.

> **Lưu ý phụ thuộc:** `index.js` hiện KHÔNG export app nên chưa supertest được trực tiếp. Task 0 chỉ viết test cho phần **có thể test không cần app** (ví dụ hàm `splitMessageText`, `isValidFacebookSignature` nếu tách được qua require, hoặc test mức đơn vị). Test webhook mức HTTP đầy đủ được kích hoạt **ngay sau Task 2** (khi có `app.js` export app). Task 0 tạo khung test + baseline; Task 2 điền các case HTTP. Ghi rõ case cần phủ dưới đây để Task 2 hoàn thiện.

- [ ] **Step 1: Chạy baseline & lưu kết quả**

Run: `npm test 2>&1 | tee /tmp/claude-1000/-home-chatbot-Projects-ChatbotAI/*/scratchpad/jest-baseline.txt`
Expected: ghi lại số suite/test PASS hiện tại (mốc so sánh). KHÔNG sửa gì nếu có test đỏ sẵn — ghi chú lại trạng thái đỏ để phân biệt với hồi quy do refactor.

- [ ] **Step 2: Viết test đơn vị cho hàm thuần trích được**

Tạo `tests/messaging_helpers.test.js` phủ `splitMessageText` (hiện nằm trong `index.js`):

```javascript
// Sẽ import lại từ services/messaging/facebook.js sau Task 3; tạm thời copy contract để chốt hành vi.
const { splitMessageText } = require('../src/services/messaging/facebook'); // path đích (Task 3)
describe('splitMessageText', () => {
  test('trả nguyên văn khi <= maxLen', () => {
    expect(splitMessageText('xin chào')).toEqual(['xin chào']);
  });
  test('chuỗi rỗng/null → mảng 1 phần tử rỗng', () => {
    expect(splitMessageText('')).toEqual(['']);
    expect(splitMessageText(null)).toEqual(['']);
  });
  test('cắt theo ranh giới, mỗi chunk <= 1990', () => {
    const long = ('đoạn văn. '.repeat(400)).trim();
    const chunks = splitMessageText(long);
    expect(chunks.every(c => c.length <= 1990)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, '')).toBe(long.replace(/\s+/g, ''));
  });
});
```

> Test này sẽ ĐỎ tới khi Task 3 tạo file — đánh dấu `test.skip` với TODO "bật lại ở Task 3", HOẶC xếp Task 0 tạo file này ở dạng skip. Chọn skip để baseline không đỏ giả.

- [ ] **Step 3: Ghi danh sách case HTTP cần phủ (checklist cho Task 2/5)**

Ghi vào đầu `tests/webhook_facebook.test.js` (dạng `describe.skip` khung rỗng): verify challenge GET (mode/token đúng→challenge, sai→403, thiếu→400); POST chữ ký sai→403; POST `object=page` đúng→200 `EVENT_RECEIVED` + enqueue; dedup theo `mid`; attachment honeypot gọi trước; location→payload `LOCATION_lat_long`. Tương tự `tests/webhook_zalo.test.js`: 4 `event_name` (`user_send_text`, `user_click_button`, `user_send_location`, `follow`) + chữ ký sai→403.

- [ ] **Step 4: Chạy lại test, xác nhận không đỏ giả**

Run: `npm test`
Expected: PASS y hệt baseline (các test chưa tới lượt để `skip`).

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test(refactor-0): baseline + khung test lưới an toàn webhook/pages/helpers"
```

---

## Task 1: Tách bootstrap (runtime + logger)

**Files:**
- Create: `src/bootstrap/runtime.js`, `src/bootstrap/logger.js`
- Modify: `src/index.js:1-45` (thay khối bootstrap bằng require)

**Interfaces:**
- Produces:
  - `runtime.js` → `module.exports = { dataDir }` và **side-effect**: `dotenv.config({override:true})`, `dns.setDefaultResultOrder('ipv4first')`, tạo `data/`.
  - `logger.js` → `module.exports = { installConsoleLogger }`; gọi 1 lần để override `console.log/error/warn` ghi `data/system.log`.

- [ ] **Step 1: Tạo `src/bootstrap/runtime.js`**

Chuyển nguyên văn dòng 1-15 của `index.js` (dotenv override, dns ipv4first, ensure dataDir) vào đây; export `dataDir`.

- [ ] **Step 2: Tạo `src/bootstrap/logger.js`**

Chuyển nguyên văn dòng 17-40 (writeSysLog + override 3 hàm console) vào hàm `installConsoleLogger(dataDir)`; export.

- [ ] **Step 3: Sửa `src/index.js` đầu file**

```javascript
const { dataDir } = require('./bootstrap/runtime');
require('./bootstrap/logger').installConsoleLogger(dataDir);
```
Xoá khối cũ đã dời. Giữ nguyên thứ tự: runtime TRƯỚC logger TRƯỚC mọi require khác.

- [ ] **Step 4: Chạy test + smoke**

Run: `npm test` → Expected: PASS = baseline.
Smoke: `node -e "require('./src/bootstrap/runtime'); require('./src/bootstrap/logger').installConsoleLogger('data'); console.log('ok')"` rồi kiểm `data/system.log` có dòng mới.

- [ ] **Step 5: Commit**

```bash
git add src/bootstrap src/index.js
git commit -m "refactor(1): tách bootstrap runtime + logger khỏi index.js"
```

---

## Task 2: `app.js` — tách app khỏi index.js (export, không listen)

**Files:**
- Create: `src/app.js`
- Modify: `src/index.js` (chuyển tạo-app/middleware/route vào app.js; index còn require+listen+queue)
- Test: bật các case HTTP ở `tests/webhook_facebook.test.js`, `tests/webhook_zalo.test.js`, `tests/pages.test.js` (dùng supertest trên app export)

**Interfaces:**
- Consumes: `runtime`, `logger` (Task 1).
- Produces: `src/app.js` → `module.exports = { app }` (Express app đã mount toàn bộ middleware + route hiện có, **chưa** listen). Các hàm webhook/send vẫn nằm tạm trong app.js (sẽ tách ở Task 3-6).

- [ ] **Step 1: Viết/bật test HTTP thất bại trước**

Trong `tests/pages.test.js`:
```javascript
const request = require('supertest');
const { app } = require('../src/app');
test('GET /health → ok', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
test('GET /webhook/facebook verify → challenge', async () => {
  process.env.FB_VERIFY_TOKEN = 'tok';
  const res = await request(app).get('/webhook/facebook')
    .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '123' });
  expect(res.status).toBe(200);
  expect(res.text).toBe('123');
});
```
Cài supertest nếu chưa có: kiểm `package.json` devDependencies; nếu thiếu → `npm i -D supertest` (KHÔNG đụng dependencies prod).

- [ ] **Step 2: Chạy test → FAIL** (`Cannot find module '../src/app'`).

- [ ] **Step 3: Tạo `src/app.js`**

Chuyển từ `index.js`: tạo `app`, `express.json` verify rawBody, static `/forms`, `trust proxy`, rate limiter, TẤT CẢ `app.get/post` (webhook FB, webhook Zalo, `/`, `/health`, `/privacy`) và các hàm helper webhook/send hiện có. Kết thúc bằng `module.exports = { app }`. **Không** gọi `app.listen`.

- [ ] **Step 4: Rút gọn `src/index.js`**

```javascript
const { dataDir } = require('./bootstrap/runtime');
require('./bootstrap/logger').installConsoleLogger(dataDir);
const { app } = require('./app');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Express webhook server is listening on ${HOST}:${PORT}`);
  startQueueWorker();
});
// queue worker + shutdown giữ nguyên tại index.js (sẽ tách ở Task 6)
```
Queue worker/shutdown tạm giữ ở index.js; chúng cần `chatbot`, `db`, và hàm send — import send từ `./app` (export thêm tạm) hoặc giữ trong index đến Task 6. Chọn: export tạm các hàm send từ app.js để index dùng, đánh dấu `// TEMP tới Task 6`.

- [ ] **Step 5: Chạy test → PASS**; smoke `curl` sau `node src/index.js` (port tạm) `GET /health`.

- [ ] **Step 6: Commit**

```bash
git add src/app.js src/index.js tests/ package.json package-lock.json
git commit -m "refactor(2): tách app.js (export app, không listen) + test HTTP webhook/pages"
```

---

## Task 3: Tách messaging (facebook/zalo send helpers)

**Files:**
- Create: `src/services/messaging/facebook.js`, `src/services/messaging/zalo.js`
- Modify: `src/app.js` (import từ messaging thay vì hàm nội bộ), `tests/messaging_helpers.test.js` (bỏ skip)

**Interfaces:**
- Produces:
  - `messaging/facebook.js` → `{ sendFacebookTypingOn(recipientId), splitMessageText(text, maxLen=1990), postToFacebook(url, recipientId, messageData), sendFacebookResponse(recipientId, result, req) }`
  - `messaging/zalo.js` → `{ sendZaloResponse(recipientId, result) }`

- [ ] **Step 1: Bỏ `skip` test `splitMessageText`** (Task 0 Step 2) → chạy → FAIL (module chưa có).
- [ ] **Step 2: Tạo `messaging/facebook.js`** — chuyển nguyên văn `sendFacebookTypingOn`, `splitMessageText`, `postToFacebook`, `sendFacebookResponse` từ app.js. Giữ nguyên logic retry/transient, split boundary, quickReplies, FB_SIMULATOR.
- [ ] **Step 3: Tạo `messaging/zalo.js`** — chuyển `sendZaloResponse`.
- [ ] **Step 4: Sửa app.js** import các hàm này; xoá bản gốc.
- [ ] **Step 5: Chạy test → PASS = baseline** (+ test split xanh).
- [ ] **Step 6: Commit**

```bash
git add src/services/messaging src/app.js tests/messaging_helpers.test.js
git commit -m "refactor(3): tách services/messaging facebook + zalo"
```

---

## Task 4: Tách middleware chữ ký + rate-limit

**Files:**
- Create: `src/middlewares/facebookSignature.js`, `src/middlewares/zaloSignature.js`, `src/middlewares/rateLimiter.js`
- Modify: `src/app.js`
- Test: `tests/signature.test.js`

**Interfaces:**
- Produces:
  - `facebookSignature.js` → `{ isValidFacebookSignature(req) }` (giữ nguyên: bypass khi placeholder secret + `console.warn`; `timingSafeEqual`; chặn sig ≠ 64 hex).
  - `zaloSignature.js` → `{ isValidZaloSignature(req) }`.
  - `rateLimiter.js` → `{ webhookLimiter }` (express-rate-limit cấu hình từ ENV).

- [ ] **Step 1: Viết `tests/signature.test.js`** (case bảo mật):
```javascript
const { isValidFacebookSignature } = require('../src/middlewares/facebookSignature');
test('thiếu secret → bypass true + cảnh báo', () => {
  delete process.env.FB_APP_SECRET;
  expect(isValidFacebookSignature({ headers: {}, rawBody: Buffer.from('x') })).toBe(true);
});
test('sig sai độ dài → false', () => {
  process.env.FB_APP_SECRET = 'real';
  expect(isValidFacebookSignature({ headers: {'x-hub-signature-256':'sha256=abc'}, rawBody: Buffer.from('x') })).toBe(false);
});
```
- [ ] **Step 2: Chạy → FAIL.**
- [ ] **Step 3: Tạo 3 file middleware** — chuyển nguyên văn `isValidFacebookSignature`, `isValidZaloSignature`, khối `webhookLimiter` từ app.js.
- [ ] **Step 4: Sửa app.js import; xoá bản gốc.**
- [ ] **Step 5: Chạy test → PASS = baseline + signature xanh.**
- [ ] **Step 6: Commit**
```bash
git add src/middlewares src/app.js tests/signature.test.js
git commit -m "refactor(4): tách middleware chữ ký FB/Zalo + rate-limiter"
```

---

## Task 5: Tách controller webhook + routes

**Files:**
- Create: `src/controllers/facebook.controller.js`, `src/controllers/zalo.controller.js`, `src/routes/webhook.routes.js`, `src/routes/pages.routes.js`
- Modify: `src/app.js` (chỉ còn mount routes + middleware app-level)

**Interfaces:**
- Consumes: messaging (Task 3), signature middleware (Task 4), `db`, `honeypot`.
- Produces:
  - `facebook.controller.js` → `{ verify(req,res), handleEvent(req,res) }`
  - `zalo.controller.js` → `{ handleEvent(req,res) }`
  - `webhook.routes.js` → Express Router mount `/webhook/facebook` (GET verify, POST handleEvent), `/webhook/zalo` (POST).
  - `pages.routes.js` → Router mount `/`, `/health`, `/privacy`.

- [ ] **Step 1: Bật các case HTTP còn `describe.skip`** trong `tests/webhook_facebook.test.js`, `tests/webhook_zalo.test.js` (dùng supertest + mock `db.enqueueMessage`, `honeypot.processAttachment`). Chạy → một số FAIL nếu handler chưa chuyển đúng.
- [ ] **Step 2: Tạo controllers** — chuyển nguyên văn thân handler `app.get('/webhook/facebook')`, `app.post('/webhook/facebook')`, `app.post('/webhook/zalo')` thành hàm controller. Giữ nguyên: trả 200 sớm, dedup `mid`, honeypot trước, audit raw log, rate-limit check.
- [ ] **Step 3: Tạo routes** mount controller + middleware chữ ký.
- [ ] **Step 4: Tạo `pages.routes.js`** — chuyển `/`, `/health`, `/privacy`.
- [ ] **Step 5: Rút gọn app.js** còn: express.json verify, static, trust proxy, `app.use(webhookRoutes)`, `app.use(pagesRoutes)`, export app.
- [ ] **Step 6: Chạy test → PASS = baseline.** Smoke: `POST /webhook/facebook` payload mẫu (FB_SIMULATOR) → 200, enqueue.
- [ ] **Step 7: Commit**
```bash
git add src/controllers src/routes src/app.js tests/
git commit -m "refactor(5): tách controller webhook + routes (webhook, pages)"
```

---

## Task 6: Tách queue worker

**Files:**
- Create: `src/services/queue.service.js`
- Modify: `src/index.js` (gọi `startQueueWorker`), export shutdown hook

**Interfaces:**
- Consumes: `chatbot.handleUserMessage`, messaging send, `db.dequeueMessage/completeMessage`.
- Produces: `queue.service.js` → `{ startQueueWorker(), shutdown(signal), processOne(msg) }`. Giữ nguyên `WORKER_CONCURRENCY=3`, `inFlightSenders` per-user ordering, timer 5s waiting message FB, dòng `[TIMING]`, graceful drain 8s.

- [ ] **Step 1: Viết `tests/queue.test.js` bổ sung** (nếu chưa phủ): mock db trả 1 msg → `processOne` gọi `chatbot.handleUserMessage` + send + `completeMessage` (kể cả khi handler throw vẫn `completeMessage`). Chạy → FAIL.
- [ ] **Step 2: Tạo `queue.service.js`** — chuyển nguyên văn `processOne`, `startQueueWorker`, `shutdown`, `inFlightSenders`, `shuttingDown` từ index.js. Inject dependencies (chatbot, db, sendFacebookResponse, sendZaloResponse, sendFacebookTypingOn) qua require trực tiếp module đích.
- [ ] **Step 3: Sửa index.js:**
```javascript
const { startQueueWorker, shutdown } = require('./services/queue.service');
const server = app.listen(PORT, HOST, () => { console.log(...); startQueueWorker(); });
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```
`shutdown` cần `server.close()` → truyền `server` vào (ví dụ `startQueueWorker({server})` hoặc set qua setter). Chốt: `queue.service.js` export `setServer(server)` gọi trước listen.
- [ ] **Step 4: Chạy test → PASS = baseline.** Smoke: chạy app, gửi payload, kiểm log `[Queue Worker]` + `[TIMING]` xuất hiện; gửi SIGTERM → log `[Shutdown]` drain.
- [ ] **Step 5: Commit**
```bash
git add src/services/queue.service.js src/index.js tests/queue.test.js
git commit -m "refactor(6): tách queue worker sang services/queue.service"
```

---

## Task 7: chatbot/honeypot/flow → services + flows → domains (facade)

**Files:**
- Create: `src/services/chatbot.service.js`, `src/services/honeypot.service.js`, `src/services/flow.service.js`, `src/domains/flows/*`
- Modify: `src/chatbot.js`, `src/honeypot.js`, `src/flow.js`, `src/flows/index.js` → **facade re-export**

**Interfaces:**
- Produces (giữ nguyên API cũ):
  - `chatbot.service.js` export `{ handleUserMessage, processUserMessage, ... }` (mọi export cũ của chatbot.js).
  - `honeypot.service.js` export `{ processAttachment, ... }`.
  - `flow.service.js` + `domains/flows/*` giữ export cũ.
  - Facade: `src/chatbot.js` = `module.exports = require('./services/chatbot.service')`; tương tự các file kia; `src/flows/index.js` = re-export `../domains/flows`.

- [ ] **Step 1: `git mv src/chatbot.js src/services/chatbot.service.js`** rồi tạo lại `src/chatbot.js` facade 1 dòng. Sửa require nội bộ trong chatbot.service (đường dẫn tương đối tới `./db` → `../db`, `./flow` → `./flow.service`, v.v.).
- [ ] **Step 2: Tương tự honeypot, flow.**
- [ ] **Step 3: `git mv src/flows src/domains/flows`**; tạo `src/flows/index.js` facade re-export `../domains/flows`.
- [ ] **Step 4: Chạy test → PASS = baseline** (`tests/chatbot.test.js`, `honeypot.test.js`, `flows.test.js` vẫn require path cũ qua facade).
- [ ] **Step 5: Commit**
```bash
git add -A src/chatbot.js src/honeypot.js src/flow.js src/services src/domains src/flows
git commit -m "refactor(7): chatbot/honeypot/flow → services; flows → domains (facade giữ path)"
```

---

## Task 8: Cụm admin

**Files:**
- Create: `src/admin/app.js`, `src/admin/routes/*.js`, `src/admin/controllers/*.js`, `src/admin/middlewares/auth.js`
- Modify: `src/admin.js` → thin entrypoint

**Interfaces:**
- Consumes: `db`, `multer`, os/podman socket (giữ nguyên).
- Produces:
  - `admin/app.js` → `{ app }` (express admin app, không listen). Giữ nguyên toàn bộ `/api/*` routes.
  - `admin/middlewares/auth.js` → `{ signToken, verifyToken, requireAuth, isLoginBlocked, recordLoginFailure, resetLoginFailures, ... }`.
  - `src/admin.js` (thin): `const { app } = require('./admin/app'); if (require.main===module) app.listen(3001,'0.0.0.0',...)`. **Giữ nguyên `require.main` guard và path `src/admin.js`.**

- [ ] **Step 1: Viết/mở rộng `tests/admin.test.js`** cho login lockout + token verify nếu chưa phủ; chạy để có mốc.
- [ ] **Step 2: Tạo `admin/middlewares/auth.js`** — chuyển `signToken/verifyToken/getClientIp/isLoginBlocked/recordLoginFailure/resetLoginFailures/loginRetryAfterSeconds` + hằng số từ admin.js.
- [ ] **Step 3: Tạo `admin/controllers/*` + `admin/routes/*`** — nhóm các `app.get/post('/api/...')` theo chủ đề (auth, stats, analytics, system, security, forms).
- [ ] **Step 4: Tạo `admin/app.js`** mount routes; export `{ app }` + re-export helpers để `tests/admin.test.js` (require `../src/admin`) vẫn thấy qua facade admin.js.
- [ ] **Step 5: Rút gọn `src/admin.js`** thành thin entrypoint + re-export helpers (giữ `module.exports` cũ cho test).
- [ ] **Step 6: Chạy test → PASS = baseline.** Smoke: `node src/admin.js` port tạm → `GET /api/health`, luồng `POST /api/login` → token.
- [ ] **Step 7: Commit**
```bash
git add src/admin src/admin.js tests/admin.test.js
git commit -m "refactor(8): tách cụm admin (app/routes/controllers/auth) giữ thin entrypoint"
```

---

## Task 9: db.js → repositories (cẩn trọng nhất)

**Files:**
- Create: `src/repositories/connection.js`, `src/repositories/message.repository.js`, `src/repositories/session.repository.js`, `src/repositories/cache.repository.js`, `src/repositories/queue.repository.js`, `src/repositories/security.repository.js`
- Modify: `src/db.js` → **facade gộp** giữ nguyên toàn bộ export cũ

**Interfaces:**
- Produces: mỗi repository export nhóm hàm tương ứng; `connection.js` export instance `db` (sqlite) dùng chung.
- Facade `src/db.js`:
```javascript
module.exports = {
  db: require('./repositories/connection').db,
  ...require('./repositories/message.repository'),   // saveMessage, getConversationHistory, isMessageProcessed, markMessageProcessed, getAllUsers
  ...require('./repositories/session.repository'),    // getSession, setSession
  ...require('./repositories/cache.repository'),      // getCachedResponse, setCachedResponse
  ...require('./repositories/queue.repository'),      // enqueueMessage, dequeueMessage, completeMessage, checkRateLimit
  ...require('./repositories/security.repository'),   // recordSecurityIncident, getSecurityIncidents, getSecurityIncidentSummary
};
```
Danh sách export PHẢI khớp 18 khoá hiện tại của `db.js`.

- [ ] **Step 1: Xác nhận danh sách export** — đối chiếu `module.exports` hiện tại của db.js (18 khoá). Ghi ra để chống thiếu.
- [ ] **Step 2: Tạo `connection.js`** giữ khởi tạo sqlite + `SQLITE_DB_PATH` y nguyên.
- [ ] **Step 3: Tạo từng repository** — chuyển hàm theo nhóm, sửa tham chiếu `db` → `require('./connection').db`.
- [ ] **Step 4: Viết `db.js` facade gộp** như trên.
- [ ] **Step 5: Chạy test → PASS = baseline** (`tests/db.test.js`, `queue.test.js` require `../src/db` qua facade). Kiểm đủ 18 export: `node -e "console.log(Object.keys(require('./src/db')).length)"` → 18.
- [ ] **Step 6: Commit**
```bash
git add src/repositories src/db.js
git commit -m "refactor(9): tách db.js → repositories (facade giữ 18 export)"
```

---

## Task 10: Gỡ facade + dọn import + full verify

**Files:**
- Modify: mọi file còn require path cũ (`./db`, `./chatbot`, `./honeypot`, `./flow`, `./flows`), test tương ứng
- Delete: `src/chatbot.js`, `src/honeypot.js`, `src/flow.js`, `src/flows/index.js` facade (giữ `src/db.js` nếu muốn 1 điểm gộp, hoặc gỡ luôn)

**Interfaces:**
- Consumes: toàn bộ module đích đã tạo Task 1-9.
- Produces: cây `src/` sạch, không facade thừa.

- [ ] **Step 1: Grep các require path cũ**
Run: `grep -rn "require('\./\(db\|chatbot\|honeypot\|flow\|flows\)" src/ tests/`
- [ ] **Step 2: Cập nhật từng require** trỏ thẳng module đích (ví dụ `require('./services/chatbot.service')`), gồm cả import trong test.
- [ ] **Step 3: Quyết định giữ/gỡ facade** — `src/db.js` có thể GIỮ như "barrel" repositories (tiện) hoặc gỡ. Chốt trong lúc thực thi; ghi lý do commit.
- [ ] **Step 4: Xoá file facade không còn ai require.**
- [ ] **Step 5: Full verify**
Run: `npm test` → PASS = baseline (không đỏ mới).
Kiểm altitude: `for f in $(git ls-files 'src/*.js'); do wc -l "$f"; done | sort -rn | head` → không file gốc >400 dòng (file mới cũng nên gọn).
Smoke toàn bộ: chạy `node src/index.js` + `node src/admin.js` (port tạm) → `/health`, verify challenge, `POST /webhook/facebook` mẫu, admin `/api/health` + login đều xanh.
- [ ] **Step 6: Rà 5 tiêu chí** (checklist ghi vào commit body): Mạnh (test xanh + facade bất biến) · Nhanh (`[TIMING]` không hồi quy, concurrency=3) · Bền (rollback per-commit, graceful shutdown còn) · Hiện đại (phân lớp rõ) · Bảo mật (chữ ký/auth/honeypot/rate-limit không đổi, không lộ secret).
- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "refactor(10): gỡ facade, dọn import, full verify + rà 5 tiêu chí"
```

---

## Hợp nhất & đưa lên Live (sau khi 10 task xanh)

- [ ] Full `npm test` xanh + smoke pass trên branch.
- [ ] Merge `refactor/layered-architecture` → `main` (chỉ khi mọi cổng đạt).
- [ ] Kích hoạt: `podman restart chatbot-app chatbot-admin` (hoặc chờ restart 3:00 sáng).
- [ ] Theo dõi `data/system.log` + 1 lượt chat thật; lỗi → `git revert` merge + restart để quay về ngay.

## Ngoài phạm vi (backlog — KHÔNG làm trong plan này)

- Dọn/gom thư mục data & sửa volume `docker-compose` (rủi ro ChromaDB — làm riêng, có backup).
- Mọi cải tiến logic/hiệu năng phát sinh trong lúc refactor.
