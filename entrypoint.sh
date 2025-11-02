#!/bin/sh
set -e

mkdir -p /app/data
chmod -R 777 /app/data

DB_FILE="/app/data/local.db"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Creating database..."
  sqlite3 "$DB_FILE" "VACUUM;"
  
  if [ -f /app/node_modules/.bin/drizzle-kit ]; then
    DATABASE_URL="file:/app/data/local.db" /app/node_modules/.bin/drizzle-kit migrate
  fi
fi

chmod -R 777 /app/data

echo "Starting Next.js..."
exec node server.js