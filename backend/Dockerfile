FROM node:20-slim AS base
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
