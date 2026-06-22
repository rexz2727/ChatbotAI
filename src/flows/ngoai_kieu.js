const menus = {
  'AGENT_NGOAI_KIEU': [
    { title: "Khai báo Tạm trú cho Người Nước Ngoài", payload: "FLOW_NK_TAMTRU" },
    { title: "Danh bạ cán bộ Ngoại kiều", payload: "FLOW_DANH_BA_NGOAI_KIEU" },
    { title: "Hỏi đáp AI", payload: "FLOW_NK_AI" }
  ]
};

const responses = {
  'FLOW_NK_TAMTRU': {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI]\n\nChủ cơ sở cho thuê bắt buộc phải khai báo trong 12 giờ (đối với vùng sâu là 24 giờ).\nLệ phí: Miễn phí hoàn toàn.\n\n🌐 Cổng khai báo Online: https://ngoaikiue.bocongan.gov.vn\n📺 Video Hướng dẫn: https://www.youtube.com/watch?v=ok7hQXYwf5E`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_NK_AI': { agentState: 'AGENT_NGOAI_KIEU', text: `Chế độ Hỏi đáp về người nước ngoài. Xin mời đặt câu hỏi.`, openChat: true }
};

module.exports = { menus, responses };
