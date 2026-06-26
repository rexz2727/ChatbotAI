require('dotenv').config({ override: true });
const express = require('express');
// Using native fetch instead of axios
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// graph.facebook.com (and generativelanguage) return both AAAA + A records, but IPv6 egress
// is unreachable in this rootless/pasta netns (ENETUNREACH). undici's verbatim DNS order then
// lands on the dead IPv6 path ~half the time -> intermittent "fetch failed". Prefer IPv4.
require('dns').setDefaultResultOrder('ipv4first');

// Đảm bảo thư mục data tồn tại
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Setup System Logger
const sysLogFile = path.join(dataDir, 'system.log');
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function writeSysLog(level, ...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  fs.appendFileSync(sysLogFile, line);
}

console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  writeSysLog('INFO', ...args);
};
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  writeSysLog('ERROR', ...args);
};
console.warn = function(...args) {
  originalConsoleWarn.apply(console, args);
  writeSysLog('WARN', ...args);
};

const rateLimit = require('express-rate-limit');
const chatbot = require('./chatbot');
const honeypot = require('./honeypot');
const db = require('./db');
const { isMessageProcessed, markMessageProcessed } = db;

const app = express();
app.use('/forms', express.static(path.join(__dirname, '../data/forms')));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Rate Limiter for all webhook routes
const windowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 60000;
const maxLimit = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 60;

// Trust proxy is required when running behind Localtunnel/Cloudflare
app.set('trust proxy', 1);

