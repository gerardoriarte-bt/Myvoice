#!/bin/bash
# MyVoice — Deploy / re-deploy
# Ejecutar desde /opt/myvoice en el servidor
set -e

CONTENEDOR_BACKEND=myvoice_backend
COMPOSE="docker compose -f docker-compose.prod.yaml"

echo "=== Pulling latest changes ==="
# git corre como el DUEÑO del repo, no como root. Este script se invoca con
# sudo (lo necesita para docker), y un `git pull` como root deja los objetos de
# .git con propiedad de root: el siguiente `git pull` normal falla con
# "failed to write object" y no hay pista de por qué. Pasó el 2026-08-28, con
# 290 archivos afectados.
DUENO=$(stat -c '%U' "$(git rev-parse --show-toplevel)")
if [ "$(id -u)" -eq 0 ] && [ "$DUENO" != "root" ]; then
  sudo -u "$DUENO" git pull origin main
else
  git pull origin main
fi

echo "=== Building & restarting containers ==="
$COMPOSE up -d --build --remove-orphans

# El contenedor corre `npx prisma migrate deploy` antes de `node dist/index.js`
# (ver server/Dockerfile), así que "arrancado" no es "listo". Sin esta espera el
# script seguía de largo y declaraba éxito aunque el backend estuviera
# reiniciándose en loop — y cualquier comando que se le mandara enseguida
# pegaba contra un esquema todavía sin migrar. Pasó el 2026-09-23 desplegando
# H3.D: el seed de workspaces se cayó con
# "The column Workspace.dominiosPermitidos does not exist".
echo "=== Esperando a que el backend quede sano ==="
# El `if .State.Health` importa: sin healthcheck el template falla y dejaría la
# variable vacía, que no es "healthy" y haría esperar cinco minutos para
# terminar culpando al backend de un problema del compose.
salud() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}sin-healthcheck{{end}}' \
    "$CONTENEDOR_BACKEND" 2>/dev/null || echo no-existe
}

ESTADO=$(salud)
for _ in $(seq 1 60); do
  [ "$ESTADO" = "healthy" ] && break
  # Sin healthcheck no hay nada que esperar: se avisa fuerte y se sigue, porque
  # es un agujero del compose y no una falla de este deploy.
  [ "$ESTADO" = "sin-healthcheck" ] && break
  sleep 5
  ESTADO=$(salud)
done

case "$ESTADO" in
  healthy)
    echo "Backend sano."
    ;;
  sin-healthcheck)
    echo "⚠️  $CONTENEDOR_BACKEND no declara healthcheck: este deploy quedó sin verificar."
    ;;
  *)
    echo ""
    echo "❌ El backend no quedó sano (estado: $ESTADO). El deploy NO está bien."
    echo "   Últimas líneas del log:"
    docker logs --tail 40 "$CONTENEDOR_BACKEND" 2>&1 || true
    exit 1
    ;;
esac

# Acá vivía un upsert de cuatro workspaces fijos —Lobueno, Buentipo, Hermano,
# Antpack—. Se fue el 2026-09-23 y no vuelve: **un script de despliegue no crea
# datos de negocio.** Creaba empresas que nadie pidió, y mientras estuviera acá
# no se podían limpiar, porque el deploy siguiente las resucitaba. Una empresa
# se crea desde la herramienta (`POST /workspaces`); la primera de un servidor
# nuevo la crea `npm run seed`, que es un comando deliberado y pide
# SEED_ADMIN_PASSWORD.

echo "=== Cleaning up old images ==="
docker image prune -f

echo ""
echo "✅ Deploy completo."
$COMPOSE ps
