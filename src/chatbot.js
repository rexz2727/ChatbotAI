require('dotenv').config({ override: true });
const db = require('./db');
const flow = require('./flow');
const donvi = require('../config/donvi');

// Lời chào dùng tên đơn vị + số trực ban từ config/donvi.js (dữ liệu riêng đơn vị)
const WELCOME_TEXT = `[Chatbot Auto] Chào anh/chị ạ! Đây là trang Facebook chính thức của ${donvi.tenDonVi} — hỗ trợ thông tin thủ tục hành chính 24/7.\nAnh/chị cần hỏi gì cứ nhắn trực tiếp, hoặc chọn lĩnh vực từ danh mục bên dưới nhé. (Nếu không thấy nút bấm, vui lòng gõ từ khóa: cư trú, giao thông, căn cước, an ninh, ngoại kiều, khiếu nại.)\nTrường hợp khẩn cấp, xin gọi ngay số trực ban: ${donvi.trucBan}. Xin cảm ơn anh/chị đã liên hệ!`;
const _pLimit = require('p-limit');
const pLimit = _pLimit.default || _pLimit;
const { ChromaClient } = require('chromadb');

// Max 3 concurrent Gemini calls per worker (4 workers × 3 = 12 total)
const geminiLimit = pLimit(3);

// In-memory cache is removed, using SQLite from db.js instead
const { GoogleGenerativeAI } = require('@google/generative-ai');

const parsedPort = process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT, 10) : 8000;
const chromaPort = isNaN(parsedPort) ? 8000 : parsedPort;
const client = new ChromaClient({ 
  host: process.env.CHROMA_HOST || "localhost", 
  port: chromaPort 
});

// Deterministic fallback embedding function (must match init_db.js)
function getMockEmbedding(text) {
  const embedding = new Array(3072).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let d = 0; d < 3072; d++) {
    const seed = hash + d;
    const x = Math.sin(seed) * 10000;
    embedding[d] = x - Math.floor(x);
  }
  return embedding;
}

// PII Sanitizer: masks Vietnamese phone numbers and CCCD identity numbers in log output
function sanitizeLogText(text) {
  if (process.env.MASK_PII_LOGS !== 'true' || !text) {
    return text;
  }
  let sanitized = text;
  // Mask Vietnamese phone numbers (03x, 05x, 07x, 08x, 09x) - show first 3 and last 3 digits
  sanitized = sanitized.replace(/(0[35789]\d)\d{4}(\d{3})/g, '$1****$2');
  // Mask CCCD identity numbers (12 consecutive digits) - show first 3 and last 3 digits
  sanitized = sanitized.replace(/(\d{3})\d{6}(\d{3})/g, '$1******$2');
  return sanitized;
}

// Custom Embedding Helper matching init_db.js
const EMBEDDING_MODELS = ["gemini-embedding-2", "gemini-embedding-001"];

// Embed one text with retry + cross-model failover. A WRONG query vector is worse than none:
// the mock hash-embedding lands in a different space and retrieves garbage (e.g. "-- 8 of 30 --"
// page markers), which the LLM then answers from. So on total failure we THROW — the caller's
// catch yields empty context and the bot politely defers to the hotline instead of hallucinating.
async function embedQueryText(genAI, text) {
  let lastErr;
  for (const modelName of EMBEDDING_MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.embedContent(text);
        return result.embedding.values;
      } catch (err) {
        lastErr = err;
        const overloaded = err.status === 429 || err.status >= 500 ||
          (err.message && /429|RESOURCE_EXHAUSTED|503|500/.test(err.message));
        console.error(`[${modelName}] embedding failed for "${sanitizeLogText(text).substring(0, 30)}...": ${err.status || err.message}`);
        if (overloaded && attempt === 0) { await sleep(800); continue; }
        break; // try next embedding model
      }
    }
  }
  throw lastErr || new Error('All embedding models failed');
}

