#!/bin/bash
# MyVoice — Setup inicial en EC2 Ubuntu 22.04
# Ejecutar como: sudo bash setup-server.sh
set -e

echo "=== [1/6] Actualizando sistema ==="
apt-get update -y && apt-get upgrade -y

echo "=== [2/6] Instalando Docker ==="
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar usuario ubuntu al grupo docker
usermod -aG docker ubuntu

echo "=== [3/6] Instalando certbot (HTTPS) ==="
apt-get install -y certbot python3-certbot-nginx

echo "=== [4/6] Creando estructura de directorios ==="
mkdir -p /opt/myvoice
chown ubuntu:ubuntu /opt/myvoice

echo "=== [5/6] Configurando firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== [6/6] Habilitando Docker al inicio ==="
systemctl enable docker
systemctl start docker

echo ""
echo "✅ Servidor listo. Pasos siguientes:"
echo "   1. Subir el repo: scp o git clone en /opt/myvoice"
echo "   2. Copiar .env.production a server/.env.production"
echo "   3. cd /opt/myvoice && docker compose -f docker-compose.prod.yaml up -d --build"
echo "   4. certbot --nginx -d tudominio.com"
