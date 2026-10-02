#!/usr/bin/env bash
# Corre seed:capacitacion en producción, dentro del servidor. Se ejecuta desde
# la máquina de quien opera, en la raíz del repo:
#
#   bash deploy/seed-capacitacion.sh            # usa ./Myvoice.pem
#   MYVOICE_PEM=/ruta/llave.pem bash deploy/seed-capacitacion.sh
#
# No toca el checkout de /opt/myvoice ni el contenedor del backend: baja la rama
# a un worktree temporal, levanta un Node desechable en la red de Docker de
# producción (con el .env del backend y el rol de la instancia para S3), le
# instala fuentes para dibujar las artes y borra todo al terminar.
#
# Cuatro cosas que la primera corrida (2026-10-02) enseñó a los golpes:
#   · `ubuntu` no está en el grupo docker: todo docker va con sudo.
#   · `docker run --env-file` NO quita comillas como el env_file de compose, así
#     que el .env.production crudo deja un DATABASE_URL inválido. Se heredan las
#     variables ya interpretadas del contenedor del backend.
#   · El backend vive en dos redes y la base solo en una; compartir la red del
#     backend (`container:`) evita adivinar cuál.
#   · Y el .env trae NODE_ENV=production: sin --include=dev no se instala tsx.
set -euo pipefail

PEM="${MYVOICE_PEM:-./Myvoice.pem}"
HOST="ubuntu@100.52.241.136"
RAMA="${RAMA:-main}"
ARCHIVO_PW="$HOME/.myvoice-capacitacion-password"

# La contraseña de los cuatro usuarios: se genera una vez y se reutiliza, para
# que volver a correr el reset no la cambie.
if [ ! -s "$ARCHIVO_PW" ]; then
  (umask 077; LC_ALL=C tr -dc 'A-HJ-NP-Za-km-z2-9' </dev/urandom | head -c 14 > "$ARCHIVO_PW")
  echo "Contraseña nueva guardada en $ARCHIVO_PW"
fi
PW="$(cat "$ARCHIVO_PW")"

ssh -i "$PEM" -o ConnectTimeout=20 "$HOST" CAPACITACION_PASSWORD="$PW" RAMA="$RAMA" bash -s <<'REMOTO'
set -euo pipefail
cd /opt/myvoice
echo "== disco antes"; df -h / | tail -1

TMP=/tmp/myvoice-capacitacion
git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"
git fetch -q origin "$RAMA"
git worktree add -q --detach "$TMP" "origin/$RAMA"
ENVTMP=$(mktemp); chmod 600 "$ENVTMP"
trap 'rm -f "$ENVTMP"; cd /opt/myvoice && git worktree remove --force "$TMP" 2>/dev/null || { sudo rm -rf "$TMP"; git worktree prune; }' EXIT
# Las variables tal como las ve el backend (compose ya les quitó las comillas),
# sin las de la imagen, que el contenedor nuevo trae solas.
sudo docker inspect myvoice_backend --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PATH|NODE_VERSION|YARN_VERSION|HOSTNAME)=' | grep -v '^$' > "$ENVTMP"
echo "== variables heredadas del backend: $(wc -l < "$ENVTMP")"

# Misma red que el backend (las dos: default y postgres_net).
sudo docker run --rm --network container:myvoice_backend \
  --env-file "$ENVTMP" \
  -e CAPACITACION_PASSWORD="$CAPACITACION_PASSWORD" \
  -v "$TMP":/app -w /app/server \
  node:20-slim bash -c '
    set -e
    apt-get update -qq && apt-get install -y -qq openssl fonts-dejavu-core >/dev/null
    npm ci --include=dev --no-audit --no-fund --loglevel=error
    npx prisma generate >/dev/null
    npm run seed:capacitacion
  '

echo "== disco después"; df -h / | tail -1
REMOTO