const geminiEmbeddingFunction = {
  generate: async (texts) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

    if (isDefaultKey) {
      return texts.map(text => getMockEmbedding(text)); // dev/test only — never used in production
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddings = [];
    for (const text of texts) {
      embeddings.push(await embedQueryText(genAI, text));
    }
    return embeddings;
  }
};

const menuMapping = {
  'MENU_CU_TRU': { state: 'AGENT_CU_TRU', title: 'Cổng thông tin Cư trú & Địa bàn', db: 'db_pc06_cu_tru' },
  'MENU_CAN_CUOC': { state: 'AGENT_CAN_CUOC', title: 'Cổng thông tin Căn cước & Định danh', db: 'db_pc06_can_cuoc' },
  'MENU_GIAO_THONG': { state: 'AGENT_GIAO_THONG', title: 'Cổng thông tin Giao thông', db: 'db_pc08_giao_thong' },
  'MENU_AN_NINH': { state: 'AGENT_AN_NINH', title: 'Cổng thông tin An ninh Trật tự & PCCC', db: 'db_pc06_an_ninh_trat_tu' },
  'MENU_NGOAI_KIEU': { state: 'AGENT_NGOAI_KIEU', title: 'Cổng thông tin Ngoại kiều', db: 'db_pa08_ngoai_kieu' },
  'MENU_KHIEU_NAI': { state: 'AGENT_KHIEU_NAI', title: 'Cổng thông tin Khiếu nại & Vi phạm', db: 'db_px05_khieu_nai_to_cao' },
  'MENU_TTHC': { state: 'AGENT_TTHC', title: 'Cổng thông tin Thủ tục Hành chính', db: 'db__chung_thu_tuc_hanh_chinh' },
  'MENU_LIEN_HE': { state: 'AGENT_LIEN_HE', title: 'Cổng thông tin Liên hệ Cơ quan', db: 'db__chung_lien_he_co_quan' },
  'MENU_GOP_Y': { state: 'AGENT_GOP_Y', title: 'Góp ý Hệ thống', db: null }
};

// Helper function for sleeping
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Shared model-health cooldown (circuit breaker), process-wide. When a model returns 503/429 it is
// parked for MODEL_COOLDOWN_MS so concurrent and subsequent messages SKIP it instead of each
// re-discovering the outage. The app runs as a single Node process, so this Map is truly shared
// across every message — one request's failure protects the next 9 in a burst.
const modelCooldownUntil = new Map();
const MODEL_COOLDOWN_MS = 15000;
const isModelCoolingDown = (m) => (modelCooldownUntil.get(m) || 0) > Date.now();

