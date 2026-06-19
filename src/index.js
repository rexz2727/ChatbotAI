require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const chatbot = require('./chatbot');
const honeypot = require('./honeypot');
const { isMessageProcessed, markMessageProcessed } = require('./db');

const app = express();
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

app.post('/webhook/*', webhookLimiter);

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
      const rawLogsDir = path.join(process.cwd(), 'data', 'raw_logs');
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
        } else if (webhookEvent.postback) {
          payload = webhookEvent.postback.payload;
        }

        if (messageText || payload) {
          const result = await chatbot.handleUserMessage(senderId, messageText, payload);
          await sendFacebookResponse(senderId, result);

          // Mark message as processed after successful handling
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

// Facebook Send API Helper
async function sendFacebookResponse(recipientId, result) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;
  
  let messageData = {};
  if (result.quickReplies && result.quickReplies.length > 0) {
    messageData = {
      text: result.text,
      quick_replies: result.quickReplies.map(r => ({
        content_type: "text",
        title: r.title,
        payload: r.payload
      }))
    };
  } else if (result.showMenu) {
    messageData = {
      text: result.text,
      quick_replies: [
        { content_type: "text", title: "Cư trú",        payload: "MENU_CU_TRU" },
        { content_type: "text", title: "Căn cước",       payload: "MENU_CAN_CUOC" },
        { content_type: "text", title: "Giao thông",     payload: "MENU_GIAO_THONG" },
        { content_type: "text", title: "An ninh & PCCC", payload: "MENU_AN_NINH" },
        { content_type: "text", title: "Ngoại kiều",     payload: "MENU_NGOAI_KIEU" },
        { content_type: "text", title: "Khiếu nại",      payload: "MENU_KHIEU_NAI" }
      ]
    };
  } else {
    messageData = { text: result.text };
  }

  try {
    const isPlaceholderToken = !process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN === 'your_fb_page_access_token_here';
    if (isPlaceholderToken) {
      console.log(`[FB SIMULATOR] Sent response to user ${recipientId}:`, messageData);
      return;
    }

    await axios.post(url, {
      recipient: { id: recipientId },
      message: messageData
    });
    console.log(`Facebook message sent to ${recipientId}`);
  } catch (error) {
    console.error('Error sending Facebook message:', error.response ? error.response.data : error.message);
  }
}

// 3. Webhook Event Handler for Zalo OA
app.post('/webhook/zalo', async (req, res) => {
  try {
    const body = req.body;
    
    // Audit Logging: Ghi lưu dạng raw toàn bộ webhook payload (Zalo)
    try {
      const rawLogsDir = path.join(process.cwd(), 'data', 'raw_logs');
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
      
      const result = await chatbot.handleUserMessage(senderId, messageText, null);
      await sendZaloResponse(senderId, result);
    } 
    else if (body.event_name === 'user_click_button') {
      const senderId = body.sender.id;
      const payload = body.message.payload;
      
      const result = await chatbot.handleUserMessage(senderId, null, payload);
      await sendZaloResponse(senderId, result);
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
                { title: "Giao thông", type: "oa.query.show", payload: "MENU_GIAO_THONG" }
              ]
            }, {
              media_type: "image",
              url: "https://example.com/logo.png",
              buttons: [
                { title: "An ninh", type: "oa.query.show", payload: "MENU_AN_NINH" },
                { title: "Ngoại kiều", type: "oa.query.show", payload: "MENU_NGOAI_KIEU" },
                { title: "Khiếu nại", type: "oa.query.show", payload: "MENU_KHIEU_NAI" }
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

    await axios.post(url, messageData, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ZALO_ACCESS_TOKEN
      }
    });
    console.log(`Zalo message sent to ${recipientId}`);
  } catch (error) {
    console.error('Error sending Zalo message:', error.response ? error.response.data : error.message);
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
});
