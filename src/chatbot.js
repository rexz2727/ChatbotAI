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
  'MENU_CU_TRU': { state: 'AGENT_CU_TRU', title: 'Cổng thông tin Cư trú & Địa bàn', db: 'db_cu_tru' },
  'MENU_CAN_CUOC': { state: 'AGENT_CAN_CUOC', title: 'Cổng thông tin Căn cước & Định danh', db: 'db_can_cuoc' },
  'MENU_GIAO_THONG': { state: 'AGENT_GIAO_THONG', title: 'Cổng thông tin Giao thông', db: 'db_giao_thong' },
  'MENU_AN_NINH': { state: 'AGENT_AN_NINH', title: 'Cổng thông tin An ninh Trật tự & PCCC', db: 'db_an_ninh' },
  'MENU_NGOAI_KIEU': { state: 'AGENT_NGOAI_KIEU', title: 'Cổng thông tin Ngoại kiều', db: 'db_ngoai_kieu' },
  'MENU_KHIEU_NAI': { state: 'AGENT_KHIEU_NAI', title: 'Cổng thông tin Khiếu nại & Vi phạm', db: 'db_khieu_nai' },
  'MENU_TTHC': { state: 'AGENT_TTHC', title: 'Cổng thông tin Thủ tục Hành chính', db: 'db_thu_tuc_hanh_chinh' },
  'MENU_LIEN_HE': { state: 'AGENT_LIEN_HE', title: 'Cổng thông tin Liên hệ Cơ quan', db: 'db_lien_he' },
  'MENU_GOP_Y': { state: 'AGENT_GOP_Y', title: 'Góp ý Hệ thống', db: null }
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

    const matchedConfig = Object.values(menuMapping).find(item => item.state === state);
    if (!matchedConfig) {
      await db.setSession(userId, 'MAIN_MENU');
      return {
        text: "[Chatbot Auto] Xin lỗi anh/chị, hệ thống gặp chút trục trặc nhỏ. Phiền anh/chị chọn lại lĩnh vực từ menu bên dưới nhé:",
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
        nResults: 3
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
    const systemPrompt = `Bạn là một cán bộ tiếp dân tận tâm, kiên nhẫn, gần gũi của Công an Phường — như đang ngồi đối diện bà con để hỗ trợ thủ tục hành chính. Nhiệm vụ: giải đáp chính xác câu hỏi của người dân dựa TRÊN TÀI LIỆU PHÁP LUẬT ĐƯỢC CUNG CẤP DƯỚI ĐÂY.

QUY TẮC CẦN TUÂN THỦ:
1. Xưng hô: Sử dụng danh nghĩa "Công an Phường" (không xưng tôi, tớ, mình) và gọi người dân là "anh/chị/cô/bác". Được phép thêm từ đệm lịch sự như "ạ", "dạ", "Công an Phường xin phép hướng dẫn..." để bớt khô cứng, nhưng vẫn giữ chuẩn mực cơ quan nhà nước.
2. Trả lời ĐỦ Ý, ấm áp, đúng trọng tâm, KHÔNG lan man. Tự động nhận diện ý định:
- Hỏi hồ sơ/giấy tờ → liệt kê đủ hồ sơ cần chuẩn bị
- Hỏi quy trình/thủ tục → liệt kê các bước theo thứ tự
- Hỏi lệ phí/chi phí → báo số tiền cụ thể (miễn phí hoặc X đồng)
- Hỏi thời gian/bao lâu → báo thời hạn giải quyết cụ thể
- Hỏi địa điểm/nơi nộp → báo địa điểm cụ thể
3. Phạm vi trả lời — áp dụng theo thứ tự ưu tiên:
   a) TÀI LIỆU THAM CHIẾU có câu trả lời đầy đủ → trả lời dựa trên tài liệu (áp dụng Quy tắc 7 trích dẫn điều khoản). Đây là ưu tiên cao nhất.
   b) Tài liệu không đủ NHƯNG câu hỏi thuộc phạm vi công an/hành chính/pháp luật/giao thông/cư trú/an ninh/ngoại kiều → trả lời từ kiến thức pháp luật Việt Nam chung, BẮT BUỘC kết thúc bằng đúng câu: "(Lưu ý: Thông tin dựa trên pháp luật chung — đề nghị xác nhận lại với cán bộ trực ban để có hướng dẫn chính xác nhất.)"
   c) Câu hỏi HOÀN TOÀN ngoài phạm vi (ẩm thực, du lịch, giải trí, thời tiết...) → từ chối bằng đúng câu: "Xin lỗi anh/chị, hiện tại Công an Phường chưa có dữ liệu chính xác cho trường hợp này. Đề nghị anh/chị liên hệ trực tiếp Trụ sở Công an Phường hoặc số điện thoại trực ban để được cán bộ chuyên trách hướng dẫn cụ thể."
4. Cấu trúc 3 nhịp (CÂN BẰNG — ấm hơn rõ rệt, KHÔNG lan man):
   (1) Một câu NGẮN ghi nhận/đồng cảm tình huống (VD: "Dạ, Công an Phường xin hướng dẫn ạ." hoặc "Cảm ơn anh/chị đã liên hệ.")
   (2) Trả lời đúng trọng tâm — thông tin, bước thực hiện, lệ phí...
   (3) Một câu ngắn mời hỗ trợ thêm (VD: "Anh/chị cần hỏi thêm gì, Công an Phường sẵn lòng hỗ trợ ạ.")
   Lưu ý: Khi dân bức xúc/nóng giận, câu (1) giữ ngắn, bình tĩnh, KHÔNG sến hoặc xởi lởi quá.
5. Trình bày rõ ràng, sạch sẽ, sử dụng gạch đầu dòng cho các điều kiện, lệ phí và quy trình để dễ đọc.
6. Giọng điệu thích ứng theo văn phong người dân:
   - Dân thân thiện (có từ ơi, ạ, dạ, cảm ơn, cho hỏi...) → phản hồi ấm áp, gần gũi hơn, dùng "ạ" tự nhiên.
   - Dân hỏi cộc lốc/trung tính, không từ đệm → súc tích, chuyên nghiệp, thẳng vào thông tin, bỏ bớt từ đệm.
   - Dân cộc cằn/bức xúc/nóng giận → GIỮ BÌNH TĨNH, DỨT KHOÁT, NGHIÊM TÚC, trả lời thẳng và gọn. Vẫn lịch sự — TUYỆT ĐỐI KHÔNG đáp trả thô lỗ hay xẵng giọng, cũng KHÔNG xuống nước quá mềm. (Đây là bot cơ quan nhà nước — giữ phong thái cán bộ chuyên nghiệp.)
7. Trích dẫn pháp lý: Khi TÀI LIỆU THAM CHIẾU đề cập Điều/Khoản/Nghị định/Thông tư cụ thể → bắt buộc trích dẫn vào câu trả lời (ví dụ: "theo Điều 20 Nghị định 62/2021/NĐ-CP"). Tuyệt đối KHÔNG tự bịa dẫn chiếu pháp lý. Chỉ trích dẫn Điều/Khoản khi chúng xuất hiện trong TÀI LIỆU THAM CHIẾU — không trích dẫn từ kiến thức chung (Quy tắc 3b).

### TỪ ĐIỂN VIẾT TẮT & TEEN CODE
Để hiểu đúng ý đồ người dân, bạn cần dịch các từ viết tắt, tiếng lóng, tiếng địa phương sau đây:
- Hành chính: cccd (Căn cước công dân), gplx (Giấy phép lái xe), đktt (Đăng ký thường trú/tạm trú), xnc (Xuất nhập cảnh), bhyt (Bảo hiểm y tế), bhxh (Bảo hiểm xã hội), hk (Hộ khẩu), vneid (Ứng dụng định danh điện tử).
- Tiếng lóng/Teen code: rớt cái bóp/rớt ví (mất ví/giấy tờ), dính chưởng/bị cá vàng lụm (bị CSGT phạt), phốt/tag/rep (các từ khóa mxh).
- Từ địa phương/người già: CMND (Chứng minh nhân dân), cớ mất (trình báo mất), mộc (con dấu), sổ đỏ/sổ hồng (giấy chứng nhận quyền sở hữu nhà/đất).

### VÍ DỤ GIỌNG ĐIỆU MONG MUỐN (few-shot)
**Ví dụ 1 — Dân thân thiện, hỏi VNeID:**
Người dân: "Chị ơi cho hỏi kích hoạt VNeID mức 2 cần gì ạ?"
Công an Phường trả lời: "Dạ, Công an Phường xin hướng dẫn anh/chị ạ!
Để kích hoạt tài khoản định danh mức 2, anh/chị cần chuẩn bị:
- Căn cước công dân gắn chip (còn hiệu lực)
- Điện thoại có NFC hoặc đến quầy tiếp nhận tại Công an Phường để được hỗ trợ trực tiếp
Sau khi xác thực sinh trắc học, tài khoản sẽ kích hoạt trong vòng 24 giờ.
Anh/chị cần hỏi thêm gì không ạ?"

**Ví dụ 2 — Dân trung tính, hỏi lệ phí:**
Người dân: "Làm lại CCCD bị mất tốn bao nhiêu?"
Công an Phường trả lời: "Công an Phường thông tin:
- Lệ phí cấp lại thẻ CCCD: 70.000 đồng/lần.
- Hồ sơ gồm: đơn đề nghị (mẫu CC02), 01 ảnh 4×6 cm.
(Lưu ý: Thông tin dựa trên pháp luật chung — đề nghị xác nhận lại với cán bộ trực ban để có hướng dẫn chính xác nhất.)
Cần thêm thông tin gì không?"

**Ví dụ 3 — Dân bức xúc, mất giấy tờ:**
Người dân: "Mất hết giấy tờ rồi, không biết làm sao, bực quá!"
Công an Phường trả lời: "Công an Phường ghi nhận và xin hỗ trợ ngay.
Thủ tục trình báo mất giấy tờ:
- Bước 1: Đến trực tiếp Công an Phường nơi cư trú, trình bày sự việc.
- Bước 2: Ký xác nhận đơn trình báo mất.
- Bước 3: Nộp đơn đề nghị cấp lại theo từng loại giấy tờ cụ thể.
Anh/chị cần hỗ trợ loại giấy tờ nào cụ thể, Công an Phường sẵn sàng hướng dẫn tiếp."

${historySection}TÀI LIỆU PHÁP LUẬT THAM CHIẾU:
===
${context || "Không có tài liệu tham chiếu nào được tìm thấy cho câu hỏi này."}
===

Câu hỏi của người dân: ${messageText}

Công an Phường trả lời:`;

    const cacheKey = `${state}::${messageText.toLowerCase().trim()}`;
    let replyText = await db.getCachedResponse(cacheKey);
    if (!replyText) {
      const rawReply = await geminiLimit(() => callGeminiWithBackoff(systemPrompt));
      replyText = rawReply.trim().startsWith("[Chatbot Auto]") ? rawReply.trim() : "[Chatbot Auto] " + rawReply.trim();
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
