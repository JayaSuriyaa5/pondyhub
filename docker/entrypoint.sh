#!/bin/sh
# ==============================================================================
# Docker entrypoint — runs once per container start, before the main process.
# ==============================================================================
# Applies any pending Prisma migrations against whatever DATABASE_URL this
# container instance was started with, then hands off to the actual CMD
# (npm start, i.e. server.ts). Running migrations here rather than baking
# them into the image means the same image can be deployed against
# different databases (dev/staging/prod) without rebuilding, and migrations
# always run against the database that's actually live right now.
set -e

echo "Waiting for database to be reachable..."
# Prisma's own migrate command will retry briefly, but a fixed short wait
# here smooths over the common case of the app container starting before
# Postgres has finished its own startup in docker-compose, even with
# depends_on + healthcheck configured.
ATTEMPTS=0
MAX_ATTEMPTS=30
until npx prisma migrate deploy 2>/tmp/migrate_error.log; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "Migration failed after $MAX_ATTEMPTS attempts. Last error:"
    cat /tmp/migrate_error.log
    exit 1
  fi
  echo "Migration attempt $ATTEMPTS failed, retrying in 2s..."
  sleep 2
done

echo "Migrations applied successfully."

# Hand off to the container's CMD (npm start -> tsx server.ts). `exec`
# replaces this shell process with the Node process rather than running it
# as a child, so signals like SIGTERM from `docker stop` reach the actual
# server process directly (needed for server.ts's graceful-shutdown
# handler to fire).
exec "$@"
