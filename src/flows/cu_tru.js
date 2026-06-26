const menus = {
  'AGENT_CU_TRU': [
    { title: "Đăng ký Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
    { title: "Đăng ký Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
    { title: "Khai báo Tạm vắng", payload: "FLOW_CU_TRU_TAM_VANG_MAIN" },
    { title: "Danh bạ cán bộ Cư trú", payload: "FLOW_DANH_BA_CU_TRU" },
    { title: "Hỏi đáp tự do (AI)", payload: "FLOW_CU_TRU_AI" }
  ]
};

const responses = {
  // === THƯỜNG TRÚ ===
  'FLOW_CU_TRU_THUONG_TRU_MAIN': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục đăng ký thường trú (nhập hộ khẩu) ạ.\n\n📌 Căn cứ: Luật Cư trú 2020 & Nghị định 58/2026/NĐ-CP.\n\nAnh/chị muốn tìm hiểu nội dung nào, mời chọn giúp bên dưới ạ:`,
    afterReplies: [
      { title: "1. Hồ sơ cần chuẩn bị", payload: "FLOW_CU_TRU_TT_HOSO" },
      { title: "2. Quy trình Nộp Online", payload: "FLOW_CU_TRU_TT_ONLINE" },
      { title: "3. Quy trình Trực tiếp", payload: "FLOW_CU_TRU_TT_OFFLINE" },
      { title: "4. Lệ phí chi tiết", payload: "FLOW_CU_TRU_TT_FEE" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_HOSO': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, hồ sơ đăng ký thường trú anh/chị cần chuẩn bị gồm:\n\n📌 Tờ khai thay đổi thông tin cư trú (Mẫu CT01) — tải mẫu bằng cách gõ "xin biểu mẫu CT01".\n📌 Giấy tờ chứng minh chỗ ở hợp pháp (Sổ đỏ, Hợp đồng mua bán, hoặc Hợp đồng thuê nhà có công chứng).\n📌 Nếu nhập khẩu vào nhà người thân: cần chữ ký đồng ý của Chủ hộ trên Tờ khai CT01.\n\n(Căn cứ: Thông tư 53/2025/TT-BCA)\n📺 Video hướng dẫn viết Tờ khai CT01: https://www.youtube.com/watch?v=dxzEhyfv750`,
    afterReplies: [
      { title: "Xem cách nộp Online", payload: "FLOW_CU_TRU_TT_ONLINE" },
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_ONLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, anh/chị có thể nộp hồ sơ thường trú online ngay tại nhà, lại được GIẢM 50% lệ phí ạ:\n\n📌 Bước 1: Đăng nhập VNeID (Mức 2) hoặc Cổng DVC (dichvucong.gov.vn).\n📌 Bước 2: Chụp ảnh bản gốc các giấy tờ đã chuẩn bị, rõ nét.\n📌 Bước 3: Chọn "Đăng ký thường trú", điền form điện tử và đính kèm ảnh.\n📌 Bước 4: Thanh toán lệ phí trực tuyến.\n\n📺 Video hướng dẫn thao tác trên VNeID: https://www.youtube.com/watch?v=dxzEhyfv750`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_OFFLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, nếu muốn nộp trực tiếp, anh/chị vui lòng đến Công an phường ạ:\n\n📌 Nơi nộp: Bộ phận Một cửa - Công an Phường Bình Dương.\n📌 Giờ làm việc: Sáng 07h30 - 11h30; Chiều 13h30 - 17h00 (Từ Thứ 2 đến sáng Thứ 7).\n📌 Mang theo Căn cước công dân và toàn bộ BẢN GỐC giấy tờ nhà đất để cán bộ đối chiếu (Công an không giữ bản gốc của anh/chị).\n\nAnh/chị cứ đến, cán bộ sẽ hỗ trợ tận tình ạ.`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_FEE': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, lệ phí đăng ký thường trú như sau ạ:\n\n💵 Nộp trực tuyến (VNeID/DVC): giảm 50%, chỉ còn 10.000 đồng/lần.\n💵 Nộp trực tiếp tại phường: 20.000 đồng/lần.\n\n🌟 Miễn phí 100% với: hộ nghèo, hộ cận nghèo; trẻ em dưới 16 tuổi; người cao tuổi (từ đủ 60 tuổi); người khuyết tật, người có công với cách mạng.\n\n(Căn cứ: Thông tư 75/2022/TT-BTC)`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === TẠM TRÚ ===
  'FLOW_CU_TRU_TAM_TRU_MAIN': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục đăng ký tạm trú ạ.\n\n📌 Ai cần đăng ký: người đến sinh sống từ 30 ngày trở lên.\n📌 Thời hạn tạm trú tối đa 2 năm.\n\n(Căn cứ: Luật Cư trú 2020 & Nghị định 58/2026/NĐ-CP)\n\nAnh/chị muốn xem nội dung nào ạ?`,
    afterReplies: [
      { title: "1. Hồ sơ tạm trú", payload: "FLOW_CU_TRU_TAMT_HOSO" },
      { title: "2. Quy trình Online", payload: "FLOW_CU_TRU_TAMT_ONLINE" },
      { title: "3. Lệ phí tạm trú", payload: "FLOW_CU_TRU_TAMT_FEE" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_HOSO': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, hồ sơ đăng ký tạm trú gồm có:\n\n📌 Tờ khai CT01.\n📌 Bản sao CCCD.\n📌 Hợp đồng thuê nhà (hoặc văn bản đồng ý cho ở nhờ của chủ nhà).\n\n(Căn cứ: Thông tư 53/2025/TT-BCA)\n📺 Video hướng dẫn: https://www.youtube.com/watch?v=WC_mnMmiqL4`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_ONLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, anh/chị có thể ngồi tại nhà khai báo tạm trú, không cần ra phường ạ:\n\n📌 Khai báo qua app VNeID hoặc Cổng Dịch vụ công Bộ Công an.\n📌 Sau khi duyệt (tối đa 3 ngày), hệ thống gửi tin nhắn SMS báo hoàn tất.\n\n📺 Video thao tác VNeID: https://www.youtube.com/watch?v=WC_mnMmiqL4`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_FEE': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, lệ phí đăng ký tạm trú như sau ạ:\n\n💵 Nộp trực tuyến (VNeID/DVC): 7.000 đồng/lần.\n💵 Nộp trực tiếp tại phường: 15.000 đồng/lần.\n\n🌟 Miễn phí 100% với trẻ em, người cao tuổi, người khuyết tật.`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === TẠM VẮNG ===
  'FLOW_CU_TRU_TAM_VANG_MAIN': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, Công an phường xin lưu ý anh/chị về khai báo tạm vắng ạ:\n\n📌 Bắt buộc với: bị can, bị cáo, người đang chấp hành án, hoặc nam thanh niên trong độ tuổi nghĩa vụ quân sự khi đi khỏi địa phương.\n📌 Lệ phí: miễn phí hoàn toàn.\n\nAnh/chị cần hỗ trợ thêm, cứ nhắn cho phường nhé.`,
    afterReplies: [
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === HỎI ĐÁP AI ===
  'FLOW_CU_TRU_AI': {
    agentState: 'AGENT_CU_TRU',
    text: `Dạ, chế độ Hỏi đáp bằng AI đã bật.\nAnh/chị cứ nhập câu hỏi tình huống thực tế của mình, bot sẽ tra cứu luật và giải đáp ngay ạ!`,
    openChat: true
  }
};

module.exports = { menus, responses };
