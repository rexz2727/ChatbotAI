# Suggested Commands

## Development
```bash
npm install                    # install dependencies
node src/index.js              # run dev server (foreground)
```

## Database Init
```bash
node src/init_db.js            # seed ChromaDB with legal docs from data/
npm run init-db                # alias via npm script
```

## PM2 (background)
```bash
pm2 start src/index.js --name "CA_Phuong_Chatbot"
pm2 status
pm2 logs CA_Phuong_Chatbot
pm2 restart CA_Phuong_Chatbot
```

## Docker
```bash
docker compose up --build -d
docker compose exec chatbot npm run init-db
docker compose logs -f
docker compose down
```
