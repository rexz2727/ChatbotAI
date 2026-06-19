# BỘ QUY TẮC & TIÊU CHUẨN PHÁT TRIỂN (WORKSPACE RULES)

Tài liệu này quy định các quy tắc bắt buộc mà trợ lý AI (Antigravity/Subagents) phải tuân thủ trong suốt quá trình xây dựng dự án **Chatbot AI Công an Phường**.

---

## 🤖 1. NGUYÊN TẮC HOẠT ĐỘNG CỦA AGENT (BẮT BUỘC)

1. **Sử dụng Subagents tối ưu:** 
   - Đối với các tác vụ độc lập, song song hoặc có thể chia nhỏ (ví dụ: viết tài liệu luật, thiết lập SQLite, thiết lập ChromaDB), luôn định nghĩa và triệu gọi `subagents` thông qua công cụ `invoke_subagent` để đẩy nhanh tiến độ và tối ưu hóa hiệu quả làm việc.
2. **Sử dụng CodeGraph & Sequential Thinking:**
   - Luôn sử dụng MCP server `codegraph` và công cụ suy luận tuần tự (`sequential-thinking` hoặc ghi nhận chuỗi suy nghĩ chi tiết) trước khi thực hiện các thay đổi phức tạp nhằm tối ưu hóa chi phí token và tránh sai sót logic.
3. **Luôn hỏi khi có thắc mắc (Clarification First):**
   - Tuyệt đối không tự suy đoán hoặc giả định khi yêu cầu của người dùng chưa rõ ràng. Nếu gặp bất kỳ điểm mơ hồ nào về cấu trúc, thiết kế hay logic nghiệp vụ, **phải đặt câu hỏi làm rõ với người dùng** để tránh làm hao phí chi phí/token vô ích.
4. **Quy trình thực hiện: Từ dễ đến khó:**
   - Lập kế hoạch và triển khai các tác vụ theo thứ tự ưu tiên từ đơn giản đến phức tạp.
   - Kết hợp giao các phần việc đơn giản, ít phụ thuộc cho các `subagents` làm đồng thời để tối ưu hóa thời gian và tài nguyên.

---

## 🧠 2. NGUYÊN TẮC PHÒNG TRÁNH LỖI LLM (TỪ ANDREJ KARPATHY)

### A. Tư duy trước khi viết code (Think Before Coding)
- **Không giả định. Không che giấu sự mơ hồ. Đưa ra các đánh đổi rõ ràng.**
- Trước khi triển khai:
  - Nêu rõ các giả định của bạn. Nếu không chắc chắn, hãy hỏi người dùng.
  - Nếu có nhiều cách hiểu khác nhau, hãy đưa ra để thảo luận - không tự ý lựa chọn một cách im lặng.
  - Nếu có cách tiếp cận đơn giản hơn, hãy đề xuất. Sẵn sàng phản biện nếu thấy hợp lý.
  - Nếu có điều gì không rõ, hãy dừng lại và đặt câu hỏi cụ thể.

### B. Tối giản hàng đầu (Simplicity First)
- **Chỉ viết lượng code tối thiểu để giải quyết vấn đề. Không suy đoán tương lai.**
- Không viết các tính năng ngoài yêu cầu.
- Không tạo các lớp trừu tượng (abstractions) cho code chỉ dùng một lần.
- Không thêm tính linh hoạt ("flexibility") hoặc cấu hình ("configurability") không được yêu cầu.
- Không viết xử lý lỗi cho các tình huống bất khả thi.
- **Quy tắc hiệu năng:** "Nếu bạn viết 200 dòng code trong khi có thể viết 50 dòng để giải quyết vấn đề, hãy viết lại."
- Luôn tự hỏi: *"Một lập trình viên lâu năm có đánh giá đoạn code này là quá phức tạp không?"* Nếu có, hãy tối giản hóa nó.

