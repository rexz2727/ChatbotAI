---
name: sqlite-session-manager
description: Guidelines for setting up and managing user chat sessions in SQLite for a stateful chatbot flow.
---

# SQLite Session Manager Skill

## Use this skill when
- Initializing or writing database helper code for managing chat states.
- Reading or writing code to fetch, update, or clear user session/routing states.

## Instructions
1. **Database Schema**: Use a table named `sessions` with columns:
   - `user_id` (TEXT, PRIMARY KEY): The unique identifier for the user (from Zalo/Facebook).
   - `agent_state` (TEXT): The current active agent or menu state (e.g. `AGENT_CU_TRU`, `AGENT_GIAO_THONG`, etc.).
   - `updated_at` (DATETIME): Timestamp of the last interaction to allow garbage collection.
2. **Implementation Details**:
   - Use the `sqlite3` Node.js package.
   - Initialize the database file at `database.db` locally.
   - Implement simple `async getSession(userId)` and `async setSession(userId, state)` methods.
   - Properly handle database connection errors.

## Example JavaScript Implementation
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        user_id TEXT PRIMARY KEY,
        agent_state TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});
```
