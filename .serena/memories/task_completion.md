# Task Completion

## After code changes
1. `node src/index.js` — verify server starts without errors
2. Manual syntax review (no linter configured)
3. Test webhook if chatbot logic changed

## After data/DB changes
1. `node src/init_db.js` — re-seed ChromaDB
2. Verify SQLite `data/chatbot.db` session table intact

## Docker deploy
1. `docker compose up --build -d`
2. `docker compose logs -f` — watch for errors
3. `docker compose exec chatbot npm run init-db` — if ChromaDB empty

## Note: No automated test suite — all verification is manual.
