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
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục cấp Căn cước lần đầu ạ.\n\n📌 Đối tượng: công dân đủ 14 tuổi trở lên, chưa từng làm Căn cước.\n📌 Thời hạn giải quyết: 07 ngày làm việc.\n📌 Lệ phí: MIỄN PHÍ hoàn toàn.\n\n(Căn cứ: Nghị định 58/2026/NĐ-CP & Luật Căn cước)\n📺 Video toàn cảnh quy trình: https://youtube.com/watch?v=oQf7MYWwHJY`,
    afterReplies: [
      { title: "Hồ sơ & Nơi làm", payload: "FLOW_CAN_CUOC_LANDAU_HOSO" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_LANDAU_HOSO': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, về hồ sơ và nơi làm Căn cước lần đầu, anh/chị lưu ý giúp ạ:\n\n📌 Không cần mang theo giấy tờ giấy nếu dữ liệu Dân cư đã đầy đủ.\n📌 Nếu dữ liệu còn thiếu: mang theo Giấy khai sinh bản gốc.\n📌 Nơi làm: Công an cấp Huyện/Quận (Công an cấp Phường KHÔNG có chức năng thu nhận Căn cước).`,
    afterReplies: [
      { title: "Quay lại Căn cước", payload: "FLOW_CAN_CUOC_LANDAU_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === ĐỔI / CẤP LẠI ===
  'FLOW_CAN_CUOC_CAPLAI_MAIN': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị thủ tục đổi hoặc cấp lại Căn cước ạ.\n\n📌 Áp dụng khi: thẻ hết hạn, hỏng, sai thông tin, đổi từ CMND sang Căn cước, hoặc bị mất thẻ.\n\n(Căn cứ: Nghị định 58/2026/NĐ-CP)\n\nAnh/chị muốn xem nội dung nào ạ?`,
    afterReplies: [
      { title: "Quy trình làm lại (khi Mất thẻ)", payload: "FLOW_CAN_CUOC_CAPLAI_ONLINE" },
      { title: "Chi tiết Lệ phí", payload: "FLOW_CAN_CUOC_CAPLAI_FEE" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_CAPLAI_ONLINE': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, khi bị mất thẻ, anh/chị có thể làm lại Căn cước ngay trên VNeID ạ.\n\n🌟 Tin vui: nếu anh/chị mới làm CCCD chưa quá 5 năm (còn lưu mống mắt/vân tay) thì không cần đến cơ quan Công an!\n\n📌 Bước 1: Mở app VNeID, vào mục Dịch vụ công.\n📌 Bước 2: Chọn "Cấp lại thẻ Căn cước".\n📌 Bước 3: Xác nhận thông tin và thanh toán lệ phí online.\n📌 Bước 4: Đăng ký nhận thẻ mới qua Bưu điện giao tận nhà.\n\n(Căn cứ: Nghị định 58/2026/NĐ-CP)\n📺 Video hướng dẫn: https://www.youtube.com/watch?v=R0VJjNcalCM`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_CAPLAI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_CAPLAI_FEE': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, lệ phí đổi / cấp lại Căn cước như sau ạ:\n\n💵 Cấp đổi (do thẻ hỏng, hết hạn, đổi thông tin): 50.000 đồng.\n💵 Cấp lại (do bị mất thẻ): 70.000 đồng.\n\n🌟 Miễn phí với: cấp đổi khi đến mốc tuổi 14, 25, 40, 60; hoặc cấp đổi do sai sót thông tin từ phía Cơ quan Công an.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_CAPLAI_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === CĂN CƯỚC TRẺ EM ===
  'FLOW_CAN_CUOC_TREEM_MAIN': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, Công an phường xin hướng dẫn anh/chị làm Căn cước cho trẻ dưới 14 tuổi ạ.\n\n📌 Luật Căn cước 2023 (hiệu lực 01/07/2024) cho phép cấp thẻ cho trẻ dưới 14 tuổi — không bắt buộc, theo nhu cầu.\n📌 Lệ phí lần đầu: MIỄN PHÍ.\n\n(Căn cứ: Luật Căn cước 2023 & Nghị định 58/2026/NĐ-CP)\n\nAnh/chị chọn nhóm tuổi của bé bên dưới giúp ạ:`,
    afterReplies: [
      { title: "Trẻ dưới 6 tuổi (Nộp Online 100%)", payload: "FLOW_CAN_CUOC_TREEM_DUOI6" },
      { title: "Trẻ từ 6 đến dưới 14 tuổi", payload: "FLOW_CAN_CUOC_TREEM_TREN6" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_TREEM_DUOI6': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, với bé dưới 6 tuổi, bố/mẹ làm rất tiện ạ:\n\n📌 Bố/mẹ thao tác 100% qua app VNeID, không cần đưa bé đi đâu.\n📌 Không thu vân tay, không chụp ảnh khuôn mặt, không lấy mống mắt.\n📌 Thẻ được cấp và gửi về tận nhà.\n\n📺 Video hướng dẫn VNeID: https://www.youtube.com/watch?v=nv2S49avDhY`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_TREEM_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },
  'FLOW_CAN_CUOC_TREEM_TREN6': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, với bé từ 6 đến dưới 14 tuổi, bố/mẹ lưu ý giúp ạ:\n\n📌 Bố/mẹ đưa bé đến Đội Cảnh sát QLHC Công an Quận/Huyện.\n📌 Cán bộ sẽ chụp ảnh khuôn mặt, thu vân tay và mống mắt của bé.\n📌 Bố/mẹ mang theo Căn cước và app VNeID để xác thực tư cách người đại diện.`,
    afterReplies: [
      { title: "Quay lại", payload: "FLOW_CAN_CUOC_TREEM_MAIN" },
      { title: "Quay về Menu chính", payload: "SHOW_MAIN_MENU" }
    ]
  },

  // === HỎI ĐÁP AI ===
  'FLOW_CAN_CUOC_AI': {
    agentState: 'AGENT_CAN_CUOC',
    text: `Dạ, chế độ Hỏi đáp bằng AI đã bật.\nAnh/chị cứ nhập câu hỏi cụ thể, bot sẽ kiểm tra dữ liệu và tư vấn ngay ạ.`,
    openChat: true
  }
};

module.exports = { menus, responses };
