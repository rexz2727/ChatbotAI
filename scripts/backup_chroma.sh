#!/usr/bin/env bash
# G1 — Snapshot volume ChromaDB hằng tuần. Chạy TRÊN HOST (rootless podman).
# Chroma tái tạo được bằng `npm run init-db` nên chấp nhận export nóng (không dừng container);
# nếu bản export lỗi thì init-db lại từ docs/legal_pdfs/ + data txt.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/chatbot/chroma}"
STAMP="$(date +%Y%m%d)"
OUT="$BACKUP_DIR/chroma-$STAMP.tar"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

# Volume live đã xác minh 2026-07-04: chatbotai_chroma-data (mount /data của chatbot-chromadb)
podman volume export chatbotai_chroma-data --output "$OUT"
gzip -f "$OUT"
gzip -t "$OUT.gz"

echo "$(date -Is) OK chroma-$STAMP.tar.gz $(stat -c%s "$OUT.gz") bytes" >> "$LOG"

# Giữ ~5 bản tuần gần nhất
find "$BACKUP_DIR" -name 'chroma-*.tar.gz' -mtime +35 -delete
