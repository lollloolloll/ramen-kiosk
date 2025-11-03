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

# ⭐ 시간대 설정을 위해 tzdata 패키지 추가
RUN apk add --no-cache sqlite su-exec tzdata

# ⭐ 한국 시간(KST)으로 시간대 설정
ENV TZ=Asia/Seoul

# 비-루트 사용자 생성 및 권한 설정
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs && \
    mkdir -p /app/data .next && \
    chown -R nextjs:nodejs /app/data .next

# 프로덕션 환경변수 및 의존성 파일 복사
COPY .env.production /app/.env.production
COPY package.json package-lock.json* ./
COPY drizzle.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

# 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 엔트리포인트 스크립트 복사 및 실행 권한 부여
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true
ENV BODY_SIZE_LIMIT=104857600

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
