#!/usr/bin/env bash
# My Voice — mantenimiento de disco en EC2
# Elimina caché de builds Docker, imágenes huérfanas y journals antiguos.
# No elimina contenedores en ejecución ni volúmenes de datos.

set -euo pipefail

LOG_TAG="myvoice-disk-cleanup"
THRESHOLD_WARN=80
THRESHOLD_CRITICAL=90
JOURNAL_MAX_SIZE="80M"

log() {
  echo "[$(date -Iseconds)] [$LOG_TAG] $*"
}

usage_pct() {
  df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}'
}

disk_report() {
  df -h / | tail -1
}

before=$(usage_pct)
log "Inicio — uso disco: ${before}% — $(disk_report)"

if command -v docker >/dev/null 2>&1; then
  log "Docker build cache prune..."
  docker builder prune -af 2>/dev/null || sudo docker builder prune -af

  log "Docker imágenes sin contenedor..."
  docker image prune -af 2>/dev/null || sudo docker image prune -af

  log "Estado Docker:"
  docker system df 2>/dev/null || sudo docker system df
fi

if command -v journalctl >/dev/null 2>&1; then
  log "Vacuum journal (max ${JOURNAL_MAX_SIZE})..."
  sudo journalctl --vacuum-size="${JOURNAL_MAX_SIZE}" 2>/dev/null || true
fi

sudo apt-get clean -y 2>/dev/null || true
sudo rm -rf /var/cache/apt/archives/*.deb 2>/dev/null || true

# Rotar logs nginx muy grandes (>50MB)
for f in /var/log/nginx/access.log /var/log/nginx/error.log; do
  if [ -f "$f" ] && [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -gt 52428800 ]; then
    log "Truncando $f (>50MB)"
    sudo truncate -s 0 "$f"
  fi
done

after=$(usage_pct)
freed=$((before - after))
log "Fin — uso disco: ${after}% (antes ${before}%) — $(disk_report)"

if [ "$after" -ge "$THRESHOLD_CRITICAL" ]; then
  log "CRÍTICO: disco >= ${THRESHOLD_CRITICAL}%. Ampliar volumen EBS o revisar manualmente."
  exit 2
elif [ "$after" -ge "$THRESHOLD_WARN" ]; then
  log "AVISO: disco >= ${THRESHOLD_WARN}% tras limpieza."
  exit 1
fi

exit 0
