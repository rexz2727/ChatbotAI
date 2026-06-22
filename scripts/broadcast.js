require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/db');

const BROADCAST_MESSAGE = "Cảnh báo lừa đảo qua mạng mới nhất: Hiện nay xuất hiện nhiều thủ đoạn mạo danh Công an để lừa đảo. Người dân tuyệt đối không chuyển tiền hoặc cung cấp mã OTP cho bất kỳ ai. Trân trọng!";

async function sendFacebookMessage(recipientId, messageText) {
  const isPlaceholderToken = !process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN === 'your_fb_page_access_token_here';
  if (isPlaceholderToken) {
    console.log(`[FB SIMULATOR] Would send broadcast to ${recipientId}: ${messageText}`);
    return;
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
      messaging_type: "MESSAGE_TAG",
      tag: "CONFIRMED_EVENT_UPDATE"
    })
  });

  if (!response.ok) {
    const errData = await response.text();
    throw new Error(`HTTP ${response.status}: ${errData}`);
  }
}

async function main() {
  console.log('--- BẮT ĐẦU GỬI THÔNG BÁO HÀNG LOẠT ---');
  try {
    const users = await db.getAllUsers();
    console.log(`Tìm thấy ${users.length} người dùng trong cơ sở dữ liệu.`);
    
    let successCount = 0;
    let failCount = 0;

    for (const userId of users) {
      try {
        await sendFacebookMessage(userId, BROADCAST_MESSAGE);
        console.log(`- Đã gửi thông báo cho user: ${userId}`);
        successCount++;
        // Thêm delay nhỏ để tránh limit rate của API
        await new Promise(res => setTimeout(res, 200));
      } catch (err) {
        console.error(`- Lỗi khi gửi cho user ${userId}:`, err.message);
        failCount++;
      }
    }

    console.log('--- HOÀN TẤT ---');
    console.log(`Thành công: ${successCount}, Thất bại: ${failCount}`);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
  } finally {
    process.exit(0);
  }
}

main();
