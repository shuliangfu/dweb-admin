#!/bin/sh
# Build every app, then start the production compose services.
# Dev Mongo lives in its own compose project (docker-compose.dev.yml) so this
# `up` does not try to remove the network out from under it.
set -eu
cd "$(dirname "$0")"

dweb-cli build

# A host port is taken when some other container (or a non-docker process)
# is already listening. Ports held by this project's own services are free
# to reuse on recreate.
taken_by_other() {
  port="$1"
  hit=$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E ":${port}->" | grep -v -E '^(dweb-admin-backend|dweb-admin-frontend|dweb-admin-mobile|dweb-admin-api) ' || true)
  if [ -n "$hit" ]; then
    return 0
  fi
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    if docker ps --format '{{.Ports}}' | grep -q ":${port}->"; then
      return 1
    fi
    return 0
  fi
  return 1
}

# claim() runs in a command substitution (a subshell), so the reserved set
# lives in a file rather than a shell variable.
used_file=$(mktemp)
trap 'rm -f "$used_file"' EXIT
claim() {
  p="$1"
  while :; do
    if [ "$p" -gt 65535 ]; then
      echo "no free TCP port at or above $1" >&2
      exit 1
    fi
    if grep -qx "$p" "$used_file" 2>/dev/null || taken_by_other "$p"; then
      p=$((p + 1))
      continue
    fi
    break
  done
  printf '%s\n' "$p" >> "$used_file"
  printf '%s\n' "$p"
}

# Honour an explicit override; otherwise start at the compose default and
# walk forward until the port is free on this machine.
export HOST_PORT_BACKEND="${HOST_PORT_BACKEND:-$(claim 8810)}"
export HOST_PORT_FRONTEND="${HOST_PORT_FRONTEND:-$(claim 8811)}"
export HOST_PORT_MOBILE="${HOST_PORT_MOBILE:-$(claim 8812)}"
export HOST_PORT_API="${HOST_PORT_API:-$(claim 8813)}"

echo "publish backend:${HOST_PORT_BACKEND} frontend:${HOST_PORT_FRONTEND} mobile:${HOST_PORT_MOBILE} api:${HOST_PORT_API}"

docker compose up -d --wait
echo "backend  http://127.0.0.1:${HOST_PORT_BACKEND}"
echo "frontend http://127.0.0.1:${HOST_PORT_FRONTEND}"
echo "mobile   http://127.0.0.1:${HOST_PORT_MOBILE}"
echo "api      http://127.0.0.1:${HOST_PORT_API}"
