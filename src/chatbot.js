require('dotenv').config();
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
const geminiEmbeddingFunction = {
  generate: async (texts) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

    if (isDefaultKey) {
      return texts.map(text => getMockEmbedding(text));
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const embeddings = [];

      for (const text of texts) {
        let success = false;
        try {
          const result = await model.embedContent(text);
          embeddings.push(result.embedding.values);
          success = true;
        } catch (err) {
          console.error(`Query embedding failed for text: "${sanitizeLogText(text).substring(0, 30)}...", error:`, err);
        }
        if (!success) {
          embeddings.push(getMockEmbedding(text));
        }
      }
      return embeddings;
    } catch (error) {
      console.error('General error in query embedding:', error);
      return texts.map(text => getMockEmbedding(text));
    }
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

// Gemini API call with Exponential Backoff
async function callGeminiWithBackoff(prompt, retries = 4, delay = 2000, genConfig = {}, modelName = "gemini-2.5-flash") {
  const apiKey = process.env.GEMINI_API_KEY;
  const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

  if (isDefaultKey) {
    console.warn("Using placeholder response because GEMINI_API_KEY is not configured.");
    return `[MÔ PHỎNG PHẢN HỒI] Xin chào! Hiện tại hệ thống đang chạy ở chế độ thử nghiệm (chưa cấu hình API Key thực). Dưới đây là câu trả lời mô phỏng dựa trên tài liệu pháp luật tham chiếu.

Công an Phường ghi nhận câu hỏi của anh/chị. Để giải quyết thủ tục, anh/chị cần chuẩn bị đầy đủ hồ sơ theo quy định, bao gồm các giấy tờ chứng minh chỗ ở hoặc nhân thân hợp lệ. Đối với biểu mẫu trực tuyến, anh/chị có thể đăng nhập ứng dụng VNeID mức độ 2 để xác thực và tiến hành nộp hồ sơ.`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  for (let i = 0; i < retries; i++) {
    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: genConfig
      });
      return response.response.text();
    } catch (error) {
      const isRateLimit = error.status === 429 || 
                          (error.message && error.message.includes('429')) ||
                          (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
      const isServerError = error.status >= 500 || 
                            (error.message && (error.message.includes('503') || error.message.includes('500')));
      
      if ((isRateLimit || isServerError) && i < retries - 1) {
        // Wait/sleep dynamically using exponential formula: 2000 * (retryIndex + 1) ms
        const currentDelay = delay * (i + 1);
        console.warn(`Gemini API busy or rate limited. Retrying in ${currentDelay}ms (Attempt ${i + 1}/${retries})...`);
        await sleep(currentDelay);
        continue;
      }
      
      // Fallback for invalid API key or model not found
      if (error.status === 400 || error.status === 403 || error.status === 404 || 
          (error.message && (error.message.includes('400') || error.message.includes('403') || error.message.includes('404')))) {
        console.warn("Gemini API Key is invalid or model not found. Falling back to placeholder response.");
        return `[MÔ PHỎNG PHẢN HỒI] Xin chào! Hiện tại hệ thống đang chạy ở chế độ thử nghiệm do API Key không hợp lệ. Dưới đây là câu trả lời mô phỏng dựa trên tài liệu pháp luật tham chiếu.

Công an Phường ghi nhận câu hỏi của anh/chị. Để giải quyết thủ tục, anh/chị cần chuẩn bị đầy đủ hồ sơ theo quy định, bao gồm các giấy tờ chứng minh chỗ ở hoặc nhân thân hợp lệ. Đối với biểu mẫu trực tuyến, anh/chị có thể đăng nhập ứng dụng VNeID mức độ 2 để xác thực và tiến hành nộp hồ sơ.`;
      }
      throw error;
    }
  }
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
        if (flowResponse.openChat) {
          return { text: flowResponse.text, showMenu: false };
        }
        return { text: flowResponse.text, quickReplies: flowResponse.afterReplies };
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
        'AGENT_CU_TRU': ['cư trú', 'tạm trú', 'thường trú', 'hộ khẩu', 'lưu trú', 'khai báo tạm vắng'],
        'AGENT_CAN_CUOC': ['căn cước', 'cccd', 'cmnd', 'định danh', 'vneid', 'mã định danh'],
        'AGENT_GIAO_THONG': ['giao thông', 'xe máy', 'ô tô', 'phạt nguội', 'tai nạn', 'bằng lái'],
        'AGENT_AN_NINH': ['an ninh', 'pccc', 'cháy', 'trật tự', 'đánh nhau', 'trộm cắp', 'báo công an'],
        'AGENT_NGOAI_KIEU': ['ngoại kiều', 'nước ngoài', 'người nước ngoài', 'visa', 'hộ chiếu'],
        'AGENT_KHIEU_NAI': ['khiếu nại', 'tố cáo', 'vi phạm', 'phản ánh'],
        'AGENT_TTHC': ['thủ tục hành chính', 'tthc', 'thủ tục', 'dịch vụ công', 'hành chính'],
        'AGENT_LIEN_HE': ['liên hệ', 'địa chỉ', 'số điện thoại', 'đường dây nóng', 'hotline', 'ubnd', 'công an thành phố', 'trụ sở']
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
    
    try {
      const collectionPromise = client.getCollection({
        name: matchedConfig.db,
        embeddingFunction: geminiEmbeddingFunction
      }).then(col => col.query({ queryTexts: [messageText], nResults: 3 }));
      
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

Câu hỏi của người dân: ${messageText}

Dữ kiện:`;

    const cacheKey = `${state}::${messageText.toLowerCase().trim()}`;
    let replyText = await db.getCachedResponse(cacheKey);
    
    if (!replyText) {
      // PASS 1: Extract Facts (Fast using 1.5-flash-8b, strictly precise)
      const rawFacts = await geminiLimit(() => callGeminiWithBackoff(
        pass1Prompt, 4, 2000, 
        { temperature: 0.1 },
        "gemini-1.5-flash-8b"
      ));
      
      // PASS 2: Humanize Tone (Normal configuration)
      const pass2Prompt = `Bạn là một cán bộ tiếp dân tận tâm, kiên nhẫn, gần gũi của Công an Phường. Bạn vừa tra cứu được các dữ kiện pháp lý sau:
===
${rawFacts}
===

Nhiệm vụ: Viết lại các dữ kiện trên thành một câu trả lời hoàn chỉnh cho người dân.
QUY TẮC:
1. Xưng "Công an Phường", gọi "anh/chị/cô/bác". Dùng từ "ạ", "dạ" tự nhiên.
2. Cấu trúc 3 nhịp: (1) Đồng cảm/ghi nhận → (2) Trả lời trọng tâm bằng gạch đầu dòng → (3) Mời hỗ trợ thêm.
3. Nếu dữ kiện báo "Không có tài liệu", hãy từ chối lịch sự và mời gọi số trực ban.
4. GIỮ NGUYÊN các trích dẫn pháp lý (Điều/Khoản) từ dữ kiện. KHÔNG TỰ BỊA THÊM.

Câu hỏi của người dân: ${messageText}
Cán bộ trả lời:`;

      const humanizedReply = await geminiLimit(() => callGeminiWithBackoff(pass2Prompt, 4, 2000, { temperature: 0.6 }));
      
      replyText = humanizedReply.trim().startsWith("[Chatbot Auto]") ? humanizedReply.trim() : "[Chatbot Auto] " + humanizedReply.trim();
      await db.setCachedResponse(cacheKey, replyText);
    } else {
      console.log(`[CACHE HIT] ${cacheKey.substring(0, 60)}`);
    }


    return {
      text: replyText,
      showMenu: false
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
