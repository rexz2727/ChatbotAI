# KẾ HOẠCH PHÁT TRIỂN & CẬP NHẬT DỰ ÁN CHATBOT (GIAI ĐOẠN 2)

Dưới đây là danh sách các hạng mục cần nghiên cứu và triển khai trong giai đoạn phát triển tiếp theo của dự án Chatbot AI Công an Phường.

## 1. Nâng cấp Trải nghiệm Người dùng (UX) & Giao diện
- [x] **Khắc phục lỗi hiển thị nút bấm trên Facebook App** ✅ *Hoàn thành 2026-06-19*
  *Giải pháp:* Append fallback text `(Không thấy nút? Gõ: X · Y · Z)` vào mỗi message có quick_replies. Sub-menus dùng tên nút động; main menu bỏ qua (welcome message đã có hướng dẫn từ khóa). Commit: `b597a18`, `0bc2f23`.
- [ ] **Đính kèm tài liệu biểu mẫu trực tiếp:** Cung cấp file biểu mẫu định dạng `.doc` hoặc `.pdf` trực tiếp trên nền tảng chat để người dân tải về ngay, không cần chuyển hướng sang website khác.
- [ ] **Bổ sung Video hướng dẫn:** Tích hợp các đường link video hướng dẫn thao tác trực quan (tham khảo nguồn: [Dịch vụ công Online](https://www.youtube.com/@dichvucongonline)).

## 2. Cải tiến Trí tuệ Nhân tạo (AI) & Luồng Trả lời
- [x] **Điều chỉnh văn phong linh hoạt (Adaptive Tone)** ✅ *Hoàn thành 2026-06-19*
  Rule 6 trong Gemini system prompt: phát hiện từ thân mật/cảm thán → gần gũi; câu ngắn gọn → súc tích chuyên nghiệp. Commit: `ff92f13`
- [x] **Trả lời đúng trọng tâm (Intent Detection)** ✅ *Hoàn thành 2026-06-19*
  Mở rộng Rule 2: tự động nhận diện 5 loại intent (hồ sơ/quy trình/lệ phí/thời gian/địa điểm) và format response tương ứng. Commit: `ff92f13`
- [x] **Trích dẫn căn cứ pháp lý** ✅ *Hoàn thành 2026-06-19*
  Rule 7 trong Gemini system prompt: bắt buộc trích dẫn Điều/Khoản/NĐ/TT khi tài liệu tham chiếu đề cập; guard chống hallucination pháp lý. Commit: `ff92f13`
- [ ] **Cải thiện tỷ lệ phản hồi:** Cố gắng giải đáp đầy đủ và bao quát nhất toàn bộ các thắc mắc của người dân, giảm thiểu tỷ lệ từ chối trả lời.

## 3. Cập nhật Dữ liệu & Hệ thống Danh bạ
- [x] **Quy tắc phân cấp thứ tự liên hệ** ✅ *Hoàn thành 2026-06-19*
  Cập nhật 4 flow trong `src/flow.js`: CA Phường lên trước 113 trong flow khiếu nại/phản ánh; 113/114 giữ ưu tiên trong flow khẩn cấp (tai nạn, cháy, mất an ninh). Commit: `dfb75f7`, `0bc2f23`
- [ ] **Bổ sung danh bạ cán bộ phụ trách:** Bổ sung số điện thoại của từng cán bộ phụ trách các mảng cụ thể (hộ khẩu, an ninh, giao thông...) để người dân dễ dàng liên hệ đúng người, đúng việc.
- [ ] **Làm giàu kho dữ liệu (Knowledge Base):** *(Đã lập danh sách 31 văn bản pháp luật tại `docs/legal_pdfs/danh_sach_van_ban_phap_luat.md` — chờ tải và nạp vào ChromaDB)*

## 4. Xây dựng Hệ thống Giám sát & Bảo mật (Dashboard)
- [ ] **Xây dựng Web Dashboard:** *(Chưa bắt đầu — scope lớn, cần session riêng)*

## 5. An ninh mạng & Tự động hoá Vận hành *(Bổ sung mới)*
- [ ] **Human Takeover — Hybrid A + Auto-expire** *(Đã có plan, chờ implement sau khi reset token)*
  Facebook Handover Protocol + auto-expire 30 phút. Thay đổi: `db.js` (schema + 2 hàm), `index.js` (handover event handler), `chatbot.js` (guard layer). Xem plan chi tiết tại `.claude/plans/h-p-l-b-t-u-flickering-dream.md`.

## 4. Xây dựng Hệ thống Giám sát & Bảo mật (Dashboard)
- [ ] **Xây dựng Web Dashboard:** 
  - Phát triển giao diện quản trị nền web dành cho ban chỉ huy/cán bộ quản lý.
  - **Thống kê:** Theo dõi số lượng lượt liên hệ, phân loại nội dung câu hỏi thường gặp để làm cơ sở làm giàu kho dữ liệu.
  - **Giám sát An ninh mạng (Security Monitoring):** Giám sát, phát hiện và thống kê các hành vi gửi tệp tin (file, hình ảnh) có đính kèm mã độc (virus, malware, trojan, worm...). *Ghi chú: Cơ chế rà quét và cách ly (quarantine) đã được thiết lập, cần đưa dữ liệu này lên biểu đồ Dashboard.*