// Gemini API call with breadth-first failover + shared circuit breaker
async function callGeminiWithBackoff(prompt, retries = 4, delay = 2000, genConfig = {}, modelNames = ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"]) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

  if (isDefaultKey) {
    console.warn("Using placeholder response because GEMINI_API_KEY is not configured.");
    return `[MÔ PHỎNG PHẢN HỒI] Xin chào! Hiện tại hệ thống đang chạy ở chế độ thử nghiệm (chưa cấu hình API Key thực). Dưới đây là câu trả lời mô phỏng dựa trên tài liệu pháp luật tham chiếu.

Công an Phường ghi nhận câu hỏi của anh/chị. Để giải quyết thủ tục, anh/chị cần chuẩn bị đầy đủ hồ sơ theo quy định, bao gồm các giấy tờ chứng minh chỗ ở hoặc nhân thân hợp lệ. Đối với biểu mẫu trực tuyến, anh/chị có thể đăng nhập ứng dụng VNeID mức độ 2 để xác thực và tiến hành nộp hồ sơ.`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = Array.isArray(modelNames) ? modelNames : [modelNames];
  let lastError;
  const dead = new Set(); // models that returned a hard error (400/403/404) — don't retry them

  // Breadth-first failover: try each model ONCE per round, switching IMMEDIATELY on overload.
  // A shared circuit breaker (modelCooldownUntil) makes the whole process skip models that another
  // request just saw fail, so under a burst we don't pay the failed-attempt cost 10× per dead model.
  for (let round = 0; round < retries; round++) {
    const live = modelsToTry.filter(m => !dead.has(m));
    if (live.length === 0) break;
    // Prefer models not cooling down; if every live model is cooling, try them anyway (they may have recovered).
    const fresh = live.filter(m => !isModelCoolingDown(m));
    const candidates = fresh.length > 0 ? fresh : live;

    for (const currentModelName of candidates) {
      try {
        const model = genAI.getGenerativeModel({ model: currentModelName });
        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: genConfig
        });
        modelCooldownUntil.delete(currentModelName); // healthy again — clear any cooldown
        return response.response.text();
      } catch (error) {
        lastError = error;
        const isOverload = error.status === 429 || error.status >= 500 ||
                           (error.message && /429|RESOURCE_EXHAUSTED|503|500/.test(error.message));
        if (isOverload) {
          modelCooldownUntil.set(currentModelName, Date.now() + MODEL_COOLDOWN_MS);
          console.warn(`[${currentModelName}] Overloaded (${error.status || '5xx/429'}). Cooling down ${MODEL_COOLDOWN_MS}ms; failing over immediately.`);
          continue; // try the next model right away, no sleep
        }
        // Non-retryable (400/403/404): mark dead so future rounds skip it.
        console.warn(`[${currentModelName}] Unrecoverable error (${error.status || error.message?.slice(0, 60)}). Dropping this model.`);
        dead.add(currentModelName);
      }
    }

    if (dead.size >= modelsToTry.length) break; // every model returned a hard error; stop retrying
    if (round < retries - 1) {
      const backoff = delay * (round + 1);
      console.warn(`All models busy (round ${round + 1}/${retries}). Backing off ${backoff}ms before retrying cycle...`);
      await sleep(backoff);
    }
  }

  console.error("All models failed after all rounds. Last error:", lastError);
  return "Hệ thống tra cứu hiện đang bận do quá tải. Xin vui lòng gửi lại câu hỏi sau ít phút.";
}

/**
 * Main handler for chatbot logic
 * @param {string} userId - Sender ID
 * @param {string} messageText - Message text
 * @param {string} buttonPayload - Button payload if any
 */
