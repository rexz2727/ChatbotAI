FROM node:20

WORKDIR /app

COPY --chown=node:node package*.json ./

COPY --chown=node:node . .

RUN rm -rf node_modules && npm ci --only=production --build-from-source=sqlite3
RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
