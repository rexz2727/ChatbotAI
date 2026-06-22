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
    text: `[ĐĂNG KÝ XE MÁY TẠI CÔNG AN PHƯỜNG]\n\nChào bạn, hiện tại Công an Phường đã được phân cấp đăng ký xe mô tô, xe gắn máy, xe máy điện cho công dân có hộ khẩu tại phường.`,
    afterReplies: [
      { title: "Hồ sơ & Thuế trước bạ", payload: "FLOW_GT_DANGKY_HOSO" },
      { title: "Quy trình Xét xe", payload: "FLOW_GT_DANGKY_QUYTRINH" },
      { title: "Bảng phí Biển số", payload: "FLOW_GT_DANGKY_FEE" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_HOSO': {
    agentState: 'AGENT_GIAO_THONG',
    text: `[HỒ SƠ CẦN CHUẨN BỊ]\n\n1. Hóa đơn điện tử mua xe (Bản in).\n2. Phiếu kiểm tra chất lượng xuất xưởng.\n3. Chứng từ nộp lệ phí trước bạ (Đã nộp tại cơ quan Thuế hoặc nộp online qua VNeID/eTax).\n4. Căn cước công dân của chủ xe.`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_QUYTRINH': {
    agentState: 'AGENT_GIAO_THONG',
    text: `[QUY TRÌNH XÉT XE TẠI PHƯỜNG]\n\n📌 *Bước 1:* Chủ xe kê khai Đăng ký xe trên Cổng DVC Bộ Công an, lấy "Mã hồ sơ".\n📌 *Bước 2:* Đem xe và toàn bộ hồ sơ gốc ra Trụ sở Công an Phường.\n📌 *Bước 3:* Cán bộ tiến hành cà số khung, số máy và đối chiếu xe thực tế.\n📌 *Bước 4:* Bấm biển số ngẫu nhiên trên hệ thống và nộp lệ phí biển số.\n📌 *Bước 5:* Nhận biển số ngay và chờ giấy chứng nhận đăng ký xe.\n\n📺 *Video Hướng dẫn:* https://youtube.com/watch?v=DangKyXeMayPhuong`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_DANGKY_FEE': {
    agentState: 'AGENT_GIAO_THONG',
    text: `[LỆ PHÍ CẤP BIỂN SỐ XE MÁY]\n\nTheo quy định của Bộ Tài chính, lệ phí tính theo giá trị xe:\n- 💵 Xe trị giá từ 15 triệu trở xuống: 50.000đ - 1.000.000đ (tùy khu vực).\n- 💵 Xe trị giá trên 15 triệu đến 40 triệu: 100.000đ - 2.000.000đ.\n- 💵 Xe trị giá trên 40 triệu: 500.000đ - 4.000.000đ.\n- 💵 Xe máy điện: Đồng giá quy định.`,
    afterReplies: [
      { title: "Quay lại Giao thông", payload: "FLOW_GT_DANGKY_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === PHẠT NGUỘI ===
  'FLOW_GT_PHATNGUOI_MAIN': {
    agentState: 'AGENT_GIAO_THONG',
    text: `[TRA CỨU & NỘP PHẠT NGUỘI]\n\nBạn có thể tự tra cứu và nộp phạt online tại nhà mà không cần ra cơ quan Công an.\n\n📺 *Video Tra Cứu và Nộp Phạt:* https://youtube.com/watch?v=TraCuuPhatNguoi`,
    afterReplies: [
      { title: "Link Tra Cứu Vi Phạm", payload: "FLOW_GT_PHATNGUOI_LINK" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_GT_PHATNGUOI_LINK': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Truy cập Cổng thông tin điện tử Cục CSGT để tra cứu:\n👉 Link: http://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html\n👉 Hoặc tra cứu ngay trên app VNeID mục Dịch vụ khác.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_GT_PHATNGUOI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === ĐỔI BẰNG LÁI ===
  'FLOW_GT_GPLX_MAIN': {
    agentState: 'AGENT_GIAO_THONG',
    text: `[ĐỔI GIẤY PHÉP LÁI XE (GPLX)]\n\n- Cơ quan cấp: Sở Giao thông Vận tải (Công an Phường không cấp GPLX).\n- Đổi Online toàn quốc qua Cổng DVC Quốc gia (yêu cầu có Giấy khám sức khỏe điện tử).\n- Lệ phí đổi GPLX: 135.000đ.\n\n📺 *Video Hướng Dẫn Nộp Online:* https://youtube.com/watch?v=DoiGPLX_Online`,
    afterReplies: [
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  'FLOW_GT_AI': {
    agentState: 'AGENT_GIAO_THONG',
    text: `Chế độ Hỏi đáp mở. Mời bạn đặt câu hỏi về luật giao thông đường bộ!`,
    openChat: true
  }
};

module.exports = { menus, responses };
