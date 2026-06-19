FROM node:20-slim

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci --only=production

COPY --chown=node:node . .

RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
