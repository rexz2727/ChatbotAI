require('dotenv').config({ override: true, path: require('path').resolve(__dirname, '../.env') });
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DB_PATH = path.join(__dirname, '../data/database.db');
const DOCS_DIR = path.join(__dirname, '../docs/audit');
const REPORT_FILE = path.join(DOCS_DIR, 'knowledge_gap.md');

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your_gemini_api_key_here');

async function generateReport() {
  db.all(`SELECT id, user_id, role, content, created_at FROM messages ORDER BY user_id, created_at ASC`, async (err, rows) => {
    if (err) {
      console.error('Error querying messages:', err.message);
      db.close();
      process.exit(1);
    }

    const unhandledQueries = [];
    
    // Find bot messages indicating knowledge gap or error, and get the preceding user message
    for (let i = 1; i < rows.length; i++) {
      const current = rows[i];
      const prev = rows[i - 1];
      
      if (current.role === 'bot' && prev.role === 'user' && current.user_id === prev.user_id) {
        const textLower = current.content.toLowerCase();
        if (textLower.includes('không có tài liệu') || 
            textLower.includes('sự cố kỹ thuật') || 
            textLower.includes('chưa có thông tin') ||
            textLower.includes('lỗi')) {
          
          unhandledQueries.push(prev.content);
        }
      }
    }

    db.close();

    if (unhandledQueries.length === 0) {
      fs.writeFileSync(REPORT_FILE, '# Báo cáo Khoảng trống Kiến thức (Knowledge Gap)\n\nHiện tại không có câu hỏi nào bị thiếu tài liệu hoặc gây lỗi hệ thống.\n', 'utf8');
      console.log('Report generated (No gaps found).');
      return;
    }

    // Deduplicate and limit to avoid massive API payload
    const uniqueQueries = [...new Set(unhandledQueries)].slice(0, 100);

    const prompt = `Bạn là một chuyên gia phân tích dữ liệu AI. Dưới đây là danh sách các câu hỏi của người dân mà chatbot không thể trả lời do thiếu tài liệu (knowledge gap).
Vui lòng phân loại các câu hỏi này thành các nhóm chủ đề cụ thể (ví dụ: Thủ tục đất đai, Tạm trú, Giao thông, v.v.).
Trình bày dưới dạng báo cáo Markdown, bao gồm:
- Tóm tắt tổng quan.
- Các nhóm chủ đề, mỗi nhóm có danh sách các câu hỏi tiêu biểu.
- Đề xuất bổ sung tài liệu nào vào hệ thống.

Danh sách câu hỏi:
${uniqueQueries.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
`;

    try {
      let reportContent = '';
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        // Fallback if no valid API key
        reportContent = `# Báo cáo Khoảng trống Kiến thức (Knowledge Gap)\n\n(Hệ thống đang chạy không có Gemini API key thực, đây là báo cáo tự động bằng thống kê cơ bản.)\n\n## Danh sách câu hỏi chưa được giải quyết:\n`;
        uniqueQueries.forEach(q => reportContent += `- ${q}\n`);
      } else {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent(prompt);
        reportContent = result.response.text();
      }

      fs.writeFileSync(REPORT_FILE, reportContent, 'utf8');
      console.log(`Knowledge gap report generated successfully at ${REPORT_FILE}`);
    } catch (apiErr) {
      console.error('Error generating report with Gemini:', apiErr);
      
      // Fallback in case of API error
      let reportContent = `# Báo cáo Khoảng trống Kiến thức (Knowledge Gap)\n\nLỗi khi gọi API Gemini: ${apiErr.message}\n\n## Danh sách câu hỏi chưa được giải quyết:\n`;
      uniqueQueries.forEach(q => reportContent += `- ${q}\n`);
      fs.writeFileSync(REPORT_FILE, reportContent, 'utf8');
      console.log(`Fallback report generated at ${REPORT_FILE}`);
    }
  });
}

generateReport();
