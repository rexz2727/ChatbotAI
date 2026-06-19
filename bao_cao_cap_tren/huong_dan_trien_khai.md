# TÀI LIỆU PHÂN TÍCH VÀ HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG TRÊN MÁY CHỦ (VPS)

Quá trình chuyển đổi hệ thống Chatbot AI từ môi trường thử nghiệm sang vận hành thực tế đòi hỏi một kiến trúc phần mềm cực kỳ chặt chẽ và được tính toán cẩn thận từ trước. Mỗi lựa chọn công nghệ, từ hệ điều hành, runtime environment cho đến cách kết nối mạng, đều không phải là quyết định tùy tiện mà xuất phát từ những yêu cầu thực tiễn rất cụ thể về hiệu năng, tính ổn định lâu dài và an toàn thông tin. Tài liệu này đi sâu phân tích tường tận lý do đằng sau từng quyết định đó, đồng thời cung cấp các bước thao tác triển khai đã được kiểm nghiệm.

---

## 1. Phân tích Chiến lược Lựa chọn Hạ tầng Hệ điều hành

Môi trường vận hành được khuyến nghị là một Máy chủ Ảo (VPS) hoặc máy chủ vật lý chạy hệ điều hành nhân Linux, cụ thể là **Ubuntu 22.04 LTS hoặc Debian 12 phiên bản Minimal**, tức là phiên bản không cài đặt bất kỳ giao diện đồ họa nào. Cấu hình phần cứng tối thiểu cần đảm bảo là 2 vCPU, 4GB RAM và ổ cứng SSD dung lượng từ 30GB trở lên.

Câu hỏi nhiều người đặt ra là: tại sao lại phải dùng phiên bản Minimal không có giao diện, trong khi giao diện đồ họa giúp thao tác trực quan hơn? Câu trả lời nằm ở phép tính tài nguyên rất thực dụng. Một giao diện Desktop đầy đủ (GNOME, KDE...) tiêu tốn từ 1.5GB đến 2GB RAM chỉ để duy trì các tiến trình hiển thị. Đây là tài nguyên lãng phí hoàn toàn trên một máy chủ không có người ngồi trước màn hình. Ngược lại, hệ điều hành Minimal giải phóng hoàn toàn dung lượng RAM đó để phục vụ cho hai tác vụ nặng nhất của hệ thống: **ChromaDB** cần bộ nhớ để tải và tính toán các Vector AI, và **Node.js** cần RAM sạch để xử lý hàng ngàn kết nối đồng thời.

Bên cạnh lợi ích về hiệu năng, việc loại bỏ giao diện đồ họa còn mang lại một lợi thế an ninh quan trọng: thu hẹp "Bề mặt tấn công" (Attack Surface). Mỗi gói phần mềm được cài đặt trên máy chủ là một điểm tiềm ẩn lỗ hổng. Hệ điều hành Minimal chỉ chứa những gì thực sự cần thiết, đồng nghĩa với việc có ít lỗ hổng Zero-day hơn để tin tặc khai thác. Đây là một nguyên tắc cơ bản trong bảo mật hệ thống được đúc kết từ hàng thập kỷ vận hành máy chủ thực tế.

