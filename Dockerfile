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

# Create an empty database for the build process
RUN mkdir -p /app/data && sqlite3 /app/data/local.db "VACUUM;"

# Build the Next.js application
RUN npm run build

# 3️⃣ Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/local.db

# Install sqlite for migrations
RUN apk add --no-cache sqlite

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy necessary files for migrations
COPY package.json package-lock.json* ./
COPY drizzle.config.ts ./
COPY --chown=nextjs:nodejs drizzle ./drizzle

# Install dependencies including devDependencies needed for migrations
RUN npm ci && chown -R nextjs:nodejs node_modules

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy and set permissions for the entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh .
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