### C. Chỉnh sửa mang tính ngoại khoa (Surgical Changes)
- **Chỉ tác động vào những phần bắt buộc. Chỉ dọn dẹp đống lộn xộn do chính mình tạo ra.**
- Khi chỉnh sửa code hiện tại:
  - Không "cải tiến" code, comment hoặc định dạng của các dòng code lân cận không liên quan.
  - Không refactor những thứ đang chạy bình thường.
  - Tuân thủ phong cách viết code sẵn có của dự án.
  - Nếu phát hiện code thừa không liên quan, hãy nhắc đến trong câu trả lời thay vì tự ý xóa.
- Khi các thay đổi của bạn tạo ra "mã mồ côi" (code không dùng đến nữa):
  - Xóa bỏ các `imports`, biến, hàm mà chính thay đổi của bạn đã làm cho nó dư thừa.
  - Không xóa code thừa đã có sẵn từ trước trừ khi được yêu cầu cụ thể.
- **Tiêu chuẩn kiểm thử:** Mỗi dòng code được thay đổi phải có nguồn gốc trực tiếp từ yêu cầu của người dùng.

### D. Thực thi hướng mục tiêu (Goal-Driven Execution)
- **Định nghĩa tiêu chí thành công. Lặp lại cho đến khi được xác minh.**
- Chuyển đổi các tác vụ mơ hồ thành các mục tiêu có thể xác minh được:
  - *"Thêm validation"* ➔ *"Viết test cho các đầu vào không hợp lệ, sau đó viết code để test pass"*.
  - *"Sửa lỗi"* ➔ *"Viết test để tái hiện lỗi, sau đó viết code sửa lỗi để test pass"*.
  - *"Refactor X"* ➔ *"Đảm bảo test pass trước và sau khi refactor"*.
- Đối với tác vụ nhiều bước, hãy nêu ngắn gọn kế hoạch:
  ```
  1. [Bước thực hiện] ➔ Xác minh: [Cách kiểm tra]
  2. [Bước thực hiện] ➔ Xác minh: [Cách kiểm tra]
  ```

---

## 💻 3. TIÊU CHUẨN MÃ NGUỒN (NODE.JS & JAVASCRIPT)

### Cú pháp & Trình bày:
- Sử dụng cú pháp JavaScript hiện đại (ES6+), sử dụng `const`/`let`, tránh dùng `var`.
- Sử dụng **2-space indentation** (thụt dòng 2 dấu cách).
- Luôn sử dụng dấu chấm phẩy (`;`) cuối câu lệnh.
- Tên biến, hàm sử dụng camelCase (ví dụ: `handleUserMessage`, `getSessionState`).
- Tên hằng số sử dụng SNAKE_UPPERCASE (ví dụ: `RATE_LIMIT_DELAY`).

### Quản lý lỗi & Logs:
- Tất cả các tác vụ bất đồng bộ (`async/await`) phải được bọc trong block `try...catch`.
- Ghi log lỗi rõ ràng bằng `console.error("Mô tả lỗi:", error)` kèm theo ngữ cảnh để dễ dàng debug bằng PM2.
- Tránh sử dụng console.log dư thừa trong môi trường production, chỉ ghi log các sự kiện quan trọng của hệ thống (như nhận webhook, kết nối database thành công).

### Thiết kế cấu trúc Module:
- Thiết kế các file đơn nhiệm (Single Responsibility). Mỗi file chỉ quản lý một tài nguyên (ví dụ: `db.js` chỉ xử lý SQLite, `chatbot.js` chỉ xử lý logic chatbot).
- Tránh viết các file quá lớn. Nếu module vượt quá 300 dòng code, hãy cân nhắc chia nhỏ thành các module phụ.

---

## 🛠️ 4. CÁC LỆNH VẬN HÀNH DỰ ÁN (PROJECT COMMANDS)

- **Cài đặt thư viện:** `npm install`
- **Khởi tạo cơ sở dữ liệu luật (ChromaDB):** `node init_db.js`
- **Khởi chạy hệ thống ở chế độ phát triển:** `node index.js`
- **Khởi chạy hệ thống chạy ngầm bằng PM2:** `pm2 start index.js --name "CA_Phuong_Chatbot"`
- **Kiểm tra trạng thái chạy ngầm:** `pm2 status`
- **Kiểm tra logs thời gian thực:** `pm2 logs CA_Phuong_Chatbot`