*Chuẩn bị môi trường cơ bản:*
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano python3 python3-pip python3-venv sqlite3 build-essential
```
*Lưu ý:* Gói `build-essential` cung cấp trình biên dịch C/C++ mà một số thư viện Node.js (đặc biệt là SQLite3) bắt buộc phải có để biên dịch trực tiếp trên máy chủ. Thiếu gói này quá trình `npm install` sẽ thất bại với lỗi không rõ ràng.

---

## 2. Phân tích Kiến trúc Xử lý Đa luồng (Node.js & PM2)

Tầng giao tiếp trung gian — nơi trực tiếp hứng chịu toàn bộ lưu lượng Webhook đổ về từ Facebook và Zalo, định tuyến yêu cầu, gọi AI và trả kết quả — được xây dựng trên nền tảng **Node.js**. Đây không phải lựa chọn ngẫu nhiên mà xuất phát từ một phân tích kiến trúc cụ thể.

Trong các ngôn ngữ lập trình web truyền thống như PHP hay Java Servlets, mỗi yêu cầu đến từ người dùng sẽ được cấp phát một luồng thực thi (Thread) độc lập. Khi có 1.000 người nhắn tin cùng một lúc, máy chủ cần khởi tạo 1.000 Thread, mỗi Thread chiếm một phần bộ nhớ RAM và năng lực CPU. Ở mức tải đó, máy chủ cấu hình thấp sẽ nhanh chóng cạn kiệt tài nguyên và sập. Node.js giải quyết bài toán này bằng một triết lý hoàn toàn khác: **một luồng duy nhất xử lý tất cả, nhưng không bao giờ chờ đợi bị động**. Khi gửi yêu cầu gọi AI, thay vì ngồi im chờ phản hồi (Blocking), Node.js đăng ký một "lời hứa" (Promise/Callback) rồi ngay lập tức quay sang xử lý tin nhắn của người dùng tiếp theo. Khi AI phản hồi về, hệ thống gọi lại hàm xử lý kết quả. Kiến trúc Bất đồng bộ Không chặn (Asynchronous Non-blocking I/O) này cho phép một máy chủ nhỏ xử lý hàng chục ngàn kết nối đồng thời một cách mượt mà.

Tuy nhiên, chạy Node.js trực tiếp trên máy chủ là cách làm rủi ro và thiếu chuyên nghiệp. Nếu ứng dụng gặp lỗi logic không được bắt xử lý (Uncaught Exception), cả tiến trình sẽ sụp đổ và Chatbot sẽ ngừng hoạt động hoàn toàn, không ai hay biết cho đến khi có người phát hiện. Đây là lý do vì sao ứng dụng phải được bọc trong **PM2** — một trình quản lý tiến trình chuyên nghiệp. PM2 giám sát ứng dụng liên tục, lập tức khởi động lại khi có sự cố trong vòng chưa tới 1 giây, ghi chép toàn bộ nhật ký lỗi để phục vụ điều tra sau này, và quan trọng nhất là đăng ký như một dịch vụ hệ thống (System Service) để tự động sống dậy sau mỗi lần máy chủ khởi động lại.

*Cài đặt Node.js (bản LTS ổn định nhất) và PM2:*
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install pm2 -g
```

---

## 3. Tích hợp Động cơ AI và Khởi tạo Cơ sở Dữ liệu Vector (ChromaDB)

Nếu Node.js là hệ thần kinh trung ương chịu trách nhiệm tiếp nhận và truyền dẫn tín hiệu, thì **Python và ChromaDB** chính là vùng não tư duy nơi mọi quyết định thông minh thực sự được tạo ra. Hai thành phần này vận hành song song trong hệ thống, mỗi bên đảm nhiệm đúng thế mạnh của mình.

Lý do bắt buộc phải dùng Python cho phần AI không chỉ là thói quen hay xu hướng. Hệ sinh thái khoa học dữ liệu và AI của Python (NumPy, SciPy, các thư viện Embedding...) là sản phẩm của hàng thập kỷ tích lũy bởi cộng đồng nghiên cứu toàn thế giới, không có ngôn ngữ nào có thể sánh kịp về độ trưởng thành và hiệu năng trong lĩnh vực này. ChromaDB — cơ sở dữ liệu Vector được chạy trên Python — là một hệ quản trị dữ liệu hoàn toàn khác về bản chất so với SQL: thay vì lưu trữ các hàng và cột, nó lưu trữ các Vector toán học không gian đa chiều và cho phép truy vấn theo khoảng cách ngữ nghĩa. Điều này cho phép hệ thống hiểu rằng người dân hỏi *"bị mất trộm"* và *"bị cướp giật"* đều cần được điều hướng đến cùng một nhóm văn bản pháp luật về trình báo tài sản mất cắp, dù không có từ khóa nào trùng khớp.

Để tránh xung đột với các thư viện Python hệ thống, ChromaDB phải được cài đặt trong một Môi trường ảo riêng biệt (Virtual Environment). Đây là một thông lệ bắt buộc trong lập trình Python chuyên nghiệp, giúp cô lập hoàn toàn các thư viện của ứng dụng ra khỏi môi trường hệ thống.

