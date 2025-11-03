# 1️⃣ Dependencies stage
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 2️⃣ Builder stage
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ sqlite
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /app/data && sqlite3 /app/data/local.db "VACUUM;"
RUN npm run build

# 3️⃣ Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache sqlite su-exec tzdata

ENV TZ=Asia/Seoul

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs && \
    mkdir -p /app/data /app/public/uploads .next && \
    chown -R nextjs:nodejs /app/data /app/public .next

COPY .env.production /app/.env.production
COPY package.json package-lock.json* ./
COPY drizzle.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ⭐ uploads 폴더 권한 미리 설정
RUN chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true
ENV BODY_SIZE_LIMIT=104857600

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
