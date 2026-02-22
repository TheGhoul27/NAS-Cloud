#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.pi.yml}"
SERVICE="${SERVICE:-nas-cloud}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

echo "Pulling latest image for $SERVICE..."
docker compose -f "$COMPOSE_FILE" pull "$SERVICE"

echo "Recreating $SERVICE..."
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE"

echo "Current status:"
docker compose -f "$COMPOSE_FILE" ps