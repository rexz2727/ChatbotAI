# Tech Stack

## Runtime
- Node.js — ES6+ plain `.js` (no TypeScript, no transpiler)
- npm (package manager), lockfile: `package-lock.json`

## Key Dependencies
| Package | Version | Role |
|---|---|---|
| `express` | ^4.19.2 | HTTP server |
| `@google/generative-ai` | ^0.24.1 | Gemini AI API client |
| `chromadb` | ^3.0.0 | Vector DB client |
| `sqlite3` | ^5.1.7 | Session store |
| `dotenv` | ^16.4.5 | Env config |
| `express-rate-limit` | ^8.5.2 | Rate limiting |
| `axios` | ^1.6.8 | HTTP client |

## Infrastructure
- Docker + Docker Compose — production container
- PM2 — local process manager
- Cloudflare Tunnel — HTTPS tunneling
