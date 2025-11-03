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

# ⭐ SQL 파일 직접 실행
echo "Running migrations..."
export DATABASE_URL="file:/app/data/local.db"

if [ -d /app/drizzle ]; then
  cd /app
  
  # drizzle 폴더 안의 SQL 파일들 실행
  for sql_file in /app/drizzle/*.sql; do
    if [ -f "$sql_file" ]; then
      echo "Applying migration: $sql_file"
      sqlite3 "$DB_FILE" < "$sql_file" || echo "Migration $sql_file failed"
    fi
  done
else
  echo "Drizzle folder not found"
fi

# 테이블 확인
echo "Tables in database:"
sqlite3 "$DB_FILE" ".tables"

echo "Starting Next.js..."
DATABASE_URL="file:/app/data/local.db" exec node server.js