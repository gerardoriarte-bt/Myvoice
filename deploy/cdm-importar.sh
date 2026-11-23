#!/usr/bin/env bash
# Carga la planilla de un medio (JSON, en el repo) en la biblioteca de CDM de uno o más workspaces de producción,
# con `npm run cdm:importar`. Se ejecuta desde la máquina de quien opera, en la raíz del repo:
#
#   bash deploy/cdm-importar.sh <planilla.json> <slug> [<slug>…]             # dry-run: muestra qué haría
#   APLICAR=1 bash deploy/cdm-importar.sh <planilla.json> <slug> [<slug>…]   # lo escribe
#
# La planilla es una ruta del repo (p. ej. docs/ecosistema/cdm/biblioteca/meta-especificaciones-2026-11-09.json):
# se lee del worktree de `main`, así que tiene que estar mergeada. Misma receta que deploy/cdm-canales.sh.
set -euo pipefail

PEM="${MYVOICE_PEM:-$HOME/.ssh/myvoice.pem}"
HOST="ubuntu@100.52.241.136"
RAMA="${RAMA:-main}"
[ "$#" -ge 2 ] || { echo "Uso: [APLICAR=1] bash deploy/cdm-importar.sh <planilla.json> <slug> [<slug>…]"; exit 1; }
PLANILLA="$1"; shift
BANDERA=""; [ "${APLICAR:-}" = "1" ] && BANDERA="--apply"

ssh -i "$PEM" -o ConnectTimeout=20 "$HOST" "RAMA='$RAMA' BANDERA='$BANDERA' PLANILLA='$PLANILLA' SLUGS='$*' bash -s" <<'REMOTO'
set -euo pipefail
cd /opt/myvoice
TMP=/tmp/myvoice-cdm-importar
git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"
git fetch -q origin "$RAMA"
git worktree add -q --detach "$TMP" "origin/$RAMA"
[ -f "$TMP/$PLANILLA" ] || { echo "No está la planilla en $RAMA: $PLANILLA"; exit 1; }
ENVTMP=$(mktemp); chmod 600 "$ENVTMP"
trap 'rm -f "$ENVTMP"; cd /opt/myvoice && git worktree remove --force "$TMP" 2>/dev/null || { sudo rm -rf "$TMP"; git worktree prune; }' EXIT
sudo docker inspect myvoice_backend --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PATH|NODE_VERSION|YARN_VERSION|HOSTNAME)=' | grep -v '^$' > "$ENVTMP"

sudo docker run --rm --network container:myvoice_backend --env-file "$ENVTMP" \
  -e BANDERA="$BANDERA" -e SLUGS="$SLUGS" -e PLANILLA="$PLANILLA" -v "$TMP":/app -w /app/server node:20-slim bash -c '
    set -e
    apt-get update -qq && apt-get install -y -qq openssl >/dev/null
    npm ci --include=dev --no-audit --no-fund --loglevel=error
    npx prisma generate >/dev/null
    for s in $SLUGS; do echo; echo "== $s"; npm run -s cdm:importar -- "$s" "/app/$PLANILLA" $BANDERA; done
  '
REMOTO
