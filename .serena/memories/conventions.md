# Code Conventions

## Syntax
- ES6+: `const`/`let`, arrow functions, async/await — never `var`
- 2-space indentation
- Semicolons required on every statement
- camelCase for vars/functions: `handleUserMessage`, `getSessionState`
- SNAKE_UPPERCASE for constants: `RATE_LIMIT_DELAY`

## Error Handling
- All async calls in `try...catch`
- `console.error("description:", error)` — always include context string
- No verbose console.log in production; only key system events

## Module Design
- Single-responsibility files — `db.js` only SQLite, `chatbot.js` only chatbot logic
- Split if module > 300 lines

## Change Policy (from rules.md / Karpathy method)
- Surgical changes: touch only what is required
- No speculative features or abstractions
- No error handling for impossible scenarios
- Clarify ambiguous requirements before coding
- Use sequential-thinking MCP before complex multi-file changes
