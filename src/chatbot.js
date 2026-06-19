require('dotenv').config();
const db = require('./db');
const flow = require('./flow');
const _pLimit = require('p-limit');
const pLimit = _pLimit.default || _pLimit;
const { ChromaClient } = require('chromadb');

// Max 3 concurrent Gemini calls per worker (4 workers × 3 = 12 total)
const geminiLimit = pLimit(3);

// In-memory response cache: reuse identical questions within 1 hour
const responseCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_MAX_SIZE = 2000;

function getCacheKey(agentState, question) {
  return `${agentState}::${question.toLowerCase().trim()}`;
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { responseCache.delete(key); return null; }
  return entry.text;
}

function setCached(key, text) {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(key, { text, ts: Date.now() });
}
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
  'MENU_CU_TRU': { state: 'AGENT_CU_TRU', title: 'Cổng thông tin Cư trú & Địa bàn', db: 'db_cu_tru' },
  'MENU_CAN_CUOC': { state: 'AGENT_CAN_CUOC', title: 'Cổng thông tin Căn cước & Định danh', db: 'db_can_cuoc' },
  'MENU_GIAO_THONG': { state: 'AGENT_GIAO_THONG', title: 'Cổng thông tin Giao thông', db: 'db_giao_thong' },
  'MENU_AN_NINH': { state: 'AGENT_AN_NINH', title: 'Cổng thông tin An ninh Trật tự & PCCC', db: 'db_an_ninh' },
  'MENU_NGOAI_KIEU': { state: 'AGENT_NGOAI_KIEU', title: 'Cổng thông tin Ngoại kiều', db: 'db_ngoai_kieu' },
  'MENU_KHIEU_NAI': { state: 'AGENT_KHIEU_NAI', title: 'Cổng thông tin Khiếu nại & Vi phạm', db: 'db_khieu_nai' }
};

