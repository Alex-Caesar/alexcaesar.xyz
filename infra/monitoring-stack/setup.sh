#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker not found on this host."
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "ERROR: 'docker compose' plugin not found."
  exit 1
fi

echo "==> Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — EDIT IT NOW."
  read -rp "Press Enter once you've edited .env..." _
fi

sed -i 's/\r$//' .env
set -a; source .env; set +a

sed -i '/^version:/d' docker-compose.yml

echo "==> Fixing permissions so containers can read mounted config files"
chmod o+rx "$HOME" 2>/dev/null || true
chmod -R o+rX .

echo "==> Pulling images"
docker compose pull

echo "==> Starting stack"
docker compose up -d

echo "==> Waiting for Grafana to come up"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/api/health &> /dev/null; then
    break
  fi
  sleep 2
done

echo "==> Enforcing admin password from .env"
PW="${GRAFANA_ADMIN_PASSWORD:-changeme_please}"
PW="$(printf '%s' "$PW" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
echo "Setting password: ${PW:0:2}***${PW: -2} (length ${#PW})"
if docker exec grafana grafana cli admin reset-admin-password "$PW" &> /dev/null; then
  echo "Password set."
elif docker exec grafana grafana-cli admin reset-admin-password "$PW" &> /dev/null; then
  echo "Password set (legacy grafana-cli)."
else
  echo "WARNING: could not set the admin password automatically."
fi

echo ""
docker compose ps
echo ""
echo "Grafana: https://<your domain> — login as ${GRAFANA_ADMIN_USER:-admin} with the password from .env."
