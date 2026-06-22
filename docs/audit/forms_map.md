# BẢN ĐỒ BIỂU MẪU (FORMS MAP)
> Cập nhật 2026-06-22. Map biểu mẫu trong `data/forms/` ↔ lĩnh vực ↔ phòng nghiệp vụ ↔ flow tham chiếu.
> Mã phòng theo `docs/audit/MAP_TONG.md`; flow payload theo `src/flows/`.

## 1. Biểu mẫu đã chuẩn hóa (.md có header Căn cứ ban hành)

| File (.md) | Biểu mẫu | Lĩnh vực | Phòng | Căn cứ ban hành | Flow tham chiếu |
| --- | --- | --- | --- | --- | --- |
| `CT01_To_Khai_Thay_Doi_Cu_Tru.md` | Tờ khai thay đổi thông tin cư trú (CT01) | Cư trú | PC06 | TT 66/2023/TT-BCA | `FLOW_CU_TRU_TT_HOSO`, `FLOW_CU_TRU_TAMT_HOSO` (cu_tru.js nhắc "Mẫu CT01") |
| `DC01_Phieu_Thu_Thap_Thong_Tin_Dan_Cu.md` | Phiếu thu thập thông tin dân cư (DC01) | Căn cước / dân cư | PC06 | TT 17/2024/TT-BCA → mới nhất TT 53/2025/TT-BCA | `FLOW_CAN_CUOC_*` (can_cuoc.js) |
| `NA17_Phieu_Khai_Bao_Tam_Tru_Nguoi_Nuoc_Ngoai.md` | Phiếu khai báo tạm trú người nước ngoài (NA17) | Ngoại kiều / XNC | PA08 | TT 04/2015/TT-BCA | `FLOW_NK_TAMTRU` |
| `Mau01_Ban_Khai_Ly_Lich_ANTT.md` | Bản khai lý lịch (kinh doanh ngành nghề có điều kiện về ANTT) | An ninh trật tự | PC06 (ANTT) | TT 42/2017/TT-BCA (NĐ 96/2016/NĐ-CP) | `FLOW_AN_NINH_ANTT_HOSO` (an_ninh.js) |
| `Mau01_Don_Khieu_Nai.md` | Đơn khiếu nại (Mẫu 01) | Khiếu nại hành chính | PX05 (Thanh tra) | Mẫu 01 NĐ 124/2020/NĐ-CP | `FLOW_KN_HANHCHINH` |
| `Mau_Don_To_Cao.md` | Đơn tố cáo | Tố cáo / tố giác | PX05 (tố cáo cán bộ) · PC01 (tố giác tội phạm) | Luật Tố cáo 2018 (mẫu tham khảo) | `FLOW_KN_TOGIAC` |
| `Mau_Don_Trinh_Bao_Mat_Tai_San.md` | Đơn trình báo mất tài sản | Tố giác tin báo tội phạm | PC01 (CSĐT) | Mẫu tham khảo, không bắt buộc theo VB | `FLOW_KN_TOGIAC` |

## 2. File .txt còn giữ lại — gắn cờ ⚠️ (KHÔNG xóa)

Các file dưới đây ban đầu được coi là bản trùng cần xóa. Sau khi đối chiếu: bản `.md` tương ứng là **biểu mẫu trống để điền**, còn bản `.txt` là **hướng dẫn kê khai chi tiết** (field-by-field + ví dụ + FAQ/lưu ý pháp lý). Đây KHÔNG phải bản trùng — nội dung hướng dẫn không có trong `.md`, nên giữ lại để tránh mất dữ liệu tri thức.

| File .txt giữ lại | Cặp .md | Lý do ⚠️ giữ |
| --- | --- | --- |
| `mau_ct01.txt` | `CT01_To_Khai_Thay_Doi_Cu_Tru.md` | .txt là hướng dẫn 14 trường + FAQ VNeID Mức 2 (NĐ 58/2026/NĐ-CP); .md là form trống, không chứa hướng dẫn |
| `mau_na17.txt` | `NA17_Phieu_Khai_Bao_Tam_Tru_Nguoi_Nuoc_Ngoai.md` | .txt là hướng dẫn kê khai + lưu ý mốc khai báo 12 giờ; .md là form trống |
| `mau_01_antt.txt` | `Mau01_Ban_Khai_Ly_Lich_ANTT.md` | .txt là hướng dẫn + nêu thêm căn cứ NĐ 96/2016/NĐ-CP (mà .md thiếu); .md là form trống |
| `don_khieu_nai.txt` | `Mau01_Don_Khieu_Nai.md` | .md là Mẫu 01 chính thức (NĐ 124/2020) nhưng thiếu trường SĐT và mục "Yêu cầu giải quyết khiếu nại" có trong .txt |

## 3. Ghi chú phòng nghiệp vụ
- **PC06** — Cảnh sát QLHC về TTXH: cư trú (CT01), căn cước/dân cư (DC01), ANTT kinh doanh có điều kiện (Mẫu 01 lý lịch).
- **PA08** — Quản lý Xuất nhập cảnh: khai báo tạm trú người nước ngoài (NA17).
- **PX05** — Thanh tra Công an: khiếu nại hành chính, tố cáo cán bộ.
- **PC01** — Cơ quan Cảnh sát điều tra: tố giác, tin báo tội phạm (đơn trình báo mất tài sản, đơn tố cáo hành vi có dấu hiệu tội phạm).
