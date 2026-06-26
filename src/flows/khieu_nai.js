const menus = {
  'AGENT_KHIEU_NAI': [
    { title: "Khiếu nại Hành chính", payload: "FLOW_KN_HANHCHINH" },
    { title: "Tố giác Tội phạm", payload: "FLOW_KN_TOGIAC" },
    { title: "Danh bạ cán bộ Khiếu nại", payload: "FLOW_DANH_BA_KHIEU_NAI" },
    { title: "Hỏi đáp AI", payload: "FLOW_KN_AI" }
  ]
};

const responses = {
  'FLOW_KN_HANHCHINH': {
    agentState: 'AGENT_KHIEU_NAI',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị về khiếu nại hành chính ạ.\n\n📌 Anh/chị có thể nộp đơn khiếu nại quyết định/hành vi hành chính của cán bộ trực tiếp tại trực ban Công an Phường.\n📌 Lệ phí: miễn phí hoàn toàn.\n\nAnh/chị cần hỗ trợ thêm, cứ nhắn cho phường nhé.`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_TOGIAC': {
    agentState: 'AGENT_KHIEU_NAI',
    text: `Dạ, nếu anh/chị phát hiện trộm cắp, ma túy, đánh bạc... xin báo cho Công an phường ngay ạ.\n\n📌 Gọi ngay Hotline trực ban, hoặc nhắn tin trực tiếp vào Zalo này.\n📌 Mọi thông tin của anh/chị được BẢO MẬT TUYỆT ĐỐI.\n\nCông an phường cảm ơn anh/chị đã đồng hành giữ gìn an ninh.`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_AI': { agentState: 'AGENT_KHIEU_NAI', text: `Dạ, chế độ Hỏi đáp Khiếu nại đã mở. Anh/chị cứ đặt câu hỏi, bot giải đáp ngay ạ.`, openChat: true }
};

module.exports = { menus, responses };
