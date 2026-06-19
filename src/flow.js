'use strict';

const subMenus = {
  AGENT_CU_TRU: [
    { title: "Đăng ký thường trú", payload: "FLOW_CU_TRU_THUONG_TRU" },
    { title: "Đăng ký tạm trú",    payload: "FLOW_CU_TRU_TAM_TRU" },
    { title: "Khai báo tạm vắng",  payload: "FLOW_CU_TRU_TAM_VANG" },
    { title: "Câu hỏi khác...",    payload: "FLOW_CU_TRU_KHAC" },
    { title: "Danh bạ cán bộ",     payload: "FLOW_DANH_BA_CU_TRU" }
  ],
  AGENT_CAN_CUOC: [
    { title: "Làm CCCD lần đầu",   payload: "FLOW_CAN_CUOC_LAN_DAU" },
    { title: "CCCD cho trẻ em",    payload: "FLOW_CAN_CUOC_TRE_EM" },
    { title: "Đổi/cấp lại CCCD",  payload: "FLOW_CAN_CUOC_DOI_CAP" },
    { title: "Câu hỏi khác...",    payload: "FLOW_CAN_CUOC_KHAC" },
    { title: "Danh bạ cán bộ",     payload: "FLOW_DANH_BA_CAN_CUOC" }
  ],
  AGENT_GIAO_THONG: [
    { title: "Báo tai nạn GT",       payload: "FLOW_GIAO_THONG_TAI_NAN" },
    { title: "Tra cứu phạt nguội",   payload: "FLOW_GIAO_THONG_PHAT_NGUOI" },
    { title: "Thủ tục sau tai nạn",  payload: "FLOW_GIAO_THONG_SAU_TAI_NAN" },
    { title: "Câu hỏi khác...",      payload: "FLOW_GIAO_THONG_KHAC" },
    { title: "Danh bạ cán bộ",       payload: "FLOW_DANH_BA_GIAO_THONG" }
  ],
  AGENT_AN_NINH: [
    { title: "Báo trộm/mất TS",   payload: "FLOW_AN_NINH_TROM_CAP" },
    { title: "Phòng cháy (PCCC)", payload: "FLOW_AN_NINH_PCCC" },
    { title: "Báo mất an ninh",   payload: "FLOW_AN_NINH_MAT_AN_NINH" },
    { title: "Câu hỏi khác...",   payload: "FLOW_AN_NINH_KHAC" },
    { title: "Danh bạ cán bộ",    payload: "FLOW_DANH_BA_AN_NINH" }
  ],
  AGENT_NGOAI_KIEU: [
    { title: "Đăng ký người NN",  payload: "FLOW_NGOAI_KIEU_TAM_TRU_NN" },
    { title: "Khai báo lưu trú",  payload: "FLOW_NGOAI_KIEU_KHAI_BAO" },
    { title: "Gia hạn thị thực",  payload: "FLOW_NGOAI_KIEU_GIA_HAN" },
    { title: "Câu hỏi khác...",   payload: "FLOW_NGOAI_KIEU_KHAC" },
    { title: "Danh bạ cán bộ",    payload: "FLOW_DANH_BA_NGOAI_KIEU" }
  ],
  AGENT_KHIEU_NAI: [
    { title: "Nộp đơn khiếu nại", payload: "FLOW_KHIEU_NAI_KHIEU_NAI" },
    { title: "Nộp đơn tố cáo",    payload: "FLOW_KHIEU_NAI_TO_CAO" },
    { title: "Phản ánh vi phạm",   payload: "FLOW_KHIEU_NAI_PHAN_ANH" },
    { title: "Câu hỏi khác...",    payload: "FLOW_KHIEU_NAI_KHAC" },
    { title: "Danh bạ cán bộ",     payload: "FLOW_DANH_BA_KHIEU_NAI" }
  ]
};

