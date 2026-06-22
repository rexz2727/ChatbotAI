# BLUEPRINT: TÁI CẤU TRÚC VÀ MODULE HÓA FLOW.JS
> **Trạng thái (cập nhật 2026-06-22): ĐÃ THỰC THI.** Cấu trúc `src/flows/` đã được áp dụng (commit 526889f). Đã tách: `index.js`, `cu_tru.js`, `can_cuoc.js`, `giao_thong.js`, `an_ninh.js`. Các module `constants.js`, `ngoai_kieu.js`, `khieu_nai.js`, `tthc.js` đang được tách tiếp khỏi `index.js` theo đúng blueprint dưới đây.

*(Dự thảo chờ Checkpoint 2 duyệt)*

Hiện tại file `src/flow.js` chứa gần 600 dòng code, bao gồm toàn bộ kịch bản tĩnh, menu, và routing. Để dễ bảo trì, hệ thống đề xuất chẻ file này thành cấu trúc module như sau:

## 1. Cấu trúc thư mục mới: `src/flows/`
Thư mục này sẽ chứa toàn bộ logic điều hướng từng lĩnh vực.
```text
src/flows/
├── index.js          (Registry tổng, gom các module con lại để xuất ra cho chatbot.js)
├── constants.js      (Chứa các hằng số subMenus và danh bạ dùng chung)
├── cu_tru.js         (Chứa staticResponses của FLOW_CU_TRU_*)
├── can_cuoc.js       (Chứa staticResponses của FLOW_CAN_CUOC_*)
├── giao_thong.js     (Chứa staticResponses của FLOW_GIAO_THONG_*)
├── an_ninh.js        (Chứa staticResponses của FLOW_AN_NINH_*)
├── ngoai_kieu.js     (Chứa staticResponses của FLOW_NGOAI_KIEU_*)
├── khieu_nai.js      (Chứa staticResponses của FLOW_KHIEU_NAI_*)
└── tthc.js           (Chứa staticResponses của FLOW_TTHC_*)
```

## 2. Lợi ích
- Khi có thay đổi luật ở một mảng (VD: Thay đổi mức phí Giao thông), dev chỉ cần mở file `src/flows/giao_thong.js` để sửa mà không sợ ảnh hưởng đến các mảng khác.
- Dễ dàng giao việc cho nhiều dev cùng làm một lúc (tránh conflict git).

## 3. Cách thức kết nối vào `chatbot.js`
- `chatbot.js` thay vì gọi `require('./flow')` thì sẽ gọi `require('./flows/index')`.
- Không làm thay đổi bất kỳ tính năng hiện tại nào của Chatbot, chỉ là sắp xếp lại ngăn kéo mã nguồn cho gọn gàng.

---
**Yêu cầu xác nhận (Checkpoint 2):**
Bạn có đồng ý với bản thiết kế module hóa này không? Nếu đồng ý, tôi sẽ thao tác chẻ code ngay lập tức!
