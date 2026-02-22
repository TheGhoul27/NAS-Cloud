#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.pi.yml}"
ENABLE_AUTOUPDATE="${ENABLE_AUTOUPDATE:-false}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

mkdir -p data/nas_storage data/logs

echo "Building/pulling and starting nas-cloud..."
docker compose -f "$COMPOSE_FILE" up -d --build nas-cloud

if [ "$ENABLE_AUTOUPDATE" = "true" ]; then
  echo "Starting watchtower auto-update service..."
  docker compose -f "$COMPOSE_FILE" --profile autoupdate up -d watchtower
fi

echo "Deployment complete."
echo "App URL: http://<device-ip>:8000/drive"