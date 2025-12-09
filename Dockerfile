# 1️⃣ Builder stage
FROM node:22-slim AS builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 make g++ sqlite3 && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

RUN npm install --platform=linux --arch=x64 sharp

# Tailwind CSS와 lightningcss 관련 패키지 재설치
RUN npm install --force \
    lightningcss \
    @tailwindcss/postcss \
    @tailwindcss/node \
    @tailwindcss/oxide

COPY . .

RUN mkdir -p /app/data && sqlite3 /app/data/local.db "VACUUM;"
RUN npm run build

# Runner stage는 동일...

# 2️⃣ Runner stage
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    sqlite3 gosu && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Seoul

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    mkdir -p /app/data /app/public/uploads .next && \
    chown -R nextjs:nodejs /app/data /app/public .next

COPY .env.production /app/.env.production
COPY package.json package-lock.json* ./
COPY drizzle.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY entrypoint.sh /entrypoint.sh
# Windows CRLF 라인엔딩 방지 및 실행권한 부여
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

RUN chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true
ENV BODY_SIZE_LIMIT=104857600

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]