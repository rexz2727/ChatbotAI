# Core — ChatbotAI Project Map

## Project
**ca-phuong-chatbot** — Chatbot AI hỗ trợ thủ tục hành chính Công an Phường (Vietnamese police admin chatbot).
Root: `/home/chatbot/Projects/ChatbotAI`

## Entry Points
- `src/index.js` — Express server, webhook endpoint, rate limiter, honeypot middleware
- `src/chatbot.js` — Core logic: ChromaDB semantic search → Gemini AI → SQLite session
- `src/db.js` — SQLite helpers (session CRUD)
- `src/init_db.js` — ChromaDB seeder: reads `data/`, embeds legal docs into vector store
- `src/honeypot.js` — Anti-abuse detection

## Data Layer
- **SQLite** (`data/chatbot.db`) — conversation sessions
- **ChromaDB** (`chromadb_data/`) — vector store for legal document embeddings
- `data/` — raw legal text files seeded into ChromaDB

## Config
- `.env` — GEMINI_API_KEY, PORT, WEBHOOK_VERIFY_TOKEN, PAGE_ACCESS_TOKEN

## Infrastructure
- `Dockerfile` + `docker-compose.yml` — containerized deploy, port 3000, bind mounts `data/` and `chromadb_data/`
- PM2 — local background process manager
- Cloudflare Tunnel (`cloudflared`) — external HTTPS

## Related Memories
- Tech stack details: `mem:tech_stack`
- Dev commands: `mem:suggested_commands`
- Code style: `mem:conventions`
- Task done checklist: `mem:task_completion`