const staticResponses = {

  // ── CƯ TRÚ ──────────────────────────────────────────────────────────────────
  FLOW_CU_TRU_THUONG_TRU: {
    agentState: 'AGENT_CU_TRU',
    text: `[Chatbot Auto] Thủ tục đăng ký thường trú:

Hồ sơ cần chuẩn bị:
- Tờ khai thay đổi thông tin cư trú (mẫu CT01) — điền tại chỗ
- Giấy tờ chứng minh chỗ ở hợp pháp: sổ đỏ/sổ hồng, hợp đồng mua bán, hoặc hợp đồng thuê nhà có công chứng

Nơi nộp: Công an Phường nơi muốn đăng ký
Thời hạn giải quyết: 3 ngày làm việc kể từ khi nhận đủ hồ sơ
Lệ phí: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về cư trú", payload: "FLOW_CU_TRU_KHAC" }
    ]
  },

  FLOW_CU_TRU_TAM_TRU: {
    agentState: 'AGENT_CU_TRU',
    text: `[Chatbot Auto] Thủ tục đăng ký tạm trú:

Ai phải đăng ký: Người ở lại địa phương từ 30 ngày trở lên nhưng không phải thường trú

Hồ sơ:
- Tờ khai thay đổi thông tin cư trú (mẫu CT01)
- Giấy tờ chứng minh chỗ ở (hợp đồng thuê nhà hoặc xác nhận của chủ nhà)

Thời hạn giải quyết: 3 ngày làm việc
Thời hạn tạm trú: Tối đa 2 năm, được gia hạn nhiều lần
Lệ phí: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về cư trú", payload: "FLOW_CU_TRU_KHAC" }
    ]
  },

  FLOW_CU_TRU_TAM_VANG: {
    agentState: 'AGENT_CU_TRU',
    text: `[Chatbot Auto] Khai báo tạm vắng:

Ai phải khai: Người rời nơi thường trú hoặc tạm trú từ 30 ngày trở lên

Cách thực hiện:
- Trực tuyến: App VNeID → Cư trú → Khai báo tạm vắng
- Trực tiếp: Tại Công an Phường

Thời hạn khai: Trước khi đi hoặc trong vòng 7 ngày kể từ khi rời đi
Lệ phí: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về cư trú", payload: "FLOW_CU_TRU_KHAC" }
    ]
  },

  FLOW_CU_TRU_KHAC: {
    agentState: 'AGENT_CU_TRU',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực Cư trú & Địa bàn để Công an Phường giải đáp:'
  },

  // ── CĂN CƯỚC ─────────────────────────────────────────────────────────────────
  FLOW_CAN_CUOC_LAN_DAU: {
    agentState: 'AGENT_CAN_CUOC',
    text: `[Chatbot Auto] Cấp CCCD lần đầu (từ đủ 14 tuổi):

Không cần mang theo giấy tờ — dữ liệu đã có trong Cơ sở dữ liệu quốc gia về dân cư

Nơi làm: Công an Phường, Công an Huyện hoặc điểm thu nhận lưu động

Quy trình:
1. Điền tờ khai tại chỗ
2. Thu thập sinh trắc học (ảnh, vân tay, mống mắt)
3. Nhận thẻ sau 7 ngày làm việc

Lệ phí: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về CC&ĐD", payload: "FLOW_CAN_CUOC_KHAC" }
    ]
  },

  FLOW_CAN_CUOC_TRE_EM: {
    agentState: 'AGENT_CAN_CUOC',
    text: `[Chatbot Auto] Cấp CCCD cho người dưới 14 tuổi:

Cha/mẹ hoặc người giám hộ làm thay

Hồ sơ:
- Giấy khai sinh của trẻ
- CCCD của cha hoặc mẹ/người giám hộ

Thời hạn của thẻ:
- Dưới 6 tuổi: hết hạn khi đủ 6 tuổi
- Từ 6–14 tuổi: hết hạn khi đủ 14 tuổi

Lệ phí: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về CC&ĐD", payload: "FLOW_CAN_CUOC_KHAC" }
    ]
  },

  FLOW_CAN_CUOC_DOI_CAP: {
    agentState: 'AGENT_CAN_CUOC',
    text: `[Chatbot Auto] Đổi hoặc cấp lại CCCD:

Các trường hợp:
- Hết hạn sử dụng
- Thay đổi thông tin (họ tên, địa chỉ...)
- Bị mất hoặc hỏng

Hồ sơ: Điền tờ khai tại nơi làm (không cần mang thêm giấy tờ)

Lệ phí:
- Cấp lại do mất: 70.000đ
- Đổi thông tin hoặc hết hạn: Miễn phí`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm về CC&ĐD", payload: "FLOW_CAN_CUOC_KHAC" }
    ]
  },

  FLOW_CAN_CUOC_KHAC: {
    agentState: 'AGENT_CAN_CUOC',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực Căn cước & Định danh để Công an Phường giải đáp:'
  },

  // ── GIAO THÔNG ───────────────────────────────────────────────────────────────
  FLOW_GIAO_THONG_TAI_NAN: {
    agentState: 'AGENT_GIAO_THONG',
    text: `[Chatbot Auto] Xử lý khi xảy ra tai nạn giao thông:

Cần làm ngay:
1. Gọi 113 (Công an) hoặc 115 (Cấp cứu) nếu có người bị thương
2. Bảo vệ hiện trường, không di chuyển xe/người bị thương (trừ khi nguy hiểm tính mạng)
3. Ghi lại biển số xe và thông tin người liên quan

Sau đó:
- Chờ CSGT lập biên bản
- Thông báo công ty bảo hiểm trong vòng 5 ngày làm việc

Hỗ trợ thêm: Liên hệ Công an Phường (trực ban 24/7) nếu cần hướng dẫn tại hiện trường`,
    afterReplies: [
      { title: "Quay lại Menu",        payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm giao thông", payload: "FLOW_GIAO_THONG_KHAC" }
    ]
  },

  FLOW_GIAO_THONG_PHAT_NGUOI: {
    agentState: 'AGENT_GIAO_THONG',
    text: `[Chatbot Auto] Tra cứu vi phạm phạt nguội:

Cách tra cứu:
- App VNeID → Dịch vụ công → Tra cứu vi phạm giao thông
- Website: csgt.vn hoặc dichvucong.bocongan.gov.vn
- Đường dây hỗ trợ: 1900 6607

Nộp phạt: Tại Kho bạc Nhà nước hoặc qua hình thức thanh toán điện tử theo hướng dẫn trong biên bản`,
    afterReplies: [
      { title: "Quay lại Menu",        payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm giao thông", payload: "FLOW_GIAO_THONG_KHAC" }
    ]
  },

  FLOW_GIAO_THONG_SAU_TAI_NAN: {
    agentState: 'AGENT_GIAO_THONG',
    text: `[Chatbot Auto] Thủ tục sau tai nạn giao thông:

Hồ sơ bồi thường bảo hiểm cần chuẩn bị:
- Biên bản tai nạn của CSGT
- CCCD và giấy phép lái xe
- Giấy đăng ký xe, giấy chứng nhận bảo hiểm xe
- Hóa đơn sửa chữa hoặc viện phí (nếu có thương tích)

Thời hạn thông báo bảo hiểm: Trong vòng 5 ngày làm việc kể từ khi xảy ra tai nạn

Có tranh chấp: Liên hệ Công an Phường nơi xảy ra tai nạn`,
    afterReplies: [
      { title: "Quay lại Menu",        payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm giao thông", payload: "FLOW_GIAO_THONG_KHAC" }
    ]
  },

  FLOW_GIAO_THONG_KHAC: {
    agentState: 'AGENT_GIAO_THONG',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực Giao thông để Công an Phường giải đáp:'
  },

  // ── AN NINH & PCCC ────────────────────────────────────────────────────────────
  FLOW_AN_NINH_TROM_CAP: {
    agentState: 'AGENT_AN_NINH',
    text: `[Chatbot Auto] Thủ tục trình báo mất tài sản / trộm cắp:

Cần làm ngay:
1. Gọi 113 nếu đang trong tình huống nguy hiểm
2. Giữ nguyên hiện trường, không xáo trộn vật chứng
3. Đến trực tiếp Công an Phường trong vòng 24h

Hồ sơ trình báo:
- Đơn trình báo (viết tay hoặc theo mẫu tại Công an Phường)
- Danh sách tài sản bị mất / đặc điểm nhận dạng
- CCCD của người trình báo`,
    afterReplies: [
      { title: "Quay lại Menu",     payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm an ninh", payload: "FLOW_AN_NINH_KHAC" },
      { title: "Danh bạ cán bộ",   payload: "FLOW_DANH_BA_AN_NINH" }
    ]
  },

  FLOW_AN_NINH_PCCC: {
    agentState: 'AGENT_AN_NINH',
    text: `[Chatbot Auto] Phòng cháy chữa cháy (PCCC):

Khi có cháy: Gọi ngay 114

Phòng ngừa tại nhà / cơ sở:
- Trang bị bình chữa cháy và thiết bị báo khói
- Kiểm tra hệ thống điện định kỳ, tránh để dây điện chập
- Không lấn chiếm lối thoát hiểm

Kiểm tra định kỳ:
- Hộ gia đình: Cán bộ Công an Phường kiểm tra theo kế hoạch
- Cơ sở kinh doanh: Liên hệ Phòng PC07 để được hướng dẫn cấp phép PCCC

Hỗ trợ thêm: Liên hệ trực tiếp Công an Phường (trực ban 24/7) để được hướng dẫn PCCC`,
    afterReplies: [
      { title: "Quay lại Menu",     payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm an ninh", payload: "FLOW_AN_NINH_KHAC" }
    ]
  },

  FLOW_AN_NINH_MAT_AN_NINH: {
    agentState: 'AGENT_AN_NINH',
    text: `[Chatbot Auto] Báo cáo mất an ninh trật tự:

Liên hệ ngay:
- Đường dây khẩn: 113
- Trực tiếp Công an Phường (trực ban 24/7)

Thông tin cần cung cấp:
- Thời gian và địa điểm xảy ra sự việc
- Mô tả đặc điểm đối tượng (nếu có)
- Họ tên và số điện thoại liên lạc

Đảm bảo an toàn cá nhân trước khi tiếp cận hiện trường`,
    afterReplies: [
      { title: "Quay lại Menu",     payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm an ninh", payload: "FLOW_AN_NINH_KHAC" },
      { title: "Danh bạ cán bộ",   payload: "FLOW_DANH_BA_AN_NINH" }
    ]
  },

  FLOW_AN_NINH_KHAC: {
    agentState: 'AGENT_AN_NINH',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực An ninh Trật tự & PCCC để Công an Phường giải đáp:'
  },

  // ── NGOẠI KIỀU ───────────────────────────────────────────────────────────────
  FLOW_NGOAI_KIEU_TAM_TRU_NN: {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[Chatbot Auto] Đăng ký tạm trú cho người nước ngoài:

Ai phải thực hiện: Chủ nhà hoặc cơ sở lưu trú tiếp nhận người nước ngoài

Thời hạn khai báo: Trong vòng 24h kể từ khi người nước ngoài đến lưu trú

Cách thực hiện:
- Trực tuyến: dichvucong.gov.vn hoặc App VNeID
- Trực tiếp: Tại Công an Phường

Hồ sơ cần: Hộ chiếu + visa/thẻ tạm trú của người nước ngoài

Không khai báo: Bị phạt từ 1.000.000 – 3.000.000đ`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm ngoại kiều", payload: "FLOW_NGOAI_KIEU_KHAC" }
    ]
  },

  FLOW_NGOAI_KIEU_KHAI_BAO: {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[Chatbot Auto] Khai báo người nước ngoài lưu trú tại nhà:

Bắt buộc khai báo khi: Người nước ngoài nghỉ qua đêm tại nhà anh/chị

Thời hạn: Trong vòng 24h kể từ khi người nước ngoài đến

Cách khai:
- App VNeID → Khai báo lưu trú
- Trực tiếp tại Công an Phường

Cần mang: Hộ chiếu của người nước ngoài (hoặc ảnh chụp trang thông tin)`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm ngoại kiều", payload: "FLOW_NGOAI_KIEU_KHAC" }
    ]
  },

  FLOW_NGOAI_KIEU_GIA_HAN: {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[Chatbot Auto] Gia hạn thị thực (visa) cho người nước ngoài:

Lưu ý: Thủ tục gia hạn thị thực KHÔNG thuộc thẩm quyền của Công an Phường

Nơi thực hiện: Cục Quản lý xuất nhập cảnh (Bộ Công an)

Hồ sơ thông thường:
- Tờ khai xin gia hạn
- Hộ chiếu còn hạn ít nhất 6 tháng
- Ảnh 4×6
- Lý do gia hạn và tài liệu chứng minh
- Phí theo quy định hiện hành

Nộp trước khi visa hết hạn ít nhất 3 ngày làm việc`,
    afterReplies: [
      { title: "Quay lại Menu",       payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm ngoại kiều", payload: "FLOW_NGOAI_KIEU_KHAC" }
    ]
  },

  FLOW_NGOAI_KIEU_KHAC: {
    agentState: 'AGENT_NGOAI_KIEU',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực Ngoại kiều để Công an Phường giải đáp:'
  },

  // ── KHIẾU NẠI ────────────────────────────────────────────────────────────────
  FLOW_KHIEU_NAI_KHIEU_NAI: {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[Chatbot Auto] Thủ tục nộp đơn khiếu nại:

Thời hiệu: 90 ngày kể từ ngày nhận được quyết định hành chính

Đơn khiếu nại phải có:
- Họ tên, địa chỉ người khiếu nại
- Nội dung quyết định hành chính bị khiếu nại
- Yêu cầu giải quyết cụ thể
- Chữ ký hoặc điểm chỉ của người khiếu nại

Nộp tại: Cơ quan đã ban hành quyết định hành chính bị khiếu nại

Thời hạn giải quyết: 30 ngày (phức tạp: 45 ngày)`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm khiếu nại", payload: "FLOW_KHIEU_NAI_KHAC" }
    ]
  },

  FLOW_KHIEU_NAI_TO_CAO: {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[Chatbot Auto] Thủ tục nộp đơn tố cáo:

Đơn tố cáo phải ghi rõ:
- Họ tên, địa chỉ người tố cáo (không tiếp nhận tố cáo nặc danh)
- Họ tên, chức vụ người bị tố cáo
- Nội dung và bằng chứng tố cáo

Nộp tại: Cơ quan quản lý người bị tố cáo

Thời hạn giải quyết: 30 ngày (phức tạp: 60 ngày)

Bảo vệ người tố cáo: Danh tính được giữ bí mật theo quy định pháp luật`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm khiếu nại", payload: "FLOW_KHIEU_NAI_KHAC" }
    ]
  },

  FLOW_KHIEU_NAI_PHAN_ANH: {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[Chatbot Auto] Phản ánh vi phạm:

Các kênh tiếp nhận:
- Trực tiếp tại Công an Phường (trực ban 24/7)
- Đường dây khẩn: 113
- App VNeID → Phản ánh hiện trường
- Cổng thông tin điện tử của UBND Phường

Lưu ý: Cung cấp thông tin chính xác — phản ánh sai sự thật có thể bị xử lý theo pháp luật`,
    afterReplies: [
      { title: "Quay lại Menu",      payload: "SHOW_MAIN_MENU" },
      { title: "Hỏi thêm khiếu nại", payload: "FLOW_KHIEU_NAI_KHAC" },
      { title: "Danh bạ cán bộ",     payload: "FLOW_DANH_BA_KHIEU_NAI" }
    ]
  },

  FLOW_KHIEU_NAI_KHAC: {
    agentState: 'AGENT_KHIEU_NAI',
    openChat: true,
    text: '[Chatbot Auto] Anh/chị vui lòng nhập câu hỏi chi tiết về lĩnh vực Khiếu nại & Vi phạm để Công an Phường giải đáp:'
  },

  FLOW_DANH_BA_CU_TRU: {
    agentState: 'AGENT_CU_TRU',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Cư trú / Hộ khẩu:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Huỳnh Thanh Sơn (Thiếu tá): ***REMOVED***
• CB Vũ Tuấn Linh (Đại uý): ***REMOVED***
• CB Trương Thị Hương Quỳnh (Trung tá): ***REMOVED***
• BV Lê Thị Phương Mai: ***REMOVED***
• BV Lê Hà Vũ Nhân: ***REMOVED***
• BV Nguyễn Tấn Khoa: ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  },

  FLOW_DANH_BA_CAN_CUOC: {
    agentState: 'AGENT_CAN_CUOC',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Căn cước / Định danh:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Hà Văn Long (Trung tá): ***REMOVED***
• CB Phạm Hồng Linh (Đại uý): ***REMOVED***
• CB Nguyễn Kiên Trung (Thượng uý): ***REMOVED***
• BV Lê Văn Hiếu: ***REMOVED***
• BV Lê Nguyễn Thanh Trí: ***REMOVED***
• BV Nguyễn Văn Thanh: ***REMOVED***
• BV Phạm Thanh Đức: ***REMOVED***
• BV Trương Văn Linh: ***REMOVED***
• BV Nguyễn Công Giang: ***REMOVED***
• BV Lương Quốc Huy: ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  },

  FLOW_DANH_BA_GIAO_THONG: {
    agentState: 'AGENT_GIAO_THONG',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Giao thông:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Huỳnh Nhật Tân (Trung tá): ***REMOVED***
• CB Võ Thành Lợi — tai nạn (Đại uý): ***REMOVED***
• CB Tống Sơn Ca — vi phạm (Thiếu tá): ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  },

  FLOW_DANH_BA_AN_NINH: {
    agentState: 'AGENT_AN_NINH',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách An ninh / PCCC:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Trần Quốc Dũng (Trung tá): ***REMOVED***
• CB Phạm Minh Nghĩa (Trung tá): ***REMOVED***
• CB Võ Thành Đô (Trung tá): ***REMOVED***
• CB Tống Kiều Ngọc Nam (Thượng uý): ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  },

  FLOW_DANH_BA_NGOAI_KIEU: {
    agentState: 'AGENT_NGOAI_KIEU',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Ngoại kiều:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Trần Quốc Dũng (Trung tá): ***REMOVED***
• CB Phạm Minh Nghĩa (Trung tá): ***REMOVED***
• CB Võ Thành Đô (Trung tá): ***REMOVED***
• CB Tống Kiều Ngọc Nam (Thượng uý): ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  },

  FLOW_DANH_BA_KHIEU_NAI: {
    agentState: 'AGENT_KHIEU_NAI',
    text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Tố giác / Khiếu nại:

Lãnh đạo:
• Trưởng CAP Nguyễn Thành Tâm (Trung tá): ***REMOVED***

Phụ trách trực tiếp:
• Phó Lê Duy Bảo (Trung tá): ***REMOVED***
• CB Thái Thanh Tuấn (Trung tá): ***REMOVED***
• CB Đoàn Lập Trường (Thiếu tá): ***REMOVED***

Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7
Khẩn cấp: 113`,
    afterReplies: [ { title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" } ]
  }
};

/**
 * Returns the 4-button sub-menu for a given agent state.
 * @param {string} agentState
 * @returns {Array<{title: string, payload: string}>}
 */
function getSubMenu(agentState) {
  return subMenus[agentState] || [];
}

/**
 * Returns the static response config for a FLOW_* payload.
 * @param {string} payload
 * @returns {{agentState: string, text: string, openChat?: boolean, afterReplies?: Array}|null}
 */
function getStaticResponse(payload) {
  return staticResponses[payload] || null;
}

module.exports = { getSubMenu, getStaticResponse };