const webhookLimiter = rateLimit({
  windowMs: isNaN(windowMs) ? 60000 : windowMs,
  max: isNaN(maxLimit) ? 60 : maxLimit,
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// app.post('/webhook/*', webhookLimiter);

// Facebook Webhook Signature Verification
function isValidFacebookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.FB_APP_SECRET;

  // If FB_APP_SECRET is not configured (placeholder), skip verification (dev/test mode)
  const isPlaceholderSecret = !appSecret || appSecret === 'your_fb_app_secret_here' || appSecret.trim() === '';
  if (isPlaceholderSecret) {
    console.warn('[SECURITY WARNING] FB_APP_SECRET is not configured. Webhook signature validation bypassed.');
    return true;
  }

  if (!signature) {
    return false;
  }

  if (!req.rawBody) {
    return false;
  }

  if (!signature.startsWith('sha256=')) {
    return false;
  }
  const signatureHash = signature.slice('sha256='.length);
  // HMAC-SHA256 hex digest is always 64 characters; reject malformed/truncated signatures
  if (signatureHash.length !== 64) return false;

  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signatureHash, 'hex');
  const expBuf = Buffer.from(expectedHash, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// 1. Webhook Verification for Facebook Messenger
app.get('/webhook/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      console.log('Facebook Webhook Verified.');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 2. Webhook Event Handler for Facebook Messenger
app.post('/webhook/facebook', async (req, res) => {
  try {
    // Verify the request is genuinely from Facebook
    if (!isValidFacebookSignature(req)) {
      console.warn('Unauthorized webhook request: invalid Facebook signature.');
      return res.status(403).send('Invalid signature');
    }

    const body = req.body;
    console.log('Received FB Webhook:', JSON.stringify(body));

    // Audit Logging: Ghi lưu dạng raw toàn bộ webhook payload
    try {
      const rawLogsDir = path.join(process.cwd(), 'data', 'logs', 'raw_logs');
      if (!fs.existsSync(rawLogsDir)) {
        fs.mkdirSync(rawLogsDir, { recursive: true });
      }
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(rawLogsDir, `webhook_${today}.log`);
      const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(body)}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      console.error('Error writing raw audit log:', err);
    }

    if (body.object === 'page') {
      // Trả về 200 OK ngay lập tức để tránh Facebook bị timeout và gửi lại webhook (lặp tin nhắn)
      res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        if (!entry.messaging) continue;
        const webhookEvent = entry.messaging[0];
        if (!webhookEvent) continue;

        const senderId = webhookEvent.sender.id;
        
        if (webhookEvent.message && webhookEvent.message.attachments) {
          for (let att of webhookEvent.message.attachments) {
            if (att.payload && att.payload.url) {
              const result = await honeypot.processAttachment(att.payload.url, senderId, 'facebook');
              if (result.status === 'malicious') {
                console.warn(`[HONEYPOT] Blocked malicious attachment from ${senderId}`);
                continue; // Bỏ qua xử lý attachment này, đừng return để không ngắt vòng lặp entry
              }
            }
          }
        }

        // Deduplication: skip messages already processed (Facebook retry loop prevention)
        if (webhookEvent.message && webhookEvent.message.mid) {
          const mid = webhookEvent.message.mid;
          try {
            const alreadyProcessed = await isMessageProcessed(mid);
            if (alreadyProcessed) {
              console.log(`[DEDUP] Skipping already-processed message mid: ${mid}`);
              continue;
            }
          } catch (dedupErr) {
            console.error('[DEDUP] Error checking processed_messages, proceeding anyway:', dedupErr);
          }
        }

        let messageText = null;
        let payload = null;

        if (webhookEvent.message) {
          messageText = webhookEvent.message.text;
          if (webhookEvent.message.quick_reply) {
            payload = webhookEvent.message.quick_reply.payload;
          }
          if (!messageText && !payload && webhookEvent.message.attachments) {
            messageText = '[Gửi đính kèm/Sticker]';
          }
        } else if (webhookEvent.postback) {
          payload = webhookEvent.postback.payload;
        }

        if (messageText || payload) {
          const isAllowed = await db.checkRateLimit(senderId);
          if (!isAllowed) {
            console.log(`[Rate Limit] Blocked user ${senderId}`);
            // return res.sendStatus(429);
            continue;
          }
          
          // Send typing indicator immediately
          sendFacebookTypingOn(senderId).catch(err => console.error("Typing Error:", err.message));
          
          // Enqueue message
          await db.enqueueMessage('facebook', senderId, messageText, payload);

          // Mark message as processed after enqueuing
          if (webhookEvent.message && webhookEvent.message.mid) {
            try {
              await markMessageProcessed(webhookEvent.message.mid);
            } catch (markErr) {
              console.error('[DEDUP] Error marking message as processed:', markErr);
            }
          }
        }
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error handling Facebook webhook event:', error);
    res.sendStatus(500);
  }
});

// Facebook Typing Indicator
async function sendFacebookTypingOn(recipientId) {
  const isPlaceholderToken = !process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN === 'your_fb_page_access_token_here';
  if (isPlaceholderToken) return;
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" })
  });
  if (!response.ok) throw new Error(await response.text());
}

// Facebook Send API Helper
// Facebook hard-limits message.text to 2000 chars; longer replies are rejected with error #100.
// Split on the nearest paragraph/sentence/word boundary so chunks read naturally.
function splitMessageText(text, maxLen = 1990) {
  if (!text || text.length <= maxLen) return [text || ''];
  const chunks = [];
  let rest = text;
  while (rest.length > maxLen) {
    const slice = rest.slice(0, maxLen);
    let cut = slice.lastIndexOf('\n\n');
    if (cut < maxLen * 0.5) cut = slice.lastIndexOf('\n');
    if (cut < maxLen * 0.5) cut = slice.lastIndexOf('. ');
    if (cut < maxLen * 0.5) cut = slice.lastIndexOf(' ');
    if (cut <= 0) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function postToFacebook(url, recipientId, messageData) {
  const body = JSON.stringify({ recipient: { id: recipientId }, message: messageData });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!response.ok) {
        // Graph API HTTP error (e.g. #100): not transient, surface it without retrying.
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      return;
    } catch (error) {
      const code = String(error.cause?.code || '');
      const transient = error.message.startsWith('fetch failed') ||
        /ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EAI_AGAIN|UND_ERR/.test(code);
      if (!transient || attempt === 3) throw error;
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
}

async function sendFacebookResponse(recipientId, result, req) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;

  let attachment = null;
  let text = '';
  let quickReplies = null;

  if (result.isFile) {
    let fileUrl = result.fileUrl;
    if (req && fileUrl.startsWith('/')) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      fileUrl = `${protocol}://${host}${fileUrl}`;
    }
    attachment = { type: "file", payload: { url: fileUrl, is_reusable: true } };
  } else if (result.quickReplies && result.quickReplies.length > 0) {
    text = result.text + '\n(Không thấy nút? Gõ: ' +
      result.quickReplies.map(r => r.title).join(' · ') + ')';
    quickReplies = result.quickReplies.map(r => ({
      content_type: "text", title: r.title, payload: r.payload
    }));
  } else if (result.showMenu) {
    text = result.text;
    quickReplies = [
      { content_type: "text", title: "Cư trú",        payload: "MENU_CU_TRU" },
      { content_type: "text", title: "Căn cước",       payload: "MENU_CAN_CUOC" },
      { content_type: "text", title: "Giao thông",     payload: "MENU_GIAO_THONG" },
      { content_type: "text", title: "An ninh & PCCC", payload: "MENU_AN_NINH" },
      { content_type: "text", title: "Ngoại kiều",     payload: "MENU_NGOAI_KIEU" },
      { content_type: "text", title: "Khiếu nại",      payload: "MENU_KHIEU_NAI" },
      { content_type: "text", title: "Liên hệ cơ quan", payload: "FLOW_LIEN_HE" },
      { content_type: "text", title: "Góp ý Hệ thống", payload: "MENU_GOP_Y" }
    ];
  } else {
    text = result.text;
  }

  try {
    const isPlaceholderToken = !process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN === 'your_fb_page_access_token_here';
    if (isPlaceholderToken) {
      console.log(`[FB SIMULATOR] Sent response to user ${recipientId}:`, attachment || { text, quickReplies });
      return;
    }

    if (attachment) {
      await postToFacebook(url, recipientId, { attachment });
    } else {
      // Quick replies ride on the LAST chunk only, so the rating buttons appear at the end.
      const chunks = splitMessageText(text);
      for (let i = 0; i < chunks.length; i++) {
        const messageData = { text: chunks[i] };
        if (quickReplies && i === chunks.length - 1) messageData.quick_replies = quickReplies;
        await postToFacebook(url, recipientId, messageData);
      }
    }
    console.log(`Facebook message sent to ${recipientId}`);
  } catch (error) {
    console.error('Error sending Facebook message:', error.message);
  }
}

// Zalo Webhook Signature Verification
function isValidZaloSignature(req) {
  const signature = req.headers['x-zevent-signature'];
  const appId = process.env.ZALO_APP_ID;
  const secretKey = process.env.ZALO_OA_SECRET_KEY;
  const timestamp = req.headers['x-zevent-timestamp'];

  if (!appId || !secretKey || appId === 'your_zalo_app_id_here') {
    console.warn('[SECURITY WARNING] ZALO_APP_ID/SECRET not configured. Bypassing Zalo signature validation.');
    return true;
  }

  if (!signature || !timestamp || !req.rawBody) return false;

  const dataString = req.rawBody.toString('utf8');
  // mac = sha256(appId + data + timeStamp + OAsecretKey)
  const stringToHash = appId + dataString + timestamp + secretKey;
  
  const expectedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
  
  return signature === expectedHash;
}

// 3. Webhook Event Handler for Zalo OA
app.post('/webhook/zalo', async (req, res) => {
  try {
    if (!isValidZaloSignature(req)) {
      console.warn('Unauthorized webhook request: invalid Zalo signature.');
      return res.status(403).send('Invalid signature');
    }

    const body = req.body;
    
    // Audit Logging: Ghi lưu dạng raw toàn bộ webhook payload (Zalo)
    try {
      const rawLogsDir = path.join(process.cwd(), 'data', 'logs', 'raw_logs');
      if (!fs.existsSync(rawLogsDir)) {
        fs.mkdirSync(rawLogsDir, { recursive: true });
      }
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(rawLogsDir, `webhook_${today}.log`);
      const logEntry = `[${new Date().toISOString()}] [ZALO] ${JSON.stringify(body)}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      console.error('Error writing raw audit log:', err);
    }
    
    // Trả về 200 OK ngay lập tức để tránh Zalo bị timeout và gửi lại webhook
    res.status(200).send({ status: 'success' });

    if (body.event_name === 'user_send_text' || body.event_name === 'user_send_link') {
      const senderId = body.sender.id;
      const messageText = body.message.text;
      
      const isAllowed = await db.checkRateLimit(senderId);
      if (!isAllowed) {
        console.log(`[Rate Limit] Blocked user ${senderId}`);
        // return res.sendStatus(429);
        return;
      }
      
      await db.enqueueMessage('zalo', senderId, messageText, null);
    } 
    else if (body.event_name === 'user_click_button') {
      const senderId = body.sender.id;
      const payload = body.message.payload;
      
      const isAllowed = await db.checkRateLimit(senderId);
      if (!isAllowed) {
        console.log(`[Rate Limit] Blocked user ${senderId}`);
        // return res.sendStatus(429);
        return;
      }
      
      await db.enqueueMessage('zalo', senderId, null, payload);
    }
    else if (body.event_name === 'follow') {
      const senderId = body.sender.id || body.follower.id;
      const isAllowed = await db.checkRateLimit(senderId);
      if (!isAllowed) {
        console.log(`[Rate Limit] Blocked user ${senderId}`);
        // return res.sendStatus(429);
        return;
      }
      await db.enqueueMessage('zalo', senderId, null, 'GET_STARTED');
    }
  } catch (error) {
    console.error('Error handling Zalo webhook event:', error);
    res.sendStatus(500);
  }
});

// Zalo Send API Helper
async function sendZaloResponse(recipientId, result) {
  const url = 'https://openapi.zalo.me/v3.0/oa/message/transaction';
  
  let messageData = {};
  if (result.showMenu) {
    messageData = {
      recipient: { user_id: recipientId },
      message: {
        text: result.text,
        attachment: {
          type: "template",
          payload: {
            template_type: "media",
            elements: [{
              media_type: "image",
              url: "https://example.com/logo.png",
              buttons: [
                { title: "Cư trú", type: "oa.query.show", payload: "MENU_CU_TRU" },
                { title: "Căn cước", type: "oa.query.show", payload: "MENU_CAN_CUOC" },
                { title: "Giao thông", type: "oa.query.show", payload: "MENU_GIAO_THONG" },
                { title: "Góp ý Hệ thống", type: "oa.query.show", payload: "MENU_GOP_Y" }
              ]
            }, {
              media_type: "image",
              url: "https://example.com/logo.png",
              buttons: [
                { title: "An ninh", type: "oa.query.show", payload: "MENU_AN_NINH" },
                { title: "Ngoại kiều", type: "oa.query.show", payload: "MENU_NGOAI_KIEU" },
                { title: "Khiếu nại", type: "oa.query.show", payload: "MENU_KHIEU_NAI" },
                { title: "Liên hệ cơ quan", type: "oa.query.show", payload: "FLOW_LIEN_HE" }
              ]
            }]
          }
        }
      }
    };
  } else {
    messageData = {
      recipient: { user_id: recipientId },
      message: { text: result.text }
    };
  }

  try {
    const isPlaceholderToken = !process.env.ZALO_ACCESS_TOKEN || process.env.ZALO_ACCESS_TOKEN === 'your_zalo_access_token_here';
    if (isPlaceholderToken) {
      console.log(`[ZALO SIMULATOR] Sent response to user ${recipientId}:`, messageData);
      return;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ZALO_ACCESS_TOKEN
      },
      body: JSON.stringify(messageData)
    });
    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errData}`);
    }
    console.log(`Zalo message sent to ${recipientId}`);
  } catch (error) {
    console.error('Error sending Zalo message:', error.message);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Privacy Policy (required for Facebook App Live Mode)
app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chính sách quyền riêng tư – Chatbot Công an Phường</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.7; }
  h1 { color: #003087; border-bottom: 2px solid #003087; padding-bottom: 10px; }
  h2 { color: #003087; margin-top: 30px; }
  p { margin: 10px 0; }
</style>
</head>
<body>
<h1>Chính sách quyền riêng tư</h1>
<p><strong>Chatbot hỗ trợ thủ tục hành chính – Công an Phường</strong></p>
<p>Cập nhật lần cuối: ${new Date().toLocaleDateString('vi-VN')}</p>

<h2>1. Thông tin chúng tôi thu thập</h2>
<p>Khi người dùng tương tác với chatbot qua Facebook Messenger, chúng tôi chỉ thu thập:</p>
<ul>
  <li>ID người dùng Facebook (dạng mã số, không phải tên thật)</li>
  <li>Nội dung tin nhắn gửi đến chatbot</li>
  <li>Thời gian tương tác</li>
</ul>

<h2>2. Mục đích sử dụng</h2>
<p>Thông tin được sử dụng duy nhất để:</p>
<ul>
  <li>Trả lời các câu hỏi về thủ tục hành chính công an phường</li>
  <li>Duy trì ngữ cảnh hội thoại trong phiên làm việc</li>
  <li>Cải thiện chất lượng phản hồi của chatbot</li>
</ul>

<h2>3. Không chia sẻ thông tin</h2>
<p>Chúng tôi <strong>không</strong> chia sẻ, bán, hoặc chuyển giao thông tin cá nhân của người dùng cho bất kỳ bên thứ ba nào, ngoại trừ yêu cầu bắt buộc theo quy định pháp luật.</p>

<h2>4. Bảo mật dữ liệu</h2>
<p>Toàn bộ dữ liệu được lưu trữ trên máy chủ nội bộ, được bảo vệ bằng mã hóa và chỉ nhân viên được ủy quyền mới có quyền truy cập.</p>

<h2>5. Lưu trữ và xóa dữ liệu</h2>
<p>Lịch sử hội thoại được lưu tối đa 30 ngày. Người dùng có thể yêu cầu xóa dữ liệu bằng cách liên hệ trực tiếp với Công an Phường.</p>

<h2>6. Liên hệ</h2>
<p>Mọi thắc mắc về chính sách quyền riêng tư, vui lòng liên hệ trực tiếp tại trụ sở Công an Phường hoặc qua trang Facebook chính thức.</p>
</body>
</html>`);
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Express webhook server is listening on ${HOST}:${PORT}`);
  startQueueWorker();
});

// Queue Worker — bounded concurrency. Matches geminiLimit pLimit(3) in chatbot.js
// so we never push more than 3 messages onto the model at once.
const WORKER_CONCURRENCY = 3;

// Process one message end-to-end. On any error we still completeMessage so the
// row is not left stuck in 'processing' forever (preserves prior fire-and-forget
// behavior: a failed message is dropped, never retried/duplicated).
async function processOne(msg) {
  try {
    console.log(`[Queue Worker] Processing message ID: ${msg.id} for ${msg.platform} user ${msg.sender_id}`);

    // Simulate req object for relative URL parsing if needed
    const dummyReq = {
      protocol: 'https',
      get: () => process.env.PUBLIC_URL || 'trycloudflare.com', // fallback
      headers: {}
    };

    const result = await chatbot.handleUserMessage(msg.sender_id, msg.message_text, msg.payload);

    if (msg.platform === 'facebook') {
      await sendFacebookResponse(msg.sender_id, result, dummyReq);
    } else if (msg.platform === 'zalo') {
      await sendZaloResponse(msg.sender_id, result);
    }
  } catch (err) {
    console.error(`[Queue Worker] Error processing message ID ${msg.id}:`, err);
  } finally {
    try {
      await db.completeMessage(msg.id);
    } catch (completeErr) {
      console.error(`[Queue Worker] Error completing message ID ${msg.id}:`, completeErr);
    }
  }
}

async function startQueueWorker() {
  console.log('[Queue Worker] Started and listening for messages...');
  const inFlightSenders = new Set();

  while (true) {
    try {
      if (inFlightSenders.size >= WORKER_CONCURRENCY) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }

      // Exclude senders already in-flight to preserve per-user ordering.
      const msg = await db.dequeueMessage([...inFlightSenders]);
      if (!msg) {
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      inFlightSenders.add(msg.sender_id);
      // Fire-and-forget: do NOT await, so up to WORKER_CONCURRENCY run in parallel.
      processOne(msg).finally(() => inFlightSenders.delete(msg.sender_id));

    } catch (err) {
      console.error('[Queue Worker] Error in dequeue loop:', err);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Backoff on error
    }
  }
}
