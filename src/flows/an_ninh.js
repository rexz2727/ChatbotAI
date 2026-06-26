const menus = {
  'AGENT_AN_NINH': [
    { title: "Giấy phép Kinh doanh ANTT", payload: "FLOW_AN_NINH_ANTT_MAIN" },
    { title: "Thủ tục PCCC", payload: "FLOW_AN_NINH_PCCC_MAIN" },
    { title: "An ninh mạng (Lừa đảo)", payload: "FLOW_AN_NINH_MANG_MAIN" },
    { title: "Danh bạ cán bộ An ninh", payload: "FLOW_DANH_BA_AN_NINH" },
    { title: "Hỏi đáp AI", payload: "FLOW_AN_NINH_AI" }
  ]
};

const responses = {
  // === ANTT ===
  'FLOW_AN_NINH_ANTT_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục Giấy chứng nhận đủ điều kiện An ninh trật tự ạ.\n\n📌 Áp dụng cho cơ sở kinh doanh lưu trú dưới 10 phòng, cầm đồ, khí gas LPG...\n\nAnh/chị muốn xem nội dung nào ạ?`,
    afterReplies: [
      { title: "Hồ sơ cần thiết", payload: "FLOW_AN_NINH_ANTT_HOSO" },
      { title: "Lệ phí", payload: "FLOW_AN_NINH_ANTT_FEE" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_ANTT_HOSO': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, hồ sơ xin Giấy phép ANTT anh/chị cần chuẩn bị gồm:\n\n📌 Văn bản đề nghị (Mẫu 03).\n📌 Bản sao Giấy phép Kinh doanh.\n📌 Bản khai lý lịch tư pháp của chủ cơ sở.\n📌 Giấy tờ chứng minh đủ điều kiện PCCC.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_ANTT_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_ANTT_FEE': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, lệ phí thẩm định ANTT như sau ạ:\n\n💵 Cấp mới: 300.000 đồng/lần.\n💵 Cấp đổi/cấp lại: 300.000 đồng/lần.\n\nLưu ý: không có trường hợp miễn phí đối với cá nhân kinh doanh.\n\n(Căn cứ: Thông tư 43/2023/TT-BTC)`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_ANTT_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === PCCC ===
  'FLOW_AN_NINH_PCCC_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục phê duyệt phương án PCCC ạ.\n\n📌 Áp dụng cho cơ sở kinh doanh, hộ gia đình thuộc diện quản lý PCCC của UBND cấp xã.\n📌 Lệ phí: miễn phí thủ tục hành chính.\n\nAnh/chị bấm nút bên dưới để xem hồ sơ nhé:`,
    afterReplies: [
      { title: "Hồ sơ Phê duyệt PCCC", payload: "FLOW_AN_NINH_PCCC_HOSO" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_PCCC_HOSO': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, hồ sơ phê duyệt phương án PCCC gồm có:\n\n📌 Văn bản đề nghị phê duyệt (Mẫu PC19).\n📌 02 bản Phương án chữa cháy của cơ sở (Mẫu PC17).\n\n(Video hướng dẫn lập mẫu PC17 đang được cập nhật)`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_PCCC_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === AN NINH MẠNG ===
  'FLOW_AN_NINH_MANG_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, nếu anh/chị vừa bị lừa chuyển tiền hay bị hack tài khoản, xin hãy thật bình tĩnh ạ.\n\nCông an phường sẽ hướng dẫn anh/chị các bước khẩn cấp ngay. Anh/chị bấm nút bên dưới nhé:`,
    afterReplies: [
      { title: "Các bước KHẨN CẤP", payload: "FLOW_AN_NINH_MANG_KHANCAP" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_MANG_KHANCAP': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, anh/chị bình tĩnh làm ngay các bước khẩn cấp này ạ:\n\n🚨 1. Gọi TỔNG ĐÀI NGÂN HÀNG khóa thẻ/tài khoản ngay lập tức.\n🚨 2. Chụp màn hình mọi tin nhắn, biên lai chuyển tiền, tài khoản kẻ gian.\n🚨 3. Ra Công an Phường gần nhất trình báo (miễn phí 100%).\n\n⚠️ Cảnh báo: KHÔNG tin các dịch vụ "Thu hồi tiền lừa đảo" trên mạng — đó là lừa đảo lần 2.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_MANG_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  'FLOW_AN_NINH_AI': {
    agentState: 'AGENT_AN_NINH',
    text: `Dạ, chế độ Hỏi đáp đã mở. Anh/chị cứ đặt câu hỏi về ANTT, PCCC hoặc tội phạm mạng, bot giải đáp ngay ạ!`,
    openChat: true
  }
};

module.exports = { menus, responses };
