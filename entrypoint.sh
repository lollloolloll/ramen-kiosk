#!/bin/sh
set -e

mkdir -p /app/data
chmod -R 777 /app/data

DB_FILE="/app/data/local.db"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Creating database..."
  sqlite3 "$DB_FILE" "VACUUM;"
fi

chmod -R 777 /app/data

# ⭐ 마이그레이션 항상 실행 (조건 없이)
echo "Running migrations..."
if [ -d /app/drizzle ]; then
  cd /app
  export DATABASE_URL="file:/app/data/local.db"
  npx drizzle-kit push:sqlite || echo "Migration skipped"
else
  echo "Drizzle folder not found, skipping migration"
fi

echo "Starting Next.js..."
DATABASE_URL="file:/app/data/local.db" exec node server.js