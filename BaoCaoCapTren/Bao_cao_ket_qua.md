# BÁO CÁO PHÂN TÍCH CHUYÊN SÂU KẾT QUẢ TRIỂN KHAI DỰ ÁN CHATBOT AI

## 1. Tầm nhìn và Vai trò Chiến lược của Hệ thống

Dự án Chatbot AI dành cho Công an Phường không đơn thuần là một công cụ trả lời tự động được lập trình sẵn theo kịch bản cứng nhắc (Rule-based Bot), mà là một **Trợ lý ảo pháp lý** có khả năng tư duy, tổng hợp và diễn giải ngôn ngữ tự nhiên. Sự khác biệt cốt lõi nằm ở chỗ: trong khi một Bot theo kịch bản chỉ biết trả lời đúng các câu hỏi được lập trình sẵn, hệ thống này có thể tiếp nhận bất kỳ cách hỏi nào của người dân và tự suy luận ra câu trả lời phù hợp dựa trên kho tri thức pháp luật được cung cấp.

Chức năng cốt lõi của hệ thống là tự động hóa hoàn toàn quá trình tiếp nhận và giải đáp các thắc mắc lặp đi lặp lại của người dân về thủ tục hành chính (đăng ký cư trú, cấp Căn cước Công dân, vi phạm giao thông, khiếu nại tố cáo...) thông qua hai nền tảng mạng xã hội phổ biến nhất hiện nay là Facebook Messenger và Zalo. Đây là sự lựa chọn chiến lược, bởi lẽ người dân không cần cài đặt thêm bất kỳ ứng dụng nào mà vẫn được tiếp cận dịch vụ hành chính ngay trên các ứng dụng họ đang dùng hàng ngày.

Việc hệ thống hoạt động bền bỉ 24 giờ một ngày, 7 ngày một tuần, kể cả ngày lễ Tết hay những đêm khuya sau giờ hành chính, không chỉ đáp ứng tức thời nhu cầu tra cứu của công dân mà còn giải phóng một lượng lớn thời gian và áp lực công việc cho Cán bộ, Chiến sĩ trực ban. Thay vì phải lặp đi lặp lại việc giải thích các quy trình cơ bản nhiều chục lần mỗi ngày, lực lượng có thể tập trung toàn bộ trí lực vào các vụ việc phức tạp, các tình huống đòi hỏi phán đoán chuyên môn và kinh nghiệm thực tiễn mà máy móc không thể thay thế được.

---

## 2. Phân tích Cơ chế Truy xuất Tri thức Pháp luật (RAG)

Một trong những thách thức lớn nhất và cũng nguy hiểm nhất khi ứng dụng Trí tuệ Nhân tạo vào lĩnh vực hành chính công chính là hiện tượng "ảo giác" (Hallucination). Đây là đặc điểm cố hữu của các Mô hình Ngôn ngữ Lớn (Large Language Model — LLM) như Gemini hay ChatGPT: khi gặp câu hỏi vượt ngoài phạm vi dữ liệu huấn luyện, thay vì thừa nhận sự không biết, AI sẽ tự động tổ hợp các kiến thức liên quan để tạo ra một câu trả lời nghe có vẻ tự tin và logic, nhưng nội dung hoàn toàn bịa đặt. Trong bối cảnh tư vấn pháp luật, điều này không chỉ gây nhầm lẫn mà còn có thể tạo ra những hậu quả pháp lý nghiêm trọng cho người dân tin tưởng vào thông tin đó để hành xử.

Để triệt tiêu rủi ro cực kỳ nghiêm trọng này, hệ thống đã được thiết kế dựa trên kiến trúc **RAG (Retrieval-Augmented Generation — Tạo sinh Có Bổ trợ Truy xuất)**. Đây là một bước tiến vượt bậc so với việc chỉ dùng LLM thuần túy: hệ thống đặt ra một nguyên tắc bất di bất dịch là AI chỉ được phép trả lời dựa trên những văn bản pháp lý chính thức do Cơ quan trực tiếp cung cấp và kiểm soát.

