#!/bin/sh
set -e

mkdir -p /app/data
chmod -R 777 /app/data

# uploads 폴더 생성 및 권한 설정 추가
mkdir -p /app/public/uploads
chown -R nextjs:nodejs /app/public/uploads

DB_FILE="/app/data/local.db"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Creating database..."
  sqlite3 "$DB_FILE" "VACUUM;"
fi

chmod -R 777 /app/data

# ⭐ Drizzle Kit의 공식 마이그레이션 명령 실행
echo "Running migrations using Drizzle Kit..."
export DATABASE_URL="file:/app/data/local.db"
npm run db:migrate

# 테이블 확인
echo "Tables in database:"
sqlite3 "$DB_FILE" ".tables"

echo "Starting Next.js..."
exec su-exec nextjs node server.js
