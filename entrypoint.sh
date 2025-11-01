#!/bin/sh
set -e

# root로 실행 중이므로 권한 설정 가능
mkdir -p /app/data
chmod -R 777 /app/data

DB_FILE="/app/data/local.db"

if [ ! -f "$DB_FILE" ]; then
  echo "Database file not found. Creating and migrating..."
  touch "$DB_FILE"
  chmod 666 "$DB_FILE"
  
  if [ -f /app/node_modules/.bin/drizzle-kit ]; then
    /app/node_modules/.bin/drizzle-kit migrate
  else
    echo "drizzle-kit not found. Skipping migration."
  fi
else
  echo "Database file already exists. Skipping creation and migration."
fi

# 최종 권한 확인
chown -R nextjs:nodejs /app/data
chmod -R 777 /app/data

echo "Starting Next.js as nextjs user..."

# nextjs 유저로 전환해서 Node.js 실행
exec su-exec nextjs "$@"