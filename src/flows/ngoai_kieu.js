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
    text: `Dạ, Công an phường xin hướng dẫn anh/chị khai báo tạm trú cho người nước ngoài ạ.\n\n📌 Chủ cơ sở cho thuê bắt buộc khai báo trong 12 giờ (vùng sâu là 24 giờ).\n📌 Lệ phí: miễn phí hoàn toàn.\n\n🌐 Cổng khai báo Online: https://ngoaikiue.bocongan.gov.vn\n📺 Video hướng dẫn: https://www.youtube.com/watch?v=ok7hQXYwf5E`,
    afterReplies: [{ title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }]
  },
  'FLOW_NK_AI': { agentState: 'AGENT_NGOAI_KIEU', text: `Dạ, chế độ Hỏi đáp về người nước ngoài đã mở. Anh/chị cứ đặt câu hỏi, bot giải đáp ngay ạ.`, openChat: true }
};

module.exports = { menus, responses };
