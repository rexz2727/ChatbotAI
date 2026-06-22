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
    text: `[KHIẾU NẠI HÀNH CHÍNH]\n\nBạn có thể nộp đơn khiếu nại quyết định/hành vi hành chính của cán bộ trực tiếp tại trực ban Công an Phường. Miễn phí hoàn toàn.`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_TOGIAC': {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[TỐ GIÁC TỘI PHẠM]\n\nNếu phát hiện trộm cắp, ma túy, đánh bạc... xin vui lòng gọi ngay Hotline trực ban hoặc nhắn tin trực tiếp vào Zalo này. Mọi thông tin của bạn được BẢO MẬT TUYỆT ĐỐI.`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_KN_AI': { agentState: 'AGENT_KHIEU_NAI', text: `Chế độ Hỏi đáp Khiếu nại. Xin mời đặt câu hỏi.`, openChat: true }
};

module.exports = { menus, responses };
