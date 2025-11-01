#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# Create the data directory if it doesn't exist
mkdir -p /app/data

# Path to the database file
DB_FILE="/app/data/local.db"

# Check if the database file already exists.
# If it doesn't exist, create it and run migrations.
if [ ! -f "$DB_FILE" ]; then
  echo "Database file not found. Creating and migrating..."
  # Create an empty database file
  sqlite3 "$DB_FILE" "VACUUM;"
  # Run database migrations
  /app/node_modules/.bin/drizzle-kit migrate
else
  echo "Database file already exists. Skipping creation and migration."
fi

# Start the application
exec "$@"
