# Hướng dẫn sử dụng tính năng Broadcast/Push

Script broadcast.js được sử dụng để gửi thông báo hàng loạt (Push Notification) đến tất cả những người dùng đã từng tương tác với chatbot (danh sách được lấy từ bảng sessions trong cơ sở dữ liệu SQLite).

## Cách chạy

Mở terminal ở thư mục gốc của dự án và chạy lệnh sau:

```bash
node scripts/broadcast.js
```

## Chú ý

- Nội dung tin nhắn mẫu đang được cấu hình sẵn trong biến BROADCAST_MESSAGE bên trong file scripts/broadcast.js. Bạn có thể thay đổi biến này để tùy chỉnh nội dung thông báo.
- Script sẽ lần lượt đọc tất cả userId và gửi tin qua hàm tự viết qua API của Facebook.
- Script đã được thêm một khoảng thời gian chờ (delay) nhỏ giữa các tin nhắn để tránh bị Facebook chặn do Rate Limit.
