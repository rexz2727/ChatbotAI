const menus = {
  'AGENT_AN_NINH': [
    { title: "Giấy phép Kinh doanh ANTT", payload: "FLOW_AN_NINH_ANTT_MAIN" },
    { title: "Thủ tục PCCC", payload: "FLOW_AN_NINH_PCCC_MAIN" },
    { title: "An ninh mạng (Lừa đảo)", payload: "FLOW_AN_NINH_MANG_MAIN" },
    { title: "Hỏi đáp AI", payload: "FLOW_AN_NINH_AI" }
  ]
};

const responses = {
  // === ANTT ===
  'FLOW_AN_NINH_ANTT_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `[GIẤY CHỨNG NHẬN ĐỦ ĐIỀU KIỆN AN NINH TRẬT TỰ]\n\nDành cho cơ sở kinh doanh lưu trú dưới 10 phòng, cầm đồ, khí gas LPG...`,
    afterReplies: [
      { title: "Hồ sơ cần thiết", payload: "FLOW_AN_NINH_ANTT_HOSO" },
      { title: "Lệ phí", payload: "FLOW_AN_NINH_ANTT_FEE" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_ANTT_HOSO': {
    agentState: 'AGENT_AN_NINH',
    text: `[HỒ SƠ XIN GIẤY PHÉP ANTT]\n\n1. Văn bản đề nghị (Mẫu 03).\n2. Bản sao Giấy phép Kinh doanh.\n3. Bản khai lý lịch tư pháp của chủ cơ sở.\n4. Giấy tờ chứng minh đủ điều kiện PCCC.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_ANTT_MAIN" }
    ]
  },
  'FLOW_AN_NINH_ANTT_FEE': {
    agentState: 'AGENT_AN_NINH',
    text: `[LỆ PHÍ THẨM ĐỊNH ANTT]\n\n- Cấp mới: 300.000 đồng/lần.\n- Cấp đổi/cấp lại: 300.000 đồng/lần (Thông tư 43/2023/TT-BTC). Không có trường hợp miễn phí đối với cá nhân kinh doanh.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_ANTT_MAIN" }
    ]
  },

  // === PCCC ===
  'FLOW_AN_NINH_PCCC_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `[PHÊ DUYỆT PHƯƠNG ÁN PCCC]\n\nDành cho cơ sở kinh doanh, hộ gia đình thuộc diện quản lý PCCC của UBND cấp xã.\nLệ phí: Miễn phí thủ tục hành chính.`,
    afterReplies: [
      { title: "Hồ sơ Phê duyệt PCCC", payload: "FLOW_AN_NINH_PCCC_HOSO" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_PCCC_HOSO': {
    agentState: 'AGENT_AN_NINH',
    text: `[HỒ SƠ PHÊ DUYỆT PHƯƠNG ÁN PCCC]\n\n1. Văn bản đề nghị phê duyệt (Mẫu PC19).\n2. 02 bản Phương án chữa cháy của cơ sở (Mẫu PC17).\n\n📺 *Video Hướng Dẫn Lập Mẫu PC17:* https://youtube.com/watch?v=LapPhuongAnChuaChay`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_PCCC_MAIN" }
    ]
  },

  // === AN NINH MẠNG ===
  'FLOW_AN_NINH_MANG_MAIN': {
    agentState: 'AGENT_AN_NINH',
    text: `[TRÌNH BÁO LỪA ĐẢO QUA MẠNG]\n\nNếu bạn vừa bị lừa chuyển tiền, hack tài khoản, xin hãy bình tĩnh và làm theo các bước khẩn cấp sau!`,
    afterReplies: [
      { title: "Các bước KHẨN CẤP", payload: "FLOW_AN_NINH_MANG_KHANCAP" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_AN_NINH_MANG_KHANCAP': {
    agentState: 'AGENT_AN_NINH',
    text: `[XỬ LÝ KHẨN CẤP KHI BỊ LỪA ĐẢO MẠNG]\n\n🚨 1. Gọi điện TỔNG ĐÀI NGÂN HÀNG khóa thẻ/tài khoản ngay lập tức.\n🚨 2. Chụp màn hình (Screen capture) lại mọi tin nhắn, biên lai chuyển tiền, tài khoản kẻ gian.\n🚨 3. Ra Công an Phường gần nhất trình báo. (Miễn phí 100%).\n⚠️ Cảnh báo: KHÔNG tin lời các dịch vụ "Thu hồi tiền lừa đảo" trên mạng, đó là lừa đảo lần 2.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_AN_NINH_MANG_MAIN" }
    ]
  },

  'FLOW_AN_NINH_AI': {
    agentState: 'AGENT_AN_NINH',
    text: `Chế độ Hỏi đáp mở. Mời bạn đặt câu hỏi về ANTT, PCCC hoặc tội phạm mạng!`,
    openChat: true
  }
};

module.exports = { menus, responses };
