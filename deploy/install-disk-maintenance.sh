#!/usr/bin/env bash
# Instala disk-cleanup.sh y cron semanal en el servidor.
# Ejecutar en EC2 como ubuntu: bash deploy/install-disk-maintenance.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="${SCRIPT_DIR}/disk-cleanup.sh"
LOG_FILE="/var/log/myvoice-disk-cleanup.log"
CRON_LINE="0 3 * * 0 ${CLEANUP_SCRIPT} >> ${LOG_FILE} 2>&1"

if [ ! -f "$CLEANUP_SCRIPT" ]; then
  echo "No se encontró ${CLEANUP_SCRIPT}"
  exit 1
fi

chmod +x "$CLEANUP_SCRIPT"

# Log escribible por ubuntu (cron)
sudo touch "$LOG_FILE"
sudo chown ubuntu:ubuntu "$LOG_FILE"
sudo chmod 644 "$LOG_FILE"

# Log rotado por logrotate (opcional)
sudo tee /etc/logrotate.d/myvoice-cleanup >/dev/null <<EOF
${LOG_FILE} {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF

# Cron semanal: domingos 03:00 UTC
( crontab -l 2>/dev/null | grep -v 'disk-cleanup.sh' || true
  echo "$CRON_LINE"
) | crontab -

echo "Cron instalado:"
crontab -l | grep disk-cleanup
echo "Log: ${LOG_FILE}"
echo "Prueba manual: ${CLEANUP_SCRIPT}"
