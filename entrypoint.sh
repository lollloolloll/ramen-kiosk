#!/bin/bash
set -e

# root로 실행되는 부분
mkdir -p /app/data /app/public/uploads/promotion /app/public/uploads/consent
chown -R nextjs:nodejs /app/data /app/public/uploads
chmod -R 777 /app/public/uploads

DB_FILE="/app/data/local.db"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Creating database..."
  sqlite3 "$DB_FILE" "VACUUM;"
fi

chmod -R 777 /app/data

echo "Running migrations using Drizzle Kit..."
export DATABASE_URL="file:/app/data/local.db"
npm run db:migrate

echo "Tables in database:"
sqlite3 "$DB_FILE" ".tables"

echo "Starting Next.js..."
exec gosu nextjs node server.js