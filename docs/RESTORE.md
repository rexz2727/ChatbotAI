# QUY TRÌNH KHÔI PHỤC DỮ LIỆU (G1)

> Đã diễn tập khôi phục thật ngày: 2026-07-04
> Backup nằm tại `~/backups/chatbot/` trên host. SQLite: hằng ngày 02:30. Chroma: Chủ nhật 03:00.
> Timer: `systemctl --user list-timers | grep chatbot` · Log chạy: `journalctl --user -u chatbot-backup-sqlite.service`

## Dữ kiện quan trọng

- Volume SQLite live: **`sqlite-data`** (KHÔNG phải `chatbotai_sqlite-data` — volume cũ, dữ liệu dừng 26/06/2026).
- Volume Chroma live: **`chatbotai_chroma-data`**.
- DB chạy WAL mode → khi khôi phục PHẢI xóa `database.db-wal`/`-shm` cũ, nếu không SQLite sẽ replay WAL không khớp.
- File trong volume thuộc subuid (100999) → mọi thao tác GHI vào volume làm qua `podman unshare`.

## A. Khôi phục SQLite (mất/hỏng database.db)

    # 1) Chọn bản backup và giải nén
    gunzip -kc ~/backups/chatbot/sqlite/database-YYYYMMDD.db.gz > /tmp/restore.db

    # 2) Dừng app (tránh ghi đè trong lúc thay file)
    podman stop chatbot-app

    # 3) Thay file trong volume + xóa WAL/SHM cũ + trả đúng owner (chạy trong user-namespace của podman)
    podman unshare bash -c '
      V=$HOME/.local/share/containers/storage/volumes/sqlite-data/_data
      cp /tmp/restore.db "$V/database.db"
      rm -f "$V/database.db-wal" "$V/database.db-shm"
      chown --reference="$V" "$V/database.db"
    '

    # 4) Khởi động lại và kiểm tra
    podman start chatbot-app
    podman exec chatbot-app node -e 'const s=require("sqlite3");const d=new s.Database("/app/data/database.db",s.OPEN_READONLY);d.get("SELECT COUNT(*) AS c FROM messages",(e,r)=>{if(e)throw e;console.log("messages_count="+r.c);});'

So `messages_count` in ra với con số trong `~/backups/chatbot/sqlite/backup.log` của đúng ngày backup — phải BẰNG NHAU.

## B. Khôi phục ChromaDB

Cách 1 — từ backup tuần:

    gunzip -k ~/backups/chatbot/chroma/chroma-YYYYMMDD.tar.gz
    podman stop chatbot-chromadb
    podman volume import chatbotai_chroma-data ~/backups/chatbot/chroma/chroma-YYYYMMDD.tar
    podman start chatbot-chromadb

Cách 2 — tái tạo từ nguồn (khi backup không dùng được): `npm run init-db` (nạp lại từ tài liệu trong repo/`docs/legal_pdfs/`), cache trả lời cũ tự vô hiệu.

## C. Việc định kỳ của chủ dự án (không tự động hóa được)

- Định kỳ (ít nhất hằng tuần) copy bản backup mới nhất ra máy/ổ đĩa KHÁC — backup cùng máy không chống được hỏng máy/mất máy ảo Hyper-V.
- KHÔNG đưa file backup vào git / cloud công cộng (chứa PII hội thoại của người dân).

## D. Nội dung 4 unit file systemd (khôi phục khi cài lại host)

`~/.config/systemd/user/chatbot-backup-sqlite.service`:
```ini
[Unit]
Description=Chatbot G1 - daily SQLite backup

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash %h/Projects/ChatbotAI/scripts/backup_db.sh
```

`~/.config/systemd/user/chatbot-backup-sqlite.timer`:
```ini
[Unit]
Description=Chatbot G1 - daily SQLite backup at 02:30

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

`~/.config/systemd/user/chatbot-backup-chroma.service`:
```ini
[Unit]
Description=Chatbot G1 - weekly ChromaDB backup

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash %h/Projects/ChatbotAI/scripts/backup_chroma.sh
```

`~/.config/systemd/user/chatbot-backup-chroma.timer`:
```ini
[Unit]
Description=Chatbot G1 - weekly ChromaDB backup Sunday 03:00

[Timer]
OnCalendar=Sun *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```
