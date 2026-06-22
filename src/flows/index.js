const cuTru = require('./cu_tru');
const canCuoc = require('./can_cuoc');
const giaoThong = require('./giao_thong');
const anNinh = require('./an_ninh');

// For remaining modules, we implement them here for brevity
const remainingMenus = {
  'AGENT_NGOAI_KIEU': [
    { title: "Khai báo Tạm trú cho Người Nước Ngoài", payload: "FLOW_NK_TAMTRU" },
    { title: "Hỏi đáp AI", payload: "FLOW_NK_AI" }
  ],
  'AGENT_KHIEU_NAI': [
    { title: "Khiếu nại Hành chính", payload: "FLOW_KN_HANHCHINH" },
    { title: "Tố giác Tội phạm", payload: "FLOW_KN_TOGIAC" },
    { title: "Hỏi đáp AI", payload: "FLOW_KN_AI" }
  ],
  'AGENT_TTHC': [
    { title: "Hỏi đáp TTHC chung", payload: "FLOW_TTHC_AI" }
  ],
  'AGENT_LIEN_HE': [
    { title: "Thông tin Liên hệ", payload: "FLOW_LH_MAIN" }
  ]
};

const remainingResponses = {
  'FLOW_NK_TAMTRU': {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI]\n\nChủ cơ sở cho thuê bắt buộc phải khai báo trong 12 giờ (đối với vùng sâu là 24 giờ).\nLệ phí: Miễn phí hoàn toàn.\n\n🌐 Cổng khai báo Online: https://ngoaikiue.bocongan.gov.vn\n📺 Video Hướng dẫn: https://youtube.com/watch?v=NgoaiKieu_TamTru`,
    afterReplies: [{ title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_NK_AI': { agentState: 'AGENT_NGOAI_KIEU', text: `Chế độ Hỏi đáp về người nước ngoài. Xin mời đặt câu hỏi.`, openChat: true },

  'FLOW_KN_HANHCHINH': {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[KHIẾU NẠI HÀNH CHÍNH]\n\nBạn có thể nộp đơn khiếu nại quyết định/hành vi hành chính của cán bộ trực tiếp tại trực ban Công an Phường. Miễn phí hoàn toàn.`,
    afterReplies: [{ title: "Quay lại", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_TOGIAC': {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[TỐ GIÁC TỘI PHẠM]\n\nNếu phát hiện trộm cắp, ma túy, đánh bạc... xin vui lòng gọi ngay Hotline trực ban hoặc nhắn tin trực tiếp vào Zalo này. Mọi thông tin của bạn được BẢO MẬT TUYỆT ĐỐI.`,
    afterReplies: [{ title: "Quay lại", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_AI': { agentState: 'AGENT_KHIEU_NAI', text: `Chế độ Hỏi đáp Khiếu nại. Xin mời đặt câu hỏi.`, openChat: true },
  
  'FLOW_TTHC_AI': { agentState: 'AGENT_TTHC', text: `Xin mời đặt câu hỏi về TTHC khác.`, openChat: true },

  'FLOW_LH_MAIN': {
    agentState: 'AGENT_LIEN_HE',
    text: `[THÔNG TIN LIÊN HỆ CÔNG AN PHƯỜNG BÌNH DƯƠNG]\n\n📍 Địa chỉ: 123 Đường Bình Dương, Phường Bình Dương, Thành phố Bình Dương.\n☎️ Số điện thoại trực ban (24/24): 0274.382xxxx\n⏰ Giờ hành chính: Sáng 07h30-11h30, Chiều 13h30-17h00.`,
    afterReplies: [{ title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" }]
  }
};

const allMenus = {
  ...cuTru.menus,
  ...canCuoc.menus,
  ...giaoThong.menus,
  ...anNinh.menus,
  ...remainingMenus
};

const allResponses = {
  ...cuTru.responses,
  ...canCuoc.responses,
  ...giaoThong.responses,
  ...anNinh.responses,
  ...remainingResponses
};

module.exports = {
  getStaticResponse: (payload) => {
    return allResponses[payload] || null;
  },
  getSubMenu: (agentState) => {
    return allMenus[agentState] || [];
  }
};
