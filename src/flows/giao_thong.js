const menus = {
  'AGENT_GIAO_THONG': [
    { title: "Đăng ký Xe máy", payload: "FLOW_GT_DANGKY_MAIN" },
    { title: "Phạt nguội", payload: "FLOW_GT_PHATNGUOI_MAIN" },
    { title: "Đổi Giấy phép Lái xe", payload: "FLOW_GT_GPLX_MAIN" },
    { title: "Danh bạ cán bộ Giao thông", payload: "FLOW_DANH_BA_GIAO_THONG" },
    { title: "Hỏi đáp AI", payload: "FLOW_GT_AI" }
  ]
};

const responses = {
  // === ĐĂNG KÝ XE MÁY ===
  'FLOW_GT_DANGKY_MAIN': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục đăng ký xe máy ạ.\n\n📌 Công an Phường đã được phân cấp đăng ký xe mô tô, xe gắn máy, xe máy điện cho công dân có hộ khẩu tại phường.\n\n(Căn cứ: Luật Trật tự, an toàn giao thông đường bộ 36/2024/QH15)\n\nAnh/chị muốn xem nội dung nào ạ?`,
    afterReplies: [
      { title: "Hồ sơ & Thuế trước bạ", payload: "FLOW_GT_DANGKY_HOSO" },
      { title: "Quy trình Xét xe", payload: "FLOW_GT_DANGKY_QUYTRINH" },
      { title: "Bảng phí Biển số", payload: "FLOW_GT_DANGKY_FEE" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_HOSO': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, hồ sơ đăng ký xe máy anh/chị cần chuẩn bị gồm:\n\n📌 Hóa đơn điện tử mua xe (bản in).\n📌 Phiếu kiểm tra chất lượng xuất xưởng.\n📌 Chứng từ nộp lệ phí trước bạ (đã nộp tại cơ quan Thuế hoặc nộp online qua VNeID/eTax).\n📌 Căn cước công dân của chủ xe.`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_QUYTRINH': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, quy trình xét xe tại phường gồm các bước sau ạ:\n\n📌 Bước 1: Chủ xe kê khai Đăng ký xe trên Cổng DVC Bộ Công an, lấy "Mã hồ sơ".\n📌 Bước 2: Đem xe và toàn bộ hồ sơ gốc ra Trụ sở Công an Phường.\n📌 Bước 3: Cán bộ cà số khung, số máy và đối chiếu xe thực tế.\n📌 Bước 4: Bấm biển số ngẫu nhiên trên hệ thống và nộp lệ phí biển số.\n📌 Bước 5: Nhận biển số ngay và chờ giấy chứng nhận đăng ký xe.\n\n(Video hướng dẫn chi tiết đang được cập nhật)`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_FEE': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, lệ phí cấp biển số xe máy tính theo giá trị xe (theo quy định của Bộ Tài chính) ạ:\n\n💵 Xe từ 15 triệu trở xuống: 50.000đ - 1.000.000đ (tùy khu vực).\n💵 Xe trên 15 triệu đến 40 triệu: 100.000đ - 2.000.000đ.\n💵 Xe trên 40 triệu: 500.000đ - 4.000.000đ.\n💵 Xe máy điện: đồng giá quy định.`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === PHẠT NGUỘI ===
  'FLOW_GT_PHATNGUOI_MAIN': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, về phạt nguội, anh/chị có thể tự tra cứu và nộp phạt online ngay tại nhà, không cần ra cơ quan Công an ạ.\n\n(Video hướng dẫn nộp phạt đang được cập nhật)\n\nAnh/chị bấm nút bên dưới để lấy link tra cứu nhé:`,
    afterReplies: [
      { title: "Link Tra Cứu Vi Phạm", payload: "FLOW_GT_PHATNGUOI_LINK" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_PHATNGUOI_LINK': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, anh/chị tra cứu vi phạm theo một trong hai cách sau ạ:\n\n👉 Cổng thông tin điện tử Cục CSGT: http://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html\n👉 Hoặc tra cứu ngay trên app VNeID, mục Dịch vụ khác.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_GT_PHATNGUOI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === ĐỔI BẰNG LÁI ===
  'FLOW_GT_GPLX_MAIN': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục đổi Giấy phép lái xe (GPLX) ạ.\n\n📌 Từ 01/3/2025, việc cấp, đổi GPLX đã chuyển về Bộ Công an (Phòng CSGT Công an tỉnh/thành phố thực hiện); Công an Phường không trực tiếp cấp, đổi GPLX.\n📌 Đổi Online toàn quốc qua Cổng DVC Quốc gia / VNeID (cần có Giấy khám sức khỏe điện tử).\n📌 Lệ phí đổi GPLX: 135.000đ.\n\n(Căn cứ: Luật Trật tự, ATGT đường bộ 36/2024/QH15, Nghị định 168/2024/NĐ-CP & Thông tư 12/2025/TT-BCA)\n📺 Video hướng dẫn nộp Online: https://www.youtube.com/watch?v=vwwSydJlWao`,
    afterReplies: [
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  'FLOW_GT_AI': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Dạ, chế độ Hỏi đáp đã mở. Anh/chị cứ đặt câu hỏi về luật giao thông đường bộ, bot giải đáp ngay ạ!`,
    openChat: true
  }
};

module.exports = { menus, responses };
