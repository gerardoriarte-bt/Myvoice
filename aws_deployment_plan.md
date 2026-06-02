# AWS Deployment Plan - My Voice Strategic Engine

Plan de despliegue y operación para la instancia EC2 y el dominio de producción.

| Recurso | Valor |
|---------|--------|
| Instancia | `100.52.241.136` |
| Dominio | **https://myvoice.lobueno.co** |
| Ruta en servidor | `/opt/myvoice` |
| Stack | Docker Compose (`docker-compose.prod.yaml`) + Nginx reverse proxy |

> **Importante:** La app solo responde en `myvoice.lobueno.co`. Acceder por IP devuelve 404 (nginx no tiene `server_name` para la IP).

---

## 1. Prerequisites (on the EC2 Instance)

- **Node.js** 20.x+ (builds locales; runtime en Docker)
- **Docker & Docker Compose**
- **Nginx** — proxy a frontend `:8080` y API `:3001`
- **Git**
- **Certbot** — TLS en `myvoice.lobueno.co`
- **Volumen EBS** — mínimo recomendado **20 GB** (el disco de 6.8 GB se llenó y cortó la descarga del bundle JS)

### Clave SSH

- Guardar el PEM fuera del repositorio (p. ej. `~/Downloads/myvoice.pem`).
- `Myvoice.pem` está en `.gitignore`; **no commitear** llaves.

```bash
chmod 400 /ruta/a/myvoice.pem
ssh -i "/ruta/a/myvoice.pem" ubuntu@100.52.241.136
```

---

## 2. Server Preparation

1. **Security Groups:** puertos `22`, `80`, `443` abiertos.
2. **Variables de entorno:** `server/.env.production` y `.env.production` en la raíz del proyecto.
3. **Red Docker externa** para Postgres (si aplica):

```bash
docker network create my-voice_default  # si no existe
```

---

## 3. Database Deployment

PostgreSQL corre en contenedor `myvoice_db` (compose base o stack previo).

```bash
cd /opt/myvoice
docker compose -f docker-compose.yaml up -d   # solo DB, si aplica
```

`DATABASE_URL` en `server/.env.production` debe apuntar al host `myvoice_db:5432` dentro de la red Docker.

---

## 4. Production Deployment (Docker)

Despliegue actual en `/opt/myvoice`:

```bash
cd /opt/myvoice
git pull
docker compose -f docker-compose.prod.yaml build
docker compose -f docker-compose.prod.yaml up -d
```

Servicios:

| Contenedor | Puerto host | Rol |
|------------|-------------|-----|
| `myvoice_frontend` | `127.0.0.1:8080` | SPA (Nginx) |
| `myvoice_backend` | `127.0.0.1:3001` | API Express |
| `myvoice_db` | `5432` | PostgreSQL |

Health check API:

```bash
curl -s http://127.0.0.1:3001/health
# {"status":"ok","engine":"My Voice API"}
```

---

## 5. Nginx (reverse proxy)

Archivo: `/etc/nginx/sites-available/myvoice`

- `/` → `http://127.0.0.1:8080` (frontend)
- `/api` → `http://127.0.0.1:3001/api` (backend)
- `/api/generate/stream` — proxy sin buffering (SSE)

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Mantenimiento de disco (crítico)

### Incidente conocido (mayo 2026)

Con el disco al **100%**:

- El bundle JS (`/assets/index-*.js`) se **truncaba** al descargarse → la herramienta no cargaba (pantalla en blanco).
- Docker healthcheck fallaba: `no space left on device`.
- Caché de builds Docker ocupaba ~1.1 GB.

### Limpieza automática

Scripts en `deploy/`:

| Script | Uso |
|--------|-----|
| `deploy/disk-cleanup.sh` | Limpia caché Docker, imágenes huérfanas, journals y apt cache |
| `deploy/install-disk-maintenance.sh` | Instala cron semanal (domingos 03:00 UTC) |

**Instalación en el servidor:**

```bash
cd /opt/myvoice
git pull
bash deploy/install-disk-maintenance.sh
```

**Ejecución manual:**

```bash
/opt/myvoice/deploy/disk-cleanup.sh
tail -f /var/log/myvoice-disk-cleanup.log
```

El script sale con código `1` si el disco sigue ≥80% y `2` si ≥90% (revisar y ampliar EBS).

### Limpieza manual de emergencia

```bash
sudo journalctl --vacuum-size=80M
sudo docker builder prune -af
sudo docker image prune -af
df -h /
```

### Ampliar volumen EBS (recomendado)

1. AWS Console → EC2 → Volumes → seleccionar volumen de la instancia.
2. **Modify volume** → p. ej. 20 GiB.
3. En la instancia:

```bash
sudo growpart /dev/nvme0n1 1    # ajustar partición si aplica
sudo resize2fs /dev/nvme0n1p1   # o el dispositivo que muestre lsblk
df -h /
```

### Alertas (opcional)

CloudWatch alarm cuando `disk_used_percent` > 80% en la instancia, notificación por SNS/email.

---

## 7. Verificación post-despliegue

```bash
# En el servidor
curl -s http://127.0.0.1:3001/health
curl -sI http://127.0.0.1:8080/ | head -5
df -h /
docker ps
```

Desde tu máquina:

```bash
curl -sI https://myvoice.lobueno.co/
# Debe devolver 200 y servir index.html

# Tamaño completo del bundle JS (debe coincidir con Content-Length)
curl -sI https://myvoice.lobueno.co/assets/index-*.js
```

---

## 8. Guía rápida de primera instalación

### A. Conexión

```bash
ssh -i "/ruta/a/myvoice.pem" ubuntu@100.52.241.136
```

### B. Dependencias (Ubuntu)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### C. Código y arranque

```bash
sudo git clone <repository_url> /opt/myvoice
cd /opt/myvoice
# Configurar .env y server/.env.production
docker compose -f docker-compose.prod.yaml up -d --build
bash deploy/install-disk-maintenance.sh
```

### D. TLS

```bash
sudo certbot --nginx -d myvoice.lobueno.co
```

---

## Referencia: PM2 (legado)

El backend en producción usa **Docker**, no PM2. Si existe un proceso `my-voice-api` detenido en PM2, se puede ignorar o eliminar:

```bash
pm2 delete my-voice-api 2>/dev/null || true
```
