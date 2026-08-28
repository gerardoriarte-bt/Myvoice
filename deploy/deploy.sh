#!/bin/bash
# MyVoice — Deploy / re-deploy
# Ejecutar desde /opt/myvoice en el servidor
set -e

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
docker compose -f docker-compose.prod.yaml up -d --build --remove-orphans

echo "=== Seeding workspaces (idempotente) ==="
docker compose -f docker-compose.prod.yaml exec backend \
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    const WS = [
      { name:'Lobueno',  slug:'lobueno',  plan:'agency' },
      { name:'Buentipo', slug:'buentipo', plan:'agency' },
      { name:'Hermano',  slug:'hermano',  plan:'agency' },
      { name:'Antpack',  slug:'antpack',  plan:'agency' },
    ];
    Promise.all(WS.map(w => p.workspace.upsert({ where:{slug:w.slug}, create:w, update:{} })))
      .then(() => { console.log('Workspaces OK'); p.\$disconnect(); })
      .catch(e => { console.error(e); process.exit(1); });
  "

echo "=== Cleaning up old images ==="
docker image prune -f

echo ""
echo "✅ Deploy completo."
docker compose -f docker-compose.prod.yaml ps
