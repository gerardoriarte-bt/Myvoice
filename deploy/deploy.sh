#!/bin/bash
# MyVoice — Deploy / re-deploy
# Ejecutar desde /opt/myvoice en el servidor
set -e

echo "=== Pulling latest changes ==="
git pull origin main

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
