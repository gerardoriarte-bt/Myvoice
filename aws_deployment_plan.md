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
- `/api` debe llevar `proxy_read_timeout 300s;` y `proxy_send_timeout 300s;`. Sin eso nginx
  usa el default de 60 s: el 16-sep-2026 cada `POST /api/copy/refine` devolvió 504 mientras
  el backend seguía llamando al proveedor ~3,5 min más. El nginx del contenedor ya tiene 300 s.

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

## 9. Permisos del rol de la instancia sobre el bucket

El rol de la EC2 es **`myvoice-rol`** y hoy puede leer y escribir objetos, que es lo que el
producto necesita. **No puede administrar la configuración del bucket**, y eso se descubrió el
2026-09-23 intentando crear la regla de ciclo de vida del H2:

```
AccessDenied: User: arn:aws:sts::151241089385:assumed-role/myvoice-rol/i-0e4a5fd98faf61afd
is not authorized to perform: s3:GetLifecycleConfiguration
```

Mientras siga así, esa regla se crea a mano desde la consola, y no queda verificada por comando.
La política de abajo lo arregla para el único bucket del producto.

### La política

Nombre sugerido: **`myvoice-ciclo-de-vida-bucket`**.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdministrarCicloDeVidaDelBucketDeMyVoice",
      "Effect": "Allow",
      "Action": [
        "s3:GetLifecycleConfiguration",
        "s3:PutLifecycleConfiguration",
        "s3:GetBucketVersioning"
      ],
      "Resource": "arn:aws:s3:::myvoice-bucket-151241089385-us-east-1-an"
    }
  ]
}
```

Tres decisiones, para que nadie la amplíe sin darse cuenta:

- **El recurso es el bucket, no `/*`.** La configuración del ciclo de vida es del bucket; los
  objetos no entran acá y no hace falta que entren.
- **Un solo bucket, escrito completo.** Nada de `arn:aws:s3:::myvoice-*`: un comodín acá sería un
  permiso sobre buckets que todavía no existen.
- **`GetBucketVersioning` es de lectura y está por una razón concreta:** si el bucket tiene
  versionado activo, la regla necesita además expirar las versiones no vigentes, o los originales
  viejos quedan ocupando espacio igual. Sin este permiso no se puede saber.

### Cómo se adjunta

1. Consola de AWS → **IAM** → **Policies** → **Create policy** → pestaña **JSON**.
2. Pegar el JSON de arriba, **Next**, nombre `myvoice-ciclo-de-vida-bucket`, **Create policy**.
3. **IAM** → **Roles** → `myvoice-rol` → **Add permissions** → **Attach policies** → buscar la
   política recién creada → **Add permissions**.

El rol de una instancia toma los permisos nuevos en menos de un minuto: no hace falta reiniciar
la EC2 ni los contenedores.

### Cómo verificar, desde el servidor

```bash
BUCKET=myvoice-bucket-151241089385-us-east-1-an

sudo docker run --rm -e AWS_REGION=us-east-1 amazon/aws-cli \
  s3api get-bucket-lifecycle-configuration --bucket "$BUCKET"
```

Con la política puesta, esto deja de responder `AccessDenied` y pasa a devolver las reglas —o
`NoSuchLifecycleConfiguration` si todavía no hay ninguna, que también es una respuesta válida.

### La regla que hay que crear

```bash
sudo docker run --rm -e AWS_REGION=us-east-1 amazon/aws-cli \
  s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration '{"Rules":[{"ID":"piezas-originales-90-dias","Status":"Enabled","Filter":{"Prefix":"piezas/originales/"},"Expiration":{"Days":90}}]}'
```

**El prefijo tiene que ser `piezas/originales/`.** Con `piezas/` a secas la regla también borraría
`piezas/snapshots/`, que son permanentes y son la única evidencia de qué pieza se aprobó una vez
que el original se va (ver D6 en `docs/plan-h2-produccion-auditoria.md`).

## Referencia: PM2 (legado)

El backend en producción usa **Docker**, no PM2. Si existe un proceso `my-voice-api` detenido en PM2, se puede ignorar o eliminar:

```bash
pm2 delete my-voice-api 2>/dev/null || true
```