async function processUserMessage(userId, messageText, buttonPayload = null) {
  try {
    const payload = buttonPayload || (messageText ? messageText.trim() : null);

    // Save user message to database history
    const userMessageContent = messageText ? messageText : `[Payload: ${buttonPayload}]`;
    await db.saveMessage(userId, 'user', userMessageContent).catch(e => console.error("History log error:", e));

    if (payload && payload.startsWith('CSAT_')) {
      const rating = payload.replace('CSAT_', '');
      return {
        text: `[Chatbot Auto] Cảm ơn bạn đã đánh giá ${rating} Sao! Ý kiến của bạn giúp chúng tôi cải thiện chất lượng dịch vụ.`,
        showMenu: true
      };
    }

    // 1a. Handle main menu reset and GET_STARTED payload
    if (payload === 'SHOW_MAIN_MENU' || payload === 'GET_STARTED' || payload === 'START') {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: WELCOME_TEXT,
        showMenu: true
      };
    }

    // 1b. Handle FLOW_* decision-tree payloads (static answers + sub-menus)
    if (payload && payload.startsWith('FLOW_')) {
      const flowResponse = flow.getStaticResponse(payload);
      if (flowResponse) {
        await db.setSession(userId, flowResponse.agentState);
        let replyText = flowResponse.text;

        // Bổ sung xử lý câu trả lời tĩnh qua AI để format 3 nhịp (có cache)
        const crypto = require('crypto');
        const textHash = crypto.createHash('md5').update(replyText).digest('hex');
        const cacheKey = `STATIC_AI::${payload}::${textHash}`;
        
        let cachedStatic = await db.getCachedResponse(cacheKey);
        
        if (!cachedStatic) {
          const pass2Prompt = `Bạn là một cán bộ tiếp dân tận tâm, kiên nhẫn, gần gũi của Công an phường Bình Dương.
Thông tin đơn vị của bạn (TUYỆT ĐỐI TUÂN THỦ):
- Tên cơ quan: Công an phường Bình Dương.
- Trụ sở chính: Số 01, đường D27, khu phố Hòa Phú 1, phường Bình Dương, Thành phố Hồ Chí Minh.
- Số điện thoại trực ban (24/7): 02743 515 097.
- Thời gian tiếp dân: Từ Thứ Hai đến Thứ Bảy (Sáng: 07h30 – 11h30, Chiều: 13h30 – 17h00). Thứ Ba và Thứ Năm có tiếp dân thêm Buổi Tối: 18h00 – 22h00.

Nhiệm vụ: Viết lại (làm mượt) thông tin hướng dẫn sau đây thành một câu trả lời hoàn chỉnh, thân thiện cho người dân.
THÔNG TIN HƯỚNG DẪN GỐC:
===
${replyText}
===

QUY TẮC:
1. Xưng "Công an phường", gọi "anh/chị". Dùng từ "ạ", "dạ" tự nhiên.
2. Cấu trúc 3 nhịp: (1) Câu đồng cảm/ghi nhận → (2) Trình bày trọng tâm bằng gạch đầu dòng (GIỮ NGUYÊN thông tin pháp lý, số liệu, link web/video nếu có) → (3) Câu mời hỗ trợ thêm.
3. KHÔNG tự bịa thêm luật hay quy định ngoài thông tin gốc.
4. SÚC TÍCH, dễ đọc trên điện thoại.

Cán bộ trả lời:`;

          try {
            const humanizedReply = await geminiLimit(() => callGeminiWithBackoff(pass2Prompt, 4, 2000, { temperature: 0.5 }));
            cachedStatic = humanizedReply.trim().startsWith("[Chatbot Auto]") ? humanizedReply.trim() : "[Chatbot Auto] " + humanizedReply.trim();
            await db.setCachedResponse(cacheKey, cachedStatic);
          } catch (err) {
            console.error("AI formatting for static response failed, using original.", err);
            cachedStatic = "[Chatbot Auto] " + replyText; // fallback to original if AI fails
          }
        }
        
        replyText = cachedStatic;

        if (flowResponse.openChat) {
          return { text: replyText, showMenu: false };
        }
        return { text: replyText, quickReplies: flowResponse.afterReplies };
      }
    }

    // 1. Process Menu selection by payload
    let target = null;
    if (payload && menuMapping[payload]) {
      target = menuMapping[payload];
    } else if (messageText) {
      // 1b. Allow users to type the name of the menu or related keywords
      const lowerText = messageText.trim().toLowerCase().normalize('NFC');
      
      const keywords = {
        'AGENT_CU_TRU': ['cư trú', 'tạm trú', 'thường trú', 'hộ khẩu', 'lưu trú', 'khai báo tạm vắng', 'kt3', 'hk', 'hktt', 'nhập khẩu', 'cắt khẩu', 'chuyển khẩu', 'đktt', 'tách hộ', 'sổ hộ khẩu', 'shk'],
        'AGENT_CAN_CUOC': ['căn cước', 'cccd', 'cmnd', 'định danh', 'vneid', 'mã định danh', 'cc', 'cmt', 'chứng minh thư', 'chứng minh nhân dân', 'cấp lại cccd', 'làm cccd', 'đdcn', 'cấp cccd'],
        'AGENT_GIAO_THONG': ['giao thông', 'xe máy', 'ô tô', 'phạt nguội', 'tai nạn', 'bằng lái', 'gt', 'gtđb', 'csgt', 'cảnh sát giao thông', 'cavet', 'cà vẹt', 'đăng ký xe', 'giấy phép lái xe', 'gplx', 'mất bằng', 'sang tên xe', 'kẹt xe', 'phân khối'],
        'AGENT_AN_NINH': ['an ninh', 'pccc', 'cháy', 'trật tự', 'đánh nhau', 'trộm cắp', 'báo công an', 'antt', '113', '114', 'cấp cứu', 'cứu hỏa', 'phòng cháy chữa cháy', 'đánh bạc', 'ma túy', 'cướp', 'bạo hành', 'gây rối', 'công an phường', 'cap', 'cshs', 'lừa đảo'],
        'AGENT_NGOAI_KIEU': ['ngoại kiều', 'nước ngoài', 'người nước ngoài', 'visa', 'hộ chiếu', 'nnn', 'xnc', 'xuất nhập cảnh', 'thẻ xanh', 'trục xuất', 'passport', 'thẻ tạm trú', 'việt kiều', 'gia hạn visa'],
        'AGENT_KHIEU_NAI': ['khiếu nại', 'tố cáo', 'vi phạm', 'phản ánh', 'kn', 'tc', 'kntc', 'kiện', 'đơn kiện', 'tố giác', 'tội phạm', 'tham nhũng', 'hối lộ', 'pakn'],
        'AGENT_TTHC': ['thủ tục hành chính', 'tthc', 'thủ tục', 'dịch vụ công', 'hành chính', 'dvc', 'dvctt', 'hành chính công', 'một cửa', 'ủy ban', 'ubnd', 'sao y', 'công chứng', 'chứng thực', 'giấy khai sinh', 'khai sinh', 'kết hôn', 'khai tử'],
        'AGENT_LIEN_HE': ['liên hệ', 'địa chỉ', 'số điện thoại', 'đường dây nóng', 'hotline', 'ubnd', 'công an thành phố', 'trụ sở', 'sđt', 'liên lạc', 'địa điểm', 'gọi công an', 'ban chỉ huy']
      };

      for (const [stateKey, words] of Object.entries(keywords)) {
        if (words.some(word => lowerText.includes(word))) {
          target = Object.values(menuMapping).find(item => item.state === stateKey);
          break;
        }
      }
    }

    // 2. Fetch User State from DB
    const session = await db.getSession(userId);
    let state = session ? session.agent_state : null;

    if (target) {
      // If user clicked a button or explicitly just typed a short category name
      if ((payload && menuMapping[payload]) || (messageText && messageText.trim().length <= 15)) {
        await db.setSession(userId, target.state);
        
        if (target.state === 'AGENT_GOP_Y') {
          return {
            text: "[Chatbot Auto] Mời anh/chị nhập nội dung góp ý. Mọi ý kiến của anh/chị sẽ được lưu vào file để Ban quản trị cải thiện hệ thống. (Gõ 'thoát' hoặc 'quay lại' để hủy)",
            quickReplies: [{ title: "Hủy và Quay về", payload: "SHOW_MAIN_MENU" }]
          };
        }
        
        return {
          text: `[Chatbot Auto] Anh/chị đang ở mục ${target.title}. Vui lòng chọn chủ đề cần hỗ trợ:`,
          quickReplies: flow.getSubMenu(target.state)
        };
      } else {
        // User typed a long question that contains a keyword.
        // Implicitly switch their state to the right category, but DO NOT return the welcome message.
        // Continue processing to answer the question!
        await db.setSession(userId, target.state);
        state = target.state; 
      }
    }

    // Reset if requested, no state, or user sends a greeting/start trigger
    const greetings = [
      'menu', 'menh', 'main menu',
      'quay lại', 'quay lai', 'quay về', 'quay ve', 'trở về', 'tro ve',
      'start', 'bắt đầu', 'bat dau', 'bắt đầu lại', 'bat dau lai', 'restart',
      'help', 'trợ giúp', 'tro giup', 'hỗ trợ', 'ho tro',
      'thoát', 'thoat', 'về đầu', 've dau'
    ];
    const textLower = messageText ? messageText.trim().toLowerCase() : '';
    const isGreeting = textLower && (
      greetings.includes(textLower) ||
      /^(xin )?(chào|chao|hi|hello|helo|alo|ê|he|hey)( bạn| a| c| anh| chị| ad| admin| bot| mn| mọi người)?$/i.test(textLower) ||
      /^(có ai không|co ai khong|ai không|ai do|ai đó)$/i.test(textLower) ||
      textLower === '1 tin nhắn' // Just in case they literally meant the phrase "1 tin nhắn"
    );
    if (!state || isGreeting) {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: WELCOME_TEXT,
        showMenu: true
      };
    }

    if (state === 'MAIN_MENU') {
      return {
        text: "[Chatbot Auto] Chào anh/chị! Để Công an Phường hỗ trợ chính xác nhất, anh/chị vui lòng chọn lĩnh vực cần hỏi từ danh sách bên dưới ạ. (Nếu không thấy nút bấm, anh/chị có thể gõ từ khóa: cư trú, giao thông, căn cước...)",
        showMenu: true
      };
    }

    if (state === 'AGENT_GOP_Y') {
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.join(__dirname, '../data/feedback.csv');
      
      if (!fs.existsSync(csvPath)) {
        fs.writeFileSync(csvPath, '"Timestamp","SenderID","Feedback"\n', 'utf8');
      }
      
      const dateStr = new Date().toISOString();
      const escapedMessage = messageText ? messageText.replace(/"/g, '""') : '[Không có nội dung]';
      const csvLine = `"${dateStr}","${userId}","${escapedMessage}"\n`;
      fs.appendFileSync(csvPath, csvLine, 'utf8');
      
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Cảm ơn anh/chị đã góp ý! Ý kiến của anh/chị đã được ghi nhận. Hệ thống xin phép quay về Menu chính.",
        showMenu: true
      };
    }

    if (messageText && messageText.trim().toLowerCase() === 'xin biểu mẫu ct01') {
      return { isFile: true, fileUrl: '/forms/CT01.pdf' };
    }

    const matchedConfig = Object.values(menuMapping).find(item => item.state === state);
    if (!matchedConfig) {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Xin lỗi anh/chị, hệ thống gặp chút trục trặc nhỏ. Phiền anh/chị chọn lại lĩnh vực từ menu bên dưới nhé:",
        showMenu: true
      };
    }

    // 3 & 4. Query ChromaDB and Fetch History Concurrently (Parallelization)
    let context = "";
    let historySection = "";
    
    // Bổ sung: Xử lý từ viết tắt để ChromaDB và Gemini hiểu rõ hơn
    const abbreviationMap = {
      'cccd': 'căn cước công dân',
      'cmnd': 'chứng minh nhân dân',
      'cmt': 'chứng minh thư',
      'đktt': 'đăng ký thường trú',
      'đktt2': 'đăng ký tạm trú',
      'kt3': 'sổ tạm trú',
      'hk': 'hộ khẩu',
      'hktt': 'hộ khẩu thường trú',
      'shk': 'sổ hộ khẩu',
      'csgt': 'cảnh sát giao thông',
      'gplx': 'giấy phép lái xe',
      'pccc': 'phòng cháy chữa cháy',
      'bhyt': 'bảo hiểm y tế',
      'bhxh': 'bảo hiểm xã hội',
      'xnc': 'xuất nhập cảnh',
      'nnn': 'người nước ngoài',
      'kntc': 'khiếu nại tố cáo',
      'kn': 'khiếu nại',
      'tc': 'tố cáo',
      'dvc': 'dịch vụ công',
      'dvctt': 'dịch vụ công trực tuyến',
      'tthc': 'thủ tục hành chính',
      'ubnd': 'ủy ban nhân dân',
      'cap': 'công an phường',
      'cshs': 'cảnh sát hình sự',
      'vneid': 'ứng dụng định danh điện tử VNeID'
    };

    let expandedMessageText = messageText || "";
    if (expandedMessageText) {
      for (const [abbr, full] of Object.entries(abbreviationMap)) {
        const regex = new RegExp(`(?<=^|\\s|[.,!?])${abbr}(?=[.,!?\\s]|$)`, 'gi');
        expandedMessageText = expandedMessageText.replace(regex, full);
      }
    }
    
    try {
      const collectionPromise = client.getCollection({
        name: matchedConfig.db,
        embeddingFunction: geminiEmbeddingFunction
      }).then(col => col.query({ queryTexts: [expandedMessageText], nResults: 3 }));
      
      const historyPromise = db.getConversationHistory(userId, 3);
      
      const [queryResults, history] = await Promise.all([
        collectionPromise.catch(err => {
          console.error(`Error querying ChromaDB collection ${matchedConfig.db}:`, err);
          return { documents: [] };
        }),
        historyPromise.catch(err => {
          console.error(`Error fetching conversation history for user ${userId}:`, err);
          return [];
        })
      ]);

      if (queryResults.documents && queryResults.documents[0]) {
        context = queryResults.documents[0].join("\n\n");
      }
      
      if (history && history.length > 0) {
        const historyLines = history.map(msg => {
          const speaker = msg.role === 'user' ? 'Người dân' : 'Công an Phường';
          return `${speaker}: ${msg.content}`;
        }).join('\n');
        historySection = `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
===
${historyLines}
===

`;
      }
    } catch (parallelErr) {
      console.error("Error in parallel fetch:", parallelErr);
    }

    // 5. Formulate Pass 1 and Pass 2 Prompts and call Gemini
    const pass1Prompt = `Bạn là chuyên gia phân tích pháp lý. Hãy đọc TÀI LIỆU PHÁP LUẬT và trích xuất đầy đủ các quy định liên quan để trả lời câu hỏi.
YÊU CẦU:
- Giữ nguyên tính chính xác của pháp luật, TUYỆT ĐỐI KHÔNG dùng từ lóng hay viết tắt gây hiểu sai lệch.
- Trình bày đầy đủ bằng gạch đầu dòng các thủ tục, hồ sơ, lệ phí, thời hạn (nếu có trong tài liệu).
- KHÔNG xưng hô, KHÔNG thêm cảm xúc, chỉ tập trung vào dữ kiện pháp lý.

${historySection}TÀI LIỆU PHÁP LUẬT THAM CHIẾU:
===
${context || "Không có tài liệu tham chiếu nào được tìm thấy cho câu hỏi này."}
===

Câu hỏi của người dân: ${expandedMessageText}

Dữ kiện:`;

    const cacheKey = `${state}::${expandedMessageText.toLowerCase().trim()}`;
    let replyText = await db.getCachedResponse(cacheKey);
    
    if (!replyText) {
      // PASS 1: Extract Facts (Fast, strictly precise). Order chosen for STABILITY + high quota:
      // flash-lite models first (4M TPM, Unlimited RPD) so we never run out of daily quota mid-flow.
      const rawFacts = await geminiLimit(() => callGeminiWithBackoff(
        pass1Prompt, 4, 2000,
        { temperature: 0.1 },
        ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"]
      ));
      
      // PASS 2: Humanize Tone (Normal configuration)
      const pass2Prompt = `Bạn là một cán bộ tiếp dân tận tâm, kiên nhẫn, gần gũi của Công an phường Bình Dương.
Thông tin đơn vị của bạn (TUYỆT ĐỐI TUÂN THỦ, KHÔNG ĐƯỢC BỊA ĐẶT ĐỊA CHỈ KHÁC NHƯ LÝ TỰ TRỌNG, LÊ LỢI...):
- Tên cơ quan: Công an phường Bình Dương.
- Trụ sở chính: Số 01, đường D27, khu phố Hòa Phú 1, phường Bình Dương, Thành phố Hồ Chí Minh.
- Số điện thoại trực ban (24/7): 02743 515 097.
- Thời gian tiếp dân giải quyết thủ tục hành chính: Từ Thứ Hai đến Thứ Bảy (Sáng: 07h30 – 11h30, Chiều: 13h30 – 17h00). Thứ Ba và Thứ Năm có tiếp dân thêm Buổi Tối: 18h00 – 22h00.

NẾU TRONG CÂU TRẢ LỜI CÓ HƯỚNG DẪN NGƯỜI DÂN ĐẾN TRỤ SỞ, BẮT BUỘC PHẢI DÙNG CHÍNH XÁC ĐỊA CHỈ: "Số 01, đường D27, khu phố Hòa Phú 1, phường Bình Dương, TP.HCM". TUYỆT ĐỐI KHÔNG DÙNG ĐỊA CHỈ GIẢ ĐỊNH.

Bạn vừa tra cứu được các dữ kiện pháp lý sau:
===
${rawFacts}
===

Nhiệm vụ: Viết lại các dữ kiện trên thành một câu trả lời hoàn chỉnh cho người dân.
QUY TẮC:
1. Xưng "Công an phường", gọi "anh/chị/cô/bác". Dùng từ "ạ", "dạ" tự nhiên.
2. Cấu trúc 3 nhịp NGẮN GỌN: (1) 1 câu đồng cảm/ghi nhận → (2) Trả lời trọng tâm bằng gạch đầu dòng → (3) 1 câu mời hỗ trợ thêm.
3. Nếu dữ kiện báo "Không có tài liệu" và câu hỏi KHÔNG nằm trong phần thông tin đơn vị ở trên, hãy từ chối lịch sự và mời gọi số trực ban.
4. GIỮ NGUYÊN các trích dẫn pháp lý (Điều/Khoản) từ dữ kiện. KHÔNG TỰ BỊA THÊM luật.
5. ĐA NGÔN NGỮ: Tự động nhận diện ngôn ngữ trong câu hỏi của người dân. Nếu người dân hỏi bằng ngôn ngữ khác (Tiếng Anh, Tiếng Hàn, Tiếng Trung...), hãy dịch toàn bộ câu trả lời sang ngôn ngữ đó một cách chuyên nghiệp.
6. SÚC TÍCH: Tối đa ~5 gạch đầu dòng, mỗi ý 1-2 dòng. KHÔNG mở bài dài dòng, KHÔNG lặp lại ý. Ưu tiên ngắn gọn, dễ đọc trên điện thoại — chỉ nêu thông tin người dân thật sự cần.

Câu hỏi của người dân: ${expandedMessageText}
Cán bộ trả lời:`;

      const humanizedReply = await geminiLimit(() => callGeminiWithBackoff(pass2Prompt, 4, 2000, { temperature: 0.6 }));
      
      replyText = humanizedReply.trim().startsWith("[Chatbot Auto]") ? humanizedReply.trim() : "[Chatbot Auto] " + humanizedReply.trim();
      await db.setCachedResponse(cacheKey, replyText);
    } else {
      console.log(`[CACHE HIT] ${cacheKey.substring(0, 60)}`);
    }


    return {
      text: replyText,
      showMenu: false,
      quickReplies: [
        { title: "1 Sao", payload: "CSAT_1" },
        { title: "2 Sao", payload: "CSAT_2" },
        { title: "3 Sao", payload: "CSAT_3" },
        { title: "4 Sao", payload: "CSAT_4" },
        { title: "5 Sao", payload: "CSAT_5" }
      ]
    };
  } catch (error) {
    console.error("Error in processUserMessage:", error);
    return {
      text: "[Chatbot Auto] Hệ thống gặp sự cố kỹ thuật. Đề nghị anh/chị liên hệ hotline Công an Phường hoặc thử lại sau.",
      showMenu: false
    };
  }
}

/**
 * Wrapper to handle user message and log bot response to history
 */
async function handleUserMessage(userId, messageText, buttonPayload = null) {
  const result = await processUserMessage(userId, messageText, buttonPayload);
  
  // Save bot response to database history
  let botMessageContent = result.text;
  if (!botMessageContent && result.attachment) {
    botMessageContent = "[Gửi file/ảnh đính kèm]";
  } else if (!botMessageContent && result.options) {
    botMessageContent = "[Gửi Menu tùy chọn]";
  }
  
  await db.saveMessage(userId, 'bot', botMessageContent).catch(e => console.error("History log error:", e));
  
  return result;
}

module.exports = {
  handleUserMessage
};
