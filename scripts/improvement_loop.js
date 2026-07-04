require('dotenv').config({ override: true, path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const REPORT_FILE = path.join(__dirname, '../docs/audit/knowledge_gap.md');
const TODO_FILE = path.join(__dirname, '../docs/audit/improvement_todo.md');

if (!fs.existsSync(REPORT_FILE)) {
  console.error('Không tìm thấy báo cáo knowledge_gap.md. Hãy chạy scripts/knowledge_gap.js (G3) trước.');
  process.exit(1);
}

const reportContent = fs.readFileSync(REPORT_FILE, 'utf8');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your_gemini_api_key_here');

async function generateTodoList() {
  const prompt = `Dựa trên báo cáo Khoảng trống Kiến thức (Knowledge Gap) dưới đây:

${reportContent}

Hãy phân tích và tạo ra một danh sách TODO (việc cần làm) cho đội ngũ quản trị tài liệu để bổ sung thông tin vào hệ thống RAG chatbot.
Yêu cầu:
- Trình bày dưới dạng Markdown checklist (sử dụng cú pháp "- [ ]").
- Mỗi mục là một chủ đề/loại tài liệu cần được bổ sung, kèm theo mô tả ngắn gọi.
- Nhóm các TODO theo lĩnh vực (nếu có thể).

Ví dụ:
## Lĩnh vực Đất đai
- [ ] Bổ sung tài liệu về thủ tục cấp sổ đỏ lần đầu.
`;

  try {
    let todoContent = '';
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      // Fallback if no real API key
      todoContent = `# Danh sách TODO bổ sung tài liệu\n\n(Hệ thống không có Gemini API key thực. Xin vui lòng xem trực tiếp báo cáo knowledge_gap.md.)\n\n- [ ] Đọc file \`docs/audit/knowledge_gap.md\`.\n- [ ] Tự tạo danh sách các chủ đề cần bổ sung tài liệu.\n- [ ] Cập nhật tài liệu mới vào cơ sở dữ liệu.`;
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const result = await model.generateContent(prompt);
      todoContent = result.response.text();
    }

    fs.writeFileSync(TODO_FILE, todoContent, 'utf8');
    console.log(`Đã tạo danh sách TODO (G4) thành công tại ${TODO_FILE}`);
  } catch (apiErr) {
    console.error('Lỗi khi gọi API Gemini để tạo TODO:', apiErr);
    
    // Fallback on error
    const fallbackContent = `# Danh sách TODO bổ sung tài liệu\n\nLỗi hệ thống khi gọi Gemini: ${apiErr.message}\n\n- [ ] Kiểm tra lại API key hoặc kết nối mạng.\n- [ ] Xem nội dung knowledge_gap.md để bổ sung thủ công.`;
    fs.writeFileSync(TODO_FILE, fallbackContent, 'utf8');
    console.log(`Đã tạo file TODO dự phòng tại ${TODO_FILE}`);
  }
}

generateTodoList();
