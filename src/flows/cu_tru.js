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
    text: `[CHUYÊN ĐỀ ĐĂNG KÝ THƯỜNG TRÚ (NHẬP HỘ KHẨU)]\n\nChào bạn, để thủ tục được nhanh chóng, vui lòng chọn thông tin bạn cần tìm hiểu bên dưới:`,
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
    text: `[HỒ SƠ ĐĂNG KÝ THƯỜNG TRÚ]\n\nBao gồm:\n1. Tờ khai thay đổi thông tin cư trú (Mẫu CT01). Tải mẫu: https://phuongbinhduong.gov.vn/forms/CT01.pdf\n2. Giấy tờ chứng minh chỗ ở hợp pháp (Sổ đỏ, Hợp đồng mua bán, hoặc Hợp đồng thuê nhà có công chứng).\n3. Nếu nhập khẩu vào nhà người thân: Phải có chữ ký đồng ý của Chủ hộ vào Tờ khai CT01.\n\n📺 *Video Hướng Dẫn Cách Viết Tờ Khai CT01:* https://youtube.com/watch?v=HuongDan_CT01`,
    afterReplies: [
      { title: "Xem cách nộp Online", payload: "FLOW_CU_TRU_TT_ONLINE" },
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_ONLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `[NỘP HỒ SƠ ONLINE QUA VNeID/DVC]\n\nKhuyến khích nộp Online để được GIẢM 50% LỆ PHÍ!\n\n📌 *Bước 1:* Đăng nhập VNeID (Mức 2) hoặc Cổng DVC (dichvucong.gov.vn).\n📌 *Bước 2:* Chụp ảnh bản gốc rõ nét các giấy tờ đã chuẩn bị.\n📌 *Bước 3:* Chọn "Đăng ký thường trú", điền form điện tử và đính kèm ảnh chụp.\n📌 *Bước 4:* Thanh toán lệ phí trực tuyến.\n\n📺 *Video Hướng Dẫn Thao Tác Trên VNeID:* https://youtube.com/watch?v=NopCuTruOnline`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_OFFLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `[NỘP TRỰC TIẾP TẠI CÔNG AN PHƯỜNG]\n\n- Nơi nộp: Bộ phận Một cửa - Công an Phường Bình Dương.\n- Giờ làm việc: Sáng 07h30 - 11h30; Chiều 13h30 - 17h00 (Từ Thứ 2 đến sáng Thứ 7).\n- Lưu ý: Mang theo Căn cước công dân và toàn bộ BẢN GỐC giấy tờ nhà đất để cán bộ đối chiếu (Công an không giữ bản gốc của bạn).`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TT_FEE': {
    agentState: 'AGENT_CU_TRU',
    text: `[BẢNG CHI TIẾT LỆ PHÍ THƯỜNG TRÚ]\n\nCăn cứ Thông tư 75/2022/TT-BTC:\n- 💵 *Nộp trực tuyến (VNeID/DVC):* Giảm 50%, chỉ còn 10.000 đồng/lần.\n- 💵 *Nộp trực tiếp tại phường:* 20.000 đồng/lần.\n\n🌟 *Trường hợp MIỄN PHÍ 100%:*\n- Hộ nghèo, hộ cận nghèo.\n- Trẻ em dưới 16 tuổi.\n- Người cao tuổi (từ đủ 60 tuổi).\n- Người khuyết tật, người có công với cách mạng.`,
    afterReplies: [
      { title: "Quay lại Thường trú", payload: "FLOW_CU_TRU_THUONG_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === TẠM TRÚ ===
  'FLOW_CU_TRU_TAM_TRU_MAIN': {
    agentState: 'AGENT_CU_TRU',
    text: `[CHUYÊN ĐỀ ĐĂNG KÝ TẠM TRÚ]\n\nNgười dân đến sinh sống từ 30 ngày trở lên phải đăng ký tạm trú (thời hạn tạm trú tối đa 2 năm). Bạn muốn xem nội dung nào?`,
    afterReplies: [
      { title: "1. Hồ sơ tạm trú", payload: "FLOW_CU_TRU_TAMT_HOSO" },
      { title: "2. Quy trình Online", payload: "FLOW_CU_TRU_TAMT_ONLINE" },
      { title: "3. Lệ phí tạm trú", payload: "FLOW_CU_TRU_TAMT_FEE" },
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_HOSO': {
    agentState: 'AGENT_CU_TRU',
    text: `[HỒ SƠ ĐĂNG KÝ TẠM TRÚ]\n\n1. Tờ khai CT01.\n2. Bản sao CCCD.\n3. Hợp đồng thuê nhà (hoặc văn bản đồng ý cho ở nhờ của chủ nhà).\n\n📺 *Video Hướng Dẫn:* https://youtube.com/watch?v=HuongDan_TamTru`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_ONLINE': {
    agentState: 'AGENT_CU_TRU',
    text: `[NỘP TẠM TRÚ ONLINE]\n\nBạn hoàn toàn có thể ngồi tại nhà khai báo tạm trú qua app VNeID hoặc Cổng Dịch Vụ Công Bộ Công An.\nSau khi duyệt thành công (tối đa 3 ngày), hệ thống sẽ gửi tin nhắn SMS thông báo hoàn tất.\n\n📺 *Video Thao Tác VNeID:* https://youtube.com/watch?v=TamTruVneID`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CU_TRU_TAMT_FEE': {
    agentState: 'AGENT_CU_TRU',
    text: `[LỆ PHÍ TẠM TRÚ]\n\n- 💵 *Nộp trực tuyến (VNeID/DVC):* 7.000 đồng/lần.\n- 💵 *Nộp trực tiếp tại phường:* 15.000 đồng/lần.\n\nTrẻ em, người cao tuổi, người khuyết tật được miễn phí 100%.`,
    afterReplies: [
      { title: "Quay lại Tạm trú", payload: "FLOW_CU_TRU_TAM_TRU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === TẠM VẮNG ===
  'FLOW_CU_TRU_TAM_VANG_MAIN': {
    agentState: 'AGENT_CU_TRU',
    text: `[KHAI BÁO TẠM VẮNG]\n\nChỉ áp dụng bắt buộc khi bạn là Bị can, Bị cáo, Người đang chấp hành án, hoặc Nam thanh niên trong độ tuổi nghĩa vụ quân sự đi khỏi địa phương.\nLệ phí: Miễn phí hoàn toàn.`,
    afterReplies: [
      { title: "Quay lại", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === HỎI ĐÁP AI ===
  'FLOW_CU_TRU_AI': {
    agentState: 'AGENT_CU_TRU',
    text: `Chế độ [Hỏi đáp bằng AI] đã bật.\nAnh/chị cứ nhập câu hỏi tình huống thực tế của mình nhé. Bot sẽ tra cứu luật và giải đáp ngay!`,
    openChat: true
  }
};

module.exports = { menus, responses };