*Tải mã nguồn, cài đặt môi trường và nạp tri thức pháp luật vào AI:*
```bash
# 1. Lấy mã nguồn từ kho lưu trữ
git clone https://github.com/rexz2727/ChatbotAI.git
cd ChatbotAI

# 2. Cài đặt các thư viện Node.js
npm install

# 3. Tạo môi trường Python ảo và cài ChromaDB
python3 -m venv venv
source venv/bin/activate
pip install chromadb

# 4. Khởi tạo cơ sở dữ liệu Vector bằng cách nạp văn bản luật
node src/init_db.js
```
Bước cuối cùng — `node src/init_db.js` — là bước tốn thời gian nhất (từ 5 đến 15 phút tùy số lượng văn bản) nhưng chỉ cần thực hiện một lần duy nhất, hoặc mỗi khi có văn bản pháp luật mới được cập nhật vào hệ thống. Đây là quá trình máy tính "đọc và học thuộc" toàn bộ kho luật để có thể tra cứu tức thời về sau.

---

## 4. Phân tích Kiến trúc An ninh Mạng Zero-Trust (Cloudflare Tunnel)

Đây là một trong những phần quan trọng nhất và thường bị đánh giá thấp nhất của quá trình triển khai. Để Webhook của Facebook hay Zalo hoạt động, máy chủ phải có khả năng tiếp nhận các yêu cầu từ Internet. Cách tiếp cận thông thường — mở Port 80 hoặc 443 trên Router và NAT trực tiếp vào máy chủ — tạo ra một nguy cơ an ninh khổng lồ: địa chỉ IP thật của máy chủ cơ quan bị phơi bày hoàn toàn trên Internet, trở thành mục tiêu dễ dàng cho các cuộc tấn công dò quét (Port Scanning), tấn công từ chối dịch vụ (DDoS) và khai thác lỗ hổng trực tiếp.

**Cloudflare Tunnel** giải quyết vấn đề này theo một hướng tư duy hoàn toàn đảo ngược. Thay vì để Internet "đẩy" kết nối vào máy chủ, công cụ `cloudflared` được chạy trên máy chủ sẽ chủ động "kéo" một kết nối bền vững đi ra ngoài đến cơ sở hạ tầng toàn cầu của Cloudflare. Từ thời điểm đó, tất cả traffic từ Facebook đến máy chủ sẽ đi qua đường hầm mã hóa này — máy chủ nội bộ hoàn toàn tàng hình trên bản đồ Internet, không có IP công cộng, không có cổng nào mở, không có gì để tin tặc tấn công. Ngoài ra, Cloudflare còn đứng trước hệ thống như một lá chắn tự động lọc bỏ các cuộc tấn công DDoS quy mô lớn trước khi chúng chạm đến máy chủ.

*Thiết lập và khởi động toàn bộ hệ thống:*
```bash
# Khởi chạy ChromaDB trên cổng 8000 nội bộ
pm2 start ./venv/bin/chroma --name "ChromaDB" -- run --path ./chroma_data --port 8000

# Khởi chạy ứng dụng Chatbot Node.js
pm2 start src/index.js --name "Chatbot_CA"

# Ghi lại cấu hình và đăng ký khởi động cùng hệ điều hành
pm2 save && pm2 startup

# Cài đặt Cloudflare Tunnel và tạo đường hầm bảo mật
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel --url http://localhost:3000
```

Sau khi chạy lệnh cuối cùng, hệ thống sẽ in ra một đường link có dạng `https://ten-ngau-nhien.trycloudflare.com`. Đây là địa chỉ Webhook duy nhất cần được cung cấp cho Facebook Developers và Zalo Developer Hub. Mọi tin nhắn người dân gửi đến Fanpage hay OA sẽ đi theo đường dẫn này, qua Cloudflare, xuống đường hầm mã hóa, và đến thẳng hệ thống Chatbot đang chạy kín tiếng bên trong.
