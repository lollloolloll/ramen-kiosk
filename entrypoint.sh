#!/bin/sh
set -e

# Run database migrations
npm run db:push

# Hand off to the CMD
su-exec nextjs "$@"
