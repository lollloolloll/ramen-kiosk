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

ENV DATABASE_URL=/app/data/local.db

RUN mkdir -p /app/data && sqlite3 /app/data/local.db "VACUUM;"
RUN npm run build

# 3️⃣ Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache sqlite su-exec

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY .env.production /app/.env.production

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next
RUN mkdir -p /app/data && chmod -R 777 /app/data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]