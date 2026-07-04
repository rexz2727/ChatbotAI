#!/bin/bash
# Script bảo trì định kỳ: Backup dữ liệu sau đó khởi động lại hệ thống
echo "=========================================="
echo "BẮT ĐẦU BẢO TRÌ ĐỊNH KỲ: $(date)"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR/.."

echo "1. Đang thực hiện sao lưu CSDL SQLite..."
./scripts/backup_db.sh
if [ $? -ne 0 ]; then
  echo "[LỖI] Sao lưu SQLite thất bại. Hủy quá trình bảo trì."
  exit 1
fi

echo "2. Đang thực hiện sao lưu Vector DB (Chroma)..."
./scripts/backup_chroma.sh
if [ $? -ne 0 ]; then
  echo "[LỖI] Sao lưu Chroma thất bại. Hủy quá trình bảo trì."
  exit 1
fi

echo "3. Sao lưu thành công! Đang tiến hành khởi động lại hệ thống chatbot..."
# Khởi động lại container chatbot-app bằng podman
podman restart chatbot-app

if [ $? -eq 0 ]; then
  echo "Hệ thống đã được khởi động lại thành công!"
else
  echo "[LỖI] Khởi động lại chatbot-app thất bại!"
fi
echo "=========================================="
echo "HOÀN TẤT BẢO TRÌ: $(date)"