Cơ chế vận hành cụ thể diễn ra qua ba công đoạn liên tiếp. Đầu tiên, toàn bộ kho văn bản quy phạm pháp luật hiện hành — bao gồm Luật Cư trú 2020, Luật Căn cước 2023, Nghị định 144/2021, Nghị định 136/2020, các Thông tư liên quan và biểu mẫu hành chính — được đưa vào hệ thống dưới dạng tệp văn bản thuần túy, sau đó một thuật toán chuyên dụng sẽ cắt nhỏ chúng thành các khối ngữ nghĩa (Semantic Chunks) từ 500 đến 1.000 ký tự và mã hóa từng khối thành một dãy số thực không gian cao chiều (Vector). Mỗi Vector này là một "dấu vân tay" toán học duy nhất, đại diện cho ý nghĩa của đoạn văn bản tương ứng, và được lưu trữ vĩnh viễn trong ChromaDB.

Tiếp theo, khi người dân đặt câu hỏi, câu hỏi đó cũng được mã hóa thành một Vector theo cùng phương pháp. Hệ thống sẽ đo khoảng cách toán học giữa Vector câu hỏi và toàn bộ các Vector trong kho dữ liệu để tìm ra những đoạn luật có ý nghĩa gần giống nhất. Cuối cùng, các đoạn văn bản luật được truy xuất đó được đưa vào Prompt cùng câu hỏi của người dân, và Gemini AI chỉ đóng vai trò như một **biên tập viên tinh nhuệ**: đọc hiểu, diễn giải lại và trình bày nội dung đó một cách rõ ràng, thân thiện, dễ hiểu cho người dân. Việc AI không thể "tự do sáng tác" ra ngoài phạm vi văn bản được cung cấp chính là sự bảo chứng mạnh mẽ nhất cho tính hợp pháp và độ chính xác tuyệt đối của từng câu trả lời.

---

## 3. Phân tích Cấu trúc Quản lý Ngữ cảnh Hội thoại (Session Management)

Giao tiếp giữa con người không bao giờ là một chuỗi câu hỏi đứt đoạn và độc lập. Trong một cuộc trò chuyện thực, người ta dùng đại từ thay thế, rút gọn ngữ cảnh và giả định rằng đối phương vẫn nhớ những gì đã được đề cập trước đó. Thế nhưng về mặt kỹ thuật, bản chất của giao thức HTTP — nền tảng vận hành mọi Webhook — lại hoàn toàn phi trạng thái (Stateless), nghĩa là mỗi tin nhắn được gửi đi là một yêu cầu hoàn toàn độc lập, máy chủ không tự động nhớ bất kỳ điều gì từ tin nhắn trước.

Hệ quả thực tiễn của điều này rất dễ hình dung: nếu công dân hỏi *"Làm Căn cước Công dân cần giấy tờ gì?"*, AI trả lời đầy đủ, rồi công dân hỏi tiếp *"Thế bao lâu thì xong?"*, một hệ thống không có bộ nhớ sẽ không hiểu câu hỏi đó đang đề cập đến Căn cước hay một thủ tục nào khác, và sẽ đưa ra câu trả lời lan man hoặc sai lệch hoàn toàn.

Để giải quyết triệt để bài toán này, hệ thống đã tích hợp Cơ sở dữ liệu quan hệ **SQLite** vào ngay tầng lõi xử lý. Bất cứ khi nào một người dân bắt đầu nhắn tin, hệ thống tự động cấp phát một Mã định danh phiên (Session ID) duy nhất gắn liền với tài khoản mạng xã hội của họ. Từ đó về sau, mọi tin nhắn đều được ghi chép vào bảng dữ liệu tương ứng, và trước khi AI xử lý bất kỳ câu hỏi mới nào, hệ thống sẽ đọc lại và đính kèm toàn bộ lịch sử 8 đến 10 lượt thoại gần nhất vào Prompt. Nhờ cơ chế này, AI luôn có đầy đủ ngữ cảnh để trả lời đúng trọng tâm, giống như đang nói chuyện với một cán bộ thực sự biết mình đang nói về chuyện gì.

