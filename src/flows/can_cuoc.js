const menus = {
  'AGENT_CAN_CUOC': [
    { title: "Cấp Căn cước Lần đầu", payload: "FLOW_CAN_CUOC_LANDAU_MAIN" },
    { title: "Đổi/Cấp lại Căn cước", payload: "FLOW_CAN_CUOC_CAPLAI_MAIN" },
    { title: "Căn cước cho Trẻ em (<14t)", payload: "FLOW_CAN_CUOC_TREEM_MAIN" },
    { title: "Danh bạ cán bộ Căn cước", payload: "FLOW_DANH_BA_CAN_CUOC" },
    { title: "Hỏi đáp tự do (AI)", payload: "FLOW_CAN_CUOC_AI" }
  ]
};

const responses = {
  // === CẤP LẦN ĐẦU ===
  'FLOW_CAN_CUOC_LANDAU_MAIN': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[CẤP CĂN CƯỚC LẦN ĐẦU]\n\nDành cho công dân đủ 14 tuổi trở lên chưa từng làm Căn cước.\nThời hạn giải quyết: 07 ngày làm việc.\nLệ phí: MIỄN PHÍ hoàn toàn.\n\n📺 *Video Toàn Cảnh Quy Trình:* https://youtube.com/watch?v=CanCuocLanDau`,
    afterReplies: [
      { title: "Hồ sơ & Nơi làm", payload: "FLOW_CAN_CUOC_LANDAU_HOSO" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_LANDAU_HOSO': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[HỒ SƠ CẤP LẦN ĐẦU]\n\n- Không cần mang theo giấy tờ giấy nếu dữ liệu Dân cư đã đầy đủ.\n- Nếu dữ liệu thiếu: Mang theo Giấy khai sinh bản gốc.\n- Nơi làm: Công an cấp Huyện/Quận (Công an cấp Phường KHÔNG có chức năng thu nhận Căn cước).`,
    afterReplies: [
      { title: "Quay lại Căn cước", payload: "FLOW_CAN_CUOC_LANDAU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === ĐỔI / CẤP LẠI ===
  'FLOW_CAN_CUOC_CAPLAI_MAIN': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[ĐỔI HOẶC CẤP LẠI CĂN CƯỚC]\n\nBao gồm trường hợp thẻ hết hạn, hỏng, sai thông tin, đổi từ CMND sang Căn cước, hoặc bị mất thẻ.`,
    afterReplies: [
      { title: "Quy trình làm lại (khi Mất thẻ)", payload: "FLOW_CAN_CUOC_CAPLAI_ONLINE" },
      { title: "Chi tiết Lệ phí", payload: "FLOW_CAN_CUOC_CAPLAI_FEE" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_CAPLAI_ONLINE': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[LÀM LẠI CĂN CƯỚC KHI BỊ MẤT THẺ TRÊN VNeID]\n\n*Tin vui:* Nếu bạn mới làm CCCD chưa quá 5 năm (còn lưu mống mắt/vân tay), bạn không cần đến cơ quan Công an!\n\n📌 *Bước 1:* Mở ứng dụng VNeID, vào mục Dịch vụ công.\n📌 *Bước 2:* Chọn "Cấp lại thẻ Căn cước".\n📌 *Bước 3:* Xác nhận thông tin và thanh toán lệ phí online.\n📌 *Bước 4:* Đăng ký nhận thẻ Căn cước mới qua Bưu điện giao tận nhà.\n\n📺 *Video Hướng Dẫn:* https://youtube.com/watch?v=CapLaiCanCuoc_VNeID`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_CAPLAI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_CAPLAI_FEE': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[BẢNG LỆ PHÍ ĐỔI / CẤP LẠI CĂN CƯỚC]\n\n- 💵 Cấp đổi (do thẻ hỏng, hết hạn, đổi thông tin): 50.000 đồng.\n- 💵 Cấp lại (do bị mất thẻ): 70.000 đồng.\n\n🌟 *Trường hợp MIỄN PHÍ:*\n- Cấp đổi khi đến mốc tuổi 14, 25, 40, 60.\n- Cấp đổi do sai sót thông tin từ phía Cơ quan Công an.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_CAPLAI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === CĂN CƯỚC TRẺ EM ===
  'FLOW_CAN_CUOC_TREEM_MAIN': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[CĂN CƯỚC CHO TRẺ EM DƯỚI 14 TUỔI]\n\nLuật Căn cước 2023 (hiệu lực 01/07/2024) quy định cấp thẻ cho trẻ em dưới 14 tuổi (Không bắt buộc, theo nhu cầu).\nLệ phí lần đầu: MIỄN PHÍ.`,
    afterReplies: [
      { title: "Trẻ dưới 6 tuổi (Nộp Online 100%)", payload: "FLOW_CAN_CUOC_TREEM_DUOI6" },
      { title: "Trẻ từ 6 đến dưới 14 tuổi", payload: "FLOW_CAN_CUOC_TREEM_TREN6" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_TREEM_DUOI6': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[TRẺ DƯỚI 6 TUỔI]\n\n- Bố/mẹ thao tác 100% qua app VNeID.\n- Không thu nhận vân tay, không chụp ảnh khuôn mặt, không lấy mống mắt.\n- Thẻ sẽ được cấp và gửi về tận nhà.\n\n📺 *Video Hướng Dẫn VNeID:* https://youtube.com/watch?v=CanCuocTreEmDuoi6`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_TREEM_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_TREEM_TREN6': {
    agentState: 'AGENT_CAN_CUOC',
    text: `[TRẺ TỪ 6 - DƯỚI 14 TUỔI]\n\n- Bố/mẹ đưa trẻ đến Đội Cảnh sát QLHC Công an Quận/Huyện.\n- Sẽ tiến hành chụp ảnh khuôn mặt, thu vân tay và mống mắt của trẻ.\n- Bố/mẹ mang theo Căn cước và ứng dụng VNeID để xác thực tư cách người đại diện.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_TREEM_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === HỎI ĐÁP AI ===
  'FLOW_CAN_CUOC_AI': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Chế độ [Hỏi đáp bằng AI] đã bật.\nAnh/chị có thể nhập câu hỏi cụ thể. Bot sẽ kiểm tra dữ liệu và tư vấn.`,
    openChat: true
  }
};

module.exports = { menus, responses };
