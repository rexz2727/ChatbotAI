# GEMINI WORKSPACE INSTRUCTIONS (GEMINI.md)

This file contains rules and coding standards for developers and AI agents working on the **Chatbot AI Công an Phường** project, incorporating optimization strategies from Andrej Karpathy's LLM guidelines.

---

## 🚀 AGENT CORE CONSTRAINTS

1. **Subagents First**: Always use `invoke_subagent` for parallelizable, independent sub-tasks (e.g. drafting law content, writing helper utilities, db unit testing) to optimize velocity.
2. **Reasoning Optimization**: Always use `codegraph` indexing and structured reasoning (`sequential-thinking`) to minimize token usage and avoid semantic drift.
3. **Clarify Before Action**: Do not guess requirements. If any part of the spec or user instruction is ambiguous, ask the user immediately to conserve token usage.
4. **Task Prioritization**: Implement tasks from easiest to hardest. Batch easy tasks to be processed by subagents in parallel.

---

## 🧠 LLM BEHAVIORAL INSTRUCTIONS (ANDREJ KARPATHY METHOD)

### 1. Think Before Coding
- **Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First
- **Minimum code that solves the problem. Nothing speculative.**
- No extra features, abstractions, or configurable properties unless explicitly requested.
- "If you write 200 lines and it could be 50, rewrite it."
- Avoid writing error handling for impossible scenarios.

### 3. Surgical Changes
- **Touch only what you must. Clean up only your own mess.**
- Do not touch or "improve" adjacent formatting, comments, or refactor working code.
- Match the existing style exactly.
- Remove imports/variables/functions that *your* changes made unused. Do not remove pre-existing unused code unless asked.

### 4. Goal-Driven Execution
- **Define success criteria. Loop until verified.**
- Translate ambiguous requests into verifiable test goals (e.g., write a test reproducing a bug, then fix it).
- For multi-step tasks, lay out a brief plan mapping steps directly to verification checks.

---

## 💻 DEVELOPMENT STYLE & COMMANDS

### JavaScript (Node.js) Standards
- Use modern ES6+ features (`const`, `let`, arrow functions).
- Indentation: 2 spaces.
- Semicolons: Required (`;`).
- Strict Error Handling: Always wrap asynchronous calls in `try...catch` and log errors via `console.error`.
- Modular Files: Keep files dedicated to a single responsibility (e.g., `db.js` for SQLite, `chatbot.js` for routing, `index.js` for Express).

### Common Project Commands
- **Install dependencies**: `npm install`
- **Initialize ChromaDB**: `node init_db.js`
- **Run dev server locally**: `node index.js`
- **Start background process**: `pm2 start index.js --name "CA_Phuong_Chatbot"`
- **Monitor logs**: `pm2 logs CA_Phuong_Chatbot`
- **Run containerized via Docker Compose**: `docker compose up --build -d`
- **Seed database inside Docker**: `docker compose exec chatbot npm run init-db`
- **Monitor Docker logs**: `docker compose logs -f`

---

> Refer to [rules.md](file:///home/chatbot/Projects/ChatbotAI/.agents/rules/rules.md) for full Vietnamese instructions.