Việc lựa chọn SQLite thay vì các hệ quản trị cơ sở dữ liệu server-based như MySQL hay PostgreSQL là một quyết định kỹ thuật được cân nhắc kỹ. SQLite là một cơ sở dữ liệu dạng tệp nhúng (Embedded Database), không cần chạy một tiến trình máy chủ riêng biệt, tiêu thụ rất ít tài nguyên hệ thống, nhưng vẫn đảm bảo đầy đủ tính toàn vẹn dữ liệu theo chuẩn ACID. Đối với một hệ thống cấp Phường với quy mô giao dịch tính theo hàng trăm đến vài ngàn người dùng đồng thời, SQLite là lựa chọn tối ưu nhất về cả hiệu năng lẫn sự đơn giản trong vận hành và sao lưu dữ liệu.

---

## 4. Phân tích Cơ chế Phòng ngự và Cách ly Mã độc (Honeypot)

Việc công khai một kênh giao tiếp tương tác hai chiều trên mạng xã hội là một cánh cửa mở ra thế giới bên ngoài — và điều đó luôn đi kèm với rủi ro an ninh mạng đáng kể. Trong bối cảnh đơn vị Công an với hệ thống dữ liệu nhạy cảm, nguy cơ này càng phải được nhìn nhận nghiêm túc. Các đối tượng xấu, trong đó có những phần tử thù địch hoặc tội phạm mạng có tổ chức, hoàn toàn có thể lợi dụng cửa ngõ chat công khai để phát tán mã độc dưới dạng tệp tin đính kèm trông vô hại như hình ảnh hay tài liệu. Nếu mã độc này được thực thi trên máy chủ, toàn bộ cơ sở dữ liệu công dân và nhật ký hoạt động nội bộ của đơn vị có thể bị đánh cắp, mã hóa tống tiền hoặc xóa sổ hoàn toàn.

Để chủ động phòng ngừa thay vì chỉ phản ứng thụ động, hệ thống đã được thiết lập một màng lọc an ninh tích cực dưới dạng **Honeypot (Bẫy mật)**. Điểm thiết kế tinh tế nhất ở đây nằm ở triết lý phòng thủ: thay vì từ chối thẳng thừng và trả về thông báo lỗi khi nhận được tệp tin đáng ngờ — hành động này sẽ lập tức báo hiệu cho kẻ tấn công biết rằng hệ thống có tường lửa và kích thích chúng tìm cách khác tinh vi hơn — Honeypot chọn cách hành xử hoàn toàn ngược lại.

Tại cửa ngõ tiếp nhận đầu tiên (Webhook Router trong `honeypot.js`), mọi tệp tin người dùng tải lên đều bị hệ thống âm thầm quét định dạng chữ ký số (MIME Type Detection) và kiểm tra đặc trưng nhị phân ngay lập tức. Nếu phát hiện dấu hiệu bất thường, hệ thống sẽ gửi về một phản hồi "chấp nhận thành công" bình thường để không kích động kẻ tấn công. Tuy nhiên, ở tầng xử lý ngầm bên dưới, tệp tin đó ngay lập tức bị đổi phần mở rộng sang định dạng vô hại `.quarantined`, bị tước bỏ mọi quyền thực thi (Non-executable), và bị cưỡng chế cô lập vào một phân vùng riêng biệt (`data/quarantine/`) với quyền truy cập bị hạn chế ở mức tối đa. Tệp tin đó không bao giờ chạm được vào bộ nhớ hệ thống hay được mở bởi bất kỳ tiến trình nào.

Cơ chế này mang lại hai lợi ích song hành: thứ nhất, nó vô hiệu hóa mọi rủi ro ngay từ giây đầu tiên trước khi mã độc có bất kỳ cơ hội nào thực thi; thứ hai và quan trọng không kém, nó bảo toàn nguyên vẹn toàn bộ tệp tin nghi ngờ như một hiện vật pháp lý (Digital Evidence). Kho lưu trữ `quarantine/` theo thời gian trở thành bằng chứng kỹ thuật số có giá trị phục vụ cho công tác điều tra nguồn gốc tấn công, xác định chân dung tin tặc và có thể được dùng như tài liệu trình báo với cơ quan điều tra cấp trên khi cần.