// Helper function for sleeping
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Gemini API call with Exponential Backoff
async function callGeminiWithBackoff(prompt, retries = 4, delay = 2000) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

  if (isDefaultKey) {
    console.warn("Using placeholder response because GEMINI_API_KEY is not configured.");
    return `[MÔ PHỎNG PHẢN HỒI] Xin chào! Hiện tại hệ thống đang chạy ở chế độ thử nghiệm (chưa cấu hình API Key thực). Dưới đây là câu trả lời mô phỏng dựa trên tài liệu pháp luật tham chiếu.

Công an Phường ghi nhận câu hỏi của anh/chị. Để giải quyết thủ tục, anh/chị cần chuẩn bị đầy đủ hồ sơ theo quy định, bao gồm các giấy tờ chứng minh chỗ ở hoặc nhân thân hợp lệ. Đối với biểu mẫu trực tuyến, anh/chị có thể đăng nhập ứng dụng VNeID mức độ 2 để xác thực và tiến hành nộp hồ sơ.`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  for (let i = 0; i < retries; i++) {
    try {
      const response = await model.generateContent(prompt);
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

    // 1a. Handle main menu reset
    if (payload === 'SHOW_MAIN_MENU') {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Chào bạn! Đây là trang Facebook chính thức của Công an phường Bình Dương.\nCảm ơn bạn đã liên hệ. Để được hỗ trợ nhanh nhất, vui lòng để lại nội dung cần tư vấn hoặc chọn từ danh mục bên dưới (nếu không thấy nút bấm, vui lòng gõ từ khóa: cư trú, giao thông, căn cước, an ninh, ngoại kiều, khiếu nại).\nTrong trường hợp khẩn cấp, vui lòng gọi số trực ban: ***REMOVED***. Trân trọng!",
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
        'AGENT_KHIEU_NAI': ['khiếu nại', 'tố cáo', 'vi phạm', 'phản ánh']
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
      'xin chào', 'chào', 'chao', 'hi', 'hello',
      'start', 'bắt đầu', 'bat dau', 'bắt đầu lại', 'bat dau lai', 'restart',
      'help', 'trợ giúp', 'tro giup', 'hỗ trợ', 'ho tro',
      'thoát', 'thoat', 'về đầu', 've dau'
    ];
    const isGreeting = messageText && greetings.includes(messageText.trim().toLowerCase());
    if (!state || isGreeting) {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Chào bạn! Đây là trang Facebook chính thức của Công an phường Bình Dương.\nCảm ơn bạn đã liên hệ. Để được hỗ trợ nhanh nhất, vui lòng để lại nội dung cần tư vấn hoặc chọn từ danh mục bên dưới (nếu không thấy nút bấm, vui lòng gõ từ khóa: cư trú, giao thông, căn cước, an ninh, ngoại kiều, khiếu nại).\nTrong trường hợp khẩn cấp, vui lòng gọi số trực ban: ***REMOVED***. Trân trọng!",
        showMenu: true
      };
    }

    if (state === 'MAIN_MENU') {
      return {
        text: "[Chatbot Auto] Anh/chị vui lòng bấm chọn một lĩnh vực từ danh sách bên dưới để được hỗ trợ (hoặc gõ từ khóa: cư trú, giao thông, căn cước... nếu không thấy nút bấm):",
        showMenu: true
      };
    }

    const matchedConfig = Object.values(menuMapping).find(item => item.state === state);
    if (!matchedConfig) {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Đã xảy ra lỗi kịch bản định tuyến. Vui lòng chọn lại lĩnh vực từ menu dưới đây:",
        showMenu: true
      };
    }

    // 3. Query ChromaDB for reference material
    let context = "";
    try {
      const collection = await client.getCollection({
        name: matchedConfig.db,
        embeddingFunction: geminiEmbeddingFunction
      });
      
      const queryResults = await collection.query({
        queryTexts: [messageText],
        nResults: 2
      });

      if (queryResults.documents && queryResults.documents[0]) {
        context = queryResults.documents[0].join("\n\n");
      }
    } catch (err) {
      console.error(`Error querying ChromaDB collection ${matchedConfig.db}:`, err);
    }

    // 4. Fetch conversation history for multi-turn context
    let historySection = "";
    try {
      const history = await db.getConversationHistory(userId, 3);
      if (history.length > 0) {
        const historyLines = history.map(msg => {
          const speaker = msg.role === 'user' ? 'Người dân' : 'Công an Phường';
          return `${speaker}: ${msg.content}`;
        }).join('\n');
        historySection = `LỊCH SỬ HỘI THOẠI GẦN ĐÂY (để hiểu ngữ cảnh, không cần lặp lại):
===
${historyLines}
===

`;
      }
    } catch (historyErr) {
      console.error(`Error fetching conversation history for user ${userId}:`, historyErr);
    }

    // 5. Formulate System Prompt and call Gemini
    const systemPrompt = `Bạn là Cán bộ Trực ban ảo của Công an Phường. Nhiệm vụ của bạn là giải đáp chính xác và tận tình các câu hỏi của người dân về các thủ tục hành chính dựa TRÊN TÀI LIỆU PHÁP LUẬT ĐƯỢC CUNG CẤP DƯỚI ĐÂY.

QUY TẮC CẦN TUÂN THỦ:
1. Xưng hô: Sử dụng ngôi thứ nhất là "Công an Phường" (không xưng tôi, tớ, em, mình) và gọi người dân là "anh/chị/cô/bác" một cách lịch sự, chuẩn mực hành chính công.
2. Ngắn gọn & Trọng tâm: TRẢ LỜI ĐÚNG TRỌNG TÂM câu hỏi. Vô cùng ngắn gọn và súc tích. Tuyệt đối KHÔNG giải thích dài dòng, KHÔNG cung cấp các thông tin dư thừa, quy trình hay điều khoản ngoài lề nếu người dân không hỏi.
3. CHỈ TRẢ LỜI dựa trên tài liệu pháp luật cung cấp dưới đây. Tuyệt đối không tự suy diễn luật hoặc đưa ra thông tin không có trong tài liệu.
4. Nếu tài liệu được cung cấp KHÔNG chứa câu trả lời hoặc không đủ thông tin, bạn BẮT BUỘC phải trả lời chính xác như sau:
"Xin lỗi, hiện tại Công an Phường chưa có dữ liệu chính xác cho trường hợp này của anh/chị. Đề nghị anh/chị liên hệ trực tiếp Trụ sở Công an Phường hoặc số điện thoại trực ban để được cán bộ chuyên trách hướng dẫn cụ thể."
5. Trình bày rõ ràng, sạch sẽ, sử dụng gạch đầu dòng cho các điều kiện, lệ phí và quy trình để dễ đọc.

${historySection}TÀI LIỆU PHÁP LUẬT THAM CHIẾU:
===
${context || "Không có tài liệu tham chiếu nào được tìm thấy cho câu hỏi này."}
===

Câu hỏi của người dân: ${messageText}

Công an Phường trả lời:`;

    const cacheKey = getCacheKey(state, messageText);
    let replyText = getCached(cacheKey);
    if (!replyText) {
      const rawReply = await geminiLimit(() => callGeminiWithBackoff(systemPrompt));
      replyText = rawReply.trim().startsWith("[Chatbot Auto]") ? rawReply.trim() : "[Chatbot Auto] " + rawReply.trim();
      setCached(cacheKey, replyText);
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
