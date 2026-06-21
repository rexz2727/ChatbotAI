'use strict';

/**
 * MẪU CẤU HÌNH ĐƠN VỊ — copy file này thành `config/donvi.js` rồi điền thông tin của đơn vị bạn.
 *   cp config/donvi.example.js config/donvi.js
 *
 * `config/donvi.js` đã được .gitignore nên dữ liệu thật (địa chỉ, SĐT, danh bạ cán bộ)
 * KHÔNG bị đẩy lên git. Mã nguồn công khai chỉ chứa file mẫu này.
 *
 * Sau khi điền xong nhớ chạy `npm run init-db` để nạp lại dữ liệu liên hệ vào ChromaDB
 * (xem thêm data/lien_he_co_quan.example.txt).
 */

const GIO_LAM_VIEC = 'Giờ làm việc: T2–T6, 7h30–17h00 | Trực ban: 24/7';

const BACK_MENU = [{ title: "Quay lại Menu", payload: "SHOW_MAIN_MENU" }];
const BACK_LIEN_HE = [
  { title: "Liên hệ cơ quan khác", payload: "FLOW_LIEN_HE" },
  { title: "Quay lại Menu",        payload: "SHOW_MAIN_MENU" }
];

module.exports = {
  // Tên đơn vị (hiển thị ở lời chào) và số trực ban (hiển thị ở lời chào + tình huống khẩn cấp)
  tenDonVi: 'Công an phường/xã (điền tên đơn vị của bạn)',
  trucBan: '0000 000 000',

  // Danh bạ cán bộ theo từng lĩnh vực. Giữ nguyên cấu trúc, thay nội dung bằng thông tin đơn vị.
  danhBaNodes: {
    FLOW_DANH_BA_CU_TRU: {
      agentState: 'AGENT_CU_TRU',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Cư trú / Hộ khẩu:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_DANH_BA_CAN_CUOC: {
      agentState: 'AGENT_CAN_CUOC',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Căn cước / Định danh:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_DANH_BA_GIAO_THONG: {
      agentState: 'AGENT_GIAO_THONG',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Giao thông:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_DANH_BA_AN_NINH: {
      agentState: 'AGENT_AN_NINH',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách An ninh / PCCC:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_DANH_BA_NGOAI_KIEU: {
      agentState: 'AGENT_NGOAI_KIEU',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Ngoại kiều:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_DANH_BA_KHIEU_NAI: {
      agentState: 'AGENT_KHIEU_NAI',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Tố giác / Khiếu nại:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Phụ trách trực tiếp:
• CB Nguyễn Văn B (Đại uý): 0900.000.001

${GIO_LAM_VIEC}
Khẩn cấp: 113`,
      afterReplies: BACK_MENU
    },

    FLOW_TTHC_DANH_BA: {
      agentState: 'AGENT_TTHC',
      text: `[Chatbot Auto] Danh bạ cán bộ phụ trách Thủ tục hành chính:

Lãnh đạo:
• Trưởng CAP Nguyễn Văn A (Trung tá): 0900.000.000

Vui lòng liên hệ trực ban Công an Phường theo số khẩn cấp 113 để được hỗ trợ thủ tục hành chính.

${GIO_LAM_VIEC}`,
      afterReplies: BACK_MENU
    }
  },

  // Thông tin liên hệ các cơ quan. Thay địa chỉ / SĐT / link Google Maps theo đơn vị bạn.
  lienHeNodes: {
    FLOW_LIEN_HE: {
      agentState: 'AGENT_LIEN_HE',
      text: `[Chatbot Auto] Thông tin liên hệ các cơ quan. Anh/chị chọn cơ quan cần liên hệ:

• Công an phường/xã — đơn vị tiếp nhận trực tiếp (cư trú, căn cước, ANTT, tố giác tội phạm...).
• UBND & Đảng ủy phường — thủ tục ngoài ngành công an (hộ tịch, chứng thực, đất đai cấp xã...).
• Công an tỉnh/thành phố — việc vượt thẩm quyền phường (CSGT, xuất nhập cảnh, an ninh mạng...).

Lưu ý: Ưu tiên liên hệ cơ quan cấp phường/xã trước (Công an phường, UBND, Đảng ủy phường). Chỉ liên hệ cấp trên — Công an tỉnh/thành phố, cao nhất là Bộ Công an — khi việc vượt thẩm quyền của phường hoặc không liên hệ được với cấp phường.

Khẩn cấp: Công an 113 · Cứu hỏa 114 · Cấp cứu 115`,
      afterReplies: [
        { title: "Công an phường/xã",      payload: "FLOW_LIEN_HE_CA_PHUONG" },
        { title: "UBND & Đảng ủy phường", payload: "FLOW_LIEN_HE_UBND" },
        { title: "Công an tỉnh/thành phố", payload: "FLOW_LIEN_HE_CA_TP" },
        { title: "Quay lại Menu",          payload: "SHOW_MAIN_MENU" }
      ]
    },

    FLOW_LIEN_HE_CA_PHUONG: {
      agentState: 'AGENT_LIEN_HE',
      text: `[Chatbot Auto] CÔNG AN PHƯỜNG/XÃ (đơn vị tiếp nhận trực tiếp)

Trụ sở chính:
• Địa chỉ: (điền địa chỉ trụ sở)
• Trực ban 24/7: (điền số điện thoại)
• Bản đồ: (điền link Google Maps)

Khẩn cấp: Công an 113 · Cứu hỏa 114 · Cấp cứu 115`,
      afterReplies: BACK_LIEN_HE
    },

    FLOW_LIEN_HE_UBND: {
      agentState: 'AGENT_LIEN_HE',
      text: `[Chatbot Auto] UBND & ĐẢNG ỦY PHƯỜNG/XÃ

1) UBND phường/xã (hộ tịch, chứng thực, đất đai cấp xã, chính sách xã hội...):
• Địa chỉ: (điền địa chỉ)
• Điện thoại: (điền số điện thoại)
• Bản đồ: (điền link Google Maps)

2) Đảng ủy phường/xã:
• Địa chỉ: (điền địa chỉ)
• Bản đồ: (điền link Google Maps)`,
      afterReplies: BACK_LIEN_HE
    },

    FLOW_LIEN_HE_CA_TP: {
      agentState: 'AGENT_LIEN_HE',
      text: `[Chatbot Auto] CÔNG AN TỈNH/THÀNH PHỐ (việc vượt thẩm quyền phường)

Lưu ý: Chỉ liên hệ khi việc vượt thẩm quyền Công an phường hoặc không liên hệ được với cấp phường. Cấp cao nhất là Bộ Công an.

Trụ sở:
• Địa chỉ: (điền địa chỉ)
• Trực ban: (điền số điện thoại)
• Bản đồ: (điền link Google Maps)

Các đường dây nóng theo lĩnh vực:
• Cư trú & Căn cước & VNeID (PC06): (điền số điện thoại)
• Cảnh sát giao thông (PC08): (điền số điện thoại)
• Xuất nhập cảnh (PA08): (điền số điện thoại)`,
      afterReplies: BACK_LIEN_HE
    }
  }
};
