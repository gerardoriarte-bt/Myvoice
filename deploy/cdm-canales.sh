#!/usr/bin/env bash
# Carga los 14 canales de My Voice en la biblioteca de CDM de uno o más workspaces de producción (F2c), con
# `npm run cdm:canales`. Se ejecuta desde la máquina de quien opera, en la raíz del repo:
#
#   bash deploy/cdm-canales.sh <slug> [<slug>…]             # dry-run: muestra qué haría
#   APLICAR=1 bash deploy/cdm-canales.sh <slug> [<slug>…]   # lo escribe
#
# Misma receta que deploy/seed-capacitacion.sh: un worktree temporal de `main` y un Node desechable en la red
# del backend, con sus variables ya interpretadas. No toca el checkout de /opt/myvoice ni el contenedor.
set -euo pipefail

PEM="${MYVOICE_PEM:-$HOME/.ssh/myvoice.pem}"
HOST="ubuntu@100.52.241.136"
RAMA="${RAMA:-main}"
[ "$#" -ge 1 ] || { echo "Uso: [APLICAR=1] bash deploy/cdm-canales.sh <slug> [<slug>…]"; exit 1; }
BANDERA=""; [ "${APLICAR:-}" = "1" ] && BANDERA="--apply"

# Las variables viajan citadas: varios slugs separados por espacio llegan como uno solo.
ssh -i "$PEM" -o ConnectTimeout=20 "$HOST" "RAMA='$RAMA' BANDERA='$BANDERA' SLUGS='$*' bash -s" <<'REMOTO'
set -euo pipefail
cd /opt/myvoice
TMP=/tmp/myvoice-cdm-canales
git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"
git fetch -q origin "$RAMA"
git worktree add -q --detach "$TMP" "origin/$RAMA"
ENVTMP=$(mktemp); chmod 600 "$ENVTMP"
trap 'rm -f "$ENVTMP"; cd /opt/myvoice && git worktree remove --force "$TMP" 2>/dev/null || { sudo rm -rf "$TMP"; git worktree prune; }' EXIT
sudo docker inspect myvoice_backend --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PATH|NODE_VERSION|YARN_VERSION|HOSTNAME)=' | grep -v '^$' > "$ENVTMP"

sudo docker run --rm --network container:myvoice_backend --env-file "$ENVTMP" \
  -e BANDERA="$BANDERA" -e SLUGS="$SLUGS" -v "$TMP":/app -w /app/server node:20-slim bash -c '
    set -e
    apt-get update -qq && apt-get install -y -qq openssl >/dev/null
    npm ci --include=dev --no-audit --no-fund --loglevel=error
    npx prisma generate >/dev/null
    for s in $SLUGS; do echo; npm run -s cdm:canales -- "$s" $BANDERA; done
  '
REMOTO
