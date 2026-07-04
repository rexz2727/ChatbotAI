#!/usr/bin/env bash
# G1 — Sao lưu SQLite hằng ngày. Chạy TRÊN HOST (rootless podman), không cần sudo.
# VACUUM INTO tạo snapshot nhất quán kể cả khi app đang ghi (gom luôn nội dung WAL).
# Xoay vòng: giữ 30 bản ngày + 6 bản đầu-tháng (~185 ngày).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/chatbot/sqlite}"
STAMP="$(date +%Y%m%d)"
OUT="$BACKUP_DIR/database-$STAMP.db"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

# 1) Snapshot nhất quán bên trong container, dùng chính node+sqlite3 của app
#    (host & container đều không có sqlite3 CLI). In messages_count để đối chiếu khi restore.
#    Script node đưa qua heredoc 'EOF' (quoted) để bash không đụng vào dấu nháy trong SQL.
podman exec chatbot-app rm -f /app/data/backup_tmp.db
COUNT_LINE="$(podman exec -i chatbot-app node - <<'EOF'
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("/app/data/database.db");
db.serialize(() => {
  db.run("VACUUM INTO '/app/data/backup_tmp.db'", (err) => {
    if (err) { console.error("VACUUM INTO failed: " + err.message); process.exit(1); }
  });
  db.get("SELECT COUNT(*) AS c FROM messages", (err, row) => {
    if (err) { console.error(err.message); process.exit(1); }
    console.log("messages_count=" + row.c);
    db.close();
  });
});
EOF
)"

# 2) Đưa snapshot ra ngoài volume rồi dọn file tạm trong container
podman cp chatbot-app:/app/data/backup_tmp.db "$OUT"
podman exec chatbot-app rm -f /app/data/backup_tmp.db

# 3) Nén + kiểm tra toàn vẹn file nén
gzip -f "$OUT"
gzip -t "$OUT.gz"

echo "$(date -Is) OK database-$STAMP.db.gz $(stat -c%s "$OUT.gz") bytes $COUNT_LINE" >> "$LOG"

# 4) Xoay vòng: xóa bản ngày >30 ngày (trừ bản ngày 01 hằng tháng); bản đầu-tháng giữ ~6 tháng
find "$BACKUP_DIR" -name 'database-*.db.gz' ! -name 'database-??????01.db.gz' -mtime +30 -delete
find "$BACKUP_DIR" -name 'database-??????01.db.gz' -mtime +185 -delete
