const flows = require('./flows/index');

// Thêm luồng (flow) tĩnh để hướng dẫn tải biểu mẫu
const TAI_BIEU_MAU_MENU = [
  { title: "Mẫu CT01 (Cư trú)", payload: "FLOW_FORM_CT01" },
  { title: "Mẫu PCCC", payload: "FLOW_FORM_PCCC" },
  { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
];

const bieuMauResponses = {
  'FLOW_TAI_BIEU_MAU': {
    text: "Vui lòng chọn biểu mẫu bạn muốn tải (Nếu dùng Zalo, vui lòng gõ mã tương ứng):\n[Mã: FLOW_FORM_CT01] Mẫu CT01 - Cư trú\n[Mã: FLOW_FORM_PCCC] Mẫu PCCC",
    openChat: false,
    afterReplies: TAI_BIEU_MAU_MENU,
    agentState: "AGENT_TAI_BIEU_MAU"
  },
  'FLOW_FORM_CT01': {
    text: "Bạn có thể tải biểu mẫu CT01 (Tờ khai thay đổi thông tin cư trú) tại đây: docs/forms/CT01_To_Khai_Cu_Tru.pdf\n\nHướng dẫn: Bạn cần điền đầy đủ các mục bắt buộc có dấu (*). Ký và ghi rõ họ tên ở phần người khai.",
    openChat: true,
    agentState: "AGENT_TAI_BIEU_MAU"
  },
  'FLOW_FORM_PCCC': {
    text: "Bạn có thể tải biểu mẫu PCCC tại đây: docs/forms/Mau_PCCC.pdf\n\nHướng dẫn: Bạn cần điền đầy đủ các mục bắt buộc có dấu (*).",
    openChat: true,
    agentState: "AGENT_TAI_BIEU_MAU"
  }
};

const originalGetStaticResponse = flows.getStaticResponse;
const originalGetSubMenu = flows.getSubMenu;

module.exports = {
  getStaticResponse: (payload) => {
    if (bieuMauResponses[payload]) return bieuMauResponses[payload];
    return originalGetStaticResponse(payload);
  },
  getSubMenu: (agentState) => {
    if (agentState === 'AGENT_TAI_BIEU_MAU') return TAI_BIEU_MAU_MENU;
    return originalGetSubMenu(agentState);
  }
};

// --- Monkey patches to inject "Tải biểu mẫu" without modifying chatbot.js or index.js ---

setTimeout(() => {
  try {
    // 1. Intercept processUserMessage to add quickReplies for Facebook Main Menu
    const chatbot = require('./chatbot');
    if (chatbot && typeof chatbot.processUserMessage === 'function') {
      const originalProcess = chatbot.processUserMessage;
      chatbot.processUserMessage = async function(userId, messageText, buttonPayload) {
        const result = await originalProcess(userId, messageText, buttonPayload);
        
        // If this is the main menu, inject quickReplies for Facebook
        if (result && result.showMenu) {
          result.quickReplies = [
            { title: "Cư trú", payload: "MENU_CU_TRU" },
            { title: "Căn cước", payload: "MENU_CAN_CUOC" },
            { title: "Giao thông", payload: "MENU_GIAO_THONG" },
            { title: "An ninh & PCCC", payload: "MENU_AN_NINH" },
            { title: "Ngoại kiều", payload: "MENU_NGOAI_KIEU" },
            { title: "Khiếu nại", payload: "MENU_KHIEU_NAI" },
            { title: "Liên hệ cơ quan", payload: "FLOW_LIEN_HE" },
            { title: "Góp ý Hệ thống", payload: "MENU_GOP_Y" },
            { title: "Tải biểu mẫu", payload: "FLOW_TAI_BIEU_MAU" } // New button!
          ];
        }
        return result;
      };
    }
  } catch (err) {
    console.error("Patching chatbot failed:", err);
  }
}, 0);

// 2. Intercept global fetch to add the button to Zalo's hardcoded media template payload
const originalFetch = global.fetch;
if (originalFetch) {
  global.fetch = async function(url, options) {
    if (url === 'https://openapi.zalo.me/v3.0/oa/message/transaction' && options && options.body) {
      try {
        const bodyObj = JSON.parse(options.body);
        if (bodyObj && bodyObj.message && bodyObj.message.attachment && 
            bodyObj.message.attachment.payload && bodyObj.message.attachment.payload.elements) {
          const elements = bodyObj.message.attachment.payload.elements;
          
          // Zalo template currently has 2 elements (4 buttons each). 
          // We append a 3rd element with our "Tải biểu mẫu" button.
          if (elements.length === 2) {
            elements.push({
              media_type: "image",
              url: "https://example.com/logo.png", // Same placeholder as original
              buttons: [
                { title: "Tải biểu mẫu", type: "oa.query.show", payload: "FLOW_TAI_BIEU_MAU" }
              ]
            });
            options.body = JSON.stringify(bodyObj);
          }
        }
      } catch (e) {
        // Ignore parse errors, let original fetch handle it
      }
    }
    return originalFetch.apply(this, arguments);
  };
}
