# BẢN ĐỒ KIỂM TOÁN VÀ TÁI CẤU TRÚC DỮ LIỆU (DATA MAPPING)
> **Cập nhật 2026-06-22 cho khớp commit f9642fa (đổi thanh_tra→PX05, cqdt→PC01; PA05=an ninh mạng).**

*(Dự thảo chờ Checkpoint 1 duyệt)*

Dựa trên phân tích các file text nguyên khối khổng lồ trong thư mục `data/` hiện tại, hệ thống đề xuất chia tách và tái cấu trúc cây thư mục theo hệ lực lượng chuẩn của ngành Công an như sau:

## 1. Các file được DỊCH CHUYỂN TOÀN BỘ (Không cần cắt xén)
| File nguồn hiện tại | Thư mục/File đích đề xuất | Phụ trách nghiệp vụ (Lực lượng) |
| --- | --- | --- |
| `data/cu_tru.txt` (119KB) | `data/PC06/cu_tru.txt` | Cảnh sát QLHC về TTXH |
| `data/can_cuoc.txt` (139KB) | `data/PC06/can_cuoc.txt` | Cảnh sát QLHC về TTXH |
| `data/giao_thong.txt` (317KB) | `data/PC08/giao_thong.txt` | Cảnh sát Giao thông |
| `data/ngoai_kieu.txt` (28KB) | `data/PA08/ngoai_kieu.txt` | Quản lý Xuất nhập cảnh |
| `data/thu_tuc_hanh_chinh.txt` (5KB) | `data/_chung/thu_tuc_hanh_chinh.txt` | Tiếp dân chung |
| `data/tu_dien.txt` (1.7KB) | `data/_chung/tu_dien.txt` | Từ điển NLP (Từ lóng/Viết tắt) |

## 2. Các file BỊ LẪN LỘN NGHIỆP VỤ (Cần Cắt / Tách)

### 2.1 File `data/khieu_nai.txt` (224KB)
File này hiện đang chứa trộn lẫn cả khiếu nại hành chính và tin báo tội phạm.
- **Tách Phần 1 (Khiếu nại, tố cáo Cán bộ/Hành chính):** Chuyển sang `data/PX05/khieu_nai_to_cao.txt` (Thanh tra Công an).
- **Tách Phần 2 (Tố giác, tin báo tội phạm, trộm cắp, lừa đảo):** Chuyển sang `data/PC01/to_giac_tin_bao_toi_pham.txt` (Cơ quan Cảnh sát điều tra).

### 2.2 File `data/an_ninh.txt` (265KB)
Đây là file có mức độ trộn lẫn nghiệp vụ cao nhất, từ giấy phép kinh doanh, cháy nổ đến luật không gian mạng.
- **Tách Mục I (ANTT, Giấy phép KD có ĐK):** Chuyển sang `data/PC06/an_ninh_trat_tu.txt`.
- **Tách Mục II (PCCC, CNCH, Nội quy chữa cháy):** Chuyển sang `data/PC07/pccc_cnch.txt`.
- **Tách Mục III (Luật bảo vệ dữ liệu cá nhân 2025, Chỉ thị 57 an ninh mạng...):** Chuyển sang `data/PA05/an_ninh_mang.txt` (An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao).
- **Tách Mục IV (An ninh nội bộ, chống phản động nếu có):** Chuyển sang `data/PA05/an_ninh_mang.txt`.

## Lợi ích của kiến trúc mới
1. **ChromaDB độc lập:** Giúp tách các collection theo phòng ban (VD: `db_pc06_cutru`, `db_pc07_pccc`), giảm thiểu hallucination (bot râu ông nọ cắm cằm bà kia).
2. **Dễ bảo trì:** Khi có luật PCCC mới, cán bộ chỉ cần cập nhật file trong `PC07/` thay vì bới tung file `an_ninh.txt` 3400 dòng.

---
**Yêu cầu xác nhận (Checkpoint 1):** 
1. Đơn vị đồng ý với bản đồ chia tách này không?
2. Có cần tinh chỉnh hay thay đổi tên các phòng/ban (PC06, PC07, PA05, CQĐT) cho thân thiện hơn với quy trình nội bộ của Công an Phường không?
