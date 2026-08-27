# Runbook — despliegue del aislamiento multi-tenant

> Este cambio altera quién puede entrar al sistema. Leerlo entero antes de tocar producción.
> Corresponde a A0 y A1 del [plan H1](./plan-h1-multitenant-motor.md).

## Qué cambia, en una línea

La pertenencia a un workspace deja de deducirse del dominio del email y pasa a ser una fila
en la tabla `Membership`. Un workspace es una empresa; una empresa tiene varios usuarios;
nadie ve el workspace de otra.

## Rupturas conscientes

Estas cosas dejan de funcionar a propósito. No son regresiones.

| Antes | Ahora |
|---|---|
| El password maestro hardcodeado en `authController.ts` entraba como ADMIN a cualquier email de dominio interno, creando el usuario si no existía | Eliminado. Solo entra quien tiene usuario y contraseña propios |
| `JWT_SECRET` caía a `'fallback_secret'` si faltaba la variable | El proceso **no arranca** sin `JWT_SECRET` |
| Registrarse con `role: 'ADMIN'` en el body daba rol de admin | El body ya no define el rol; lo define la invitación |
| Login con Google de los 4 dominios internos creaba usuario y workspace automáticamente | Google login exige usuario existente o invitación vigente |
| Un usuario sin workspace veía todos los registros huérfanos | `workspaceId` pasa a `NOT NULL`; no hay registros huérfanos |
| El rol era global (`ADMIN` / `CLIENT`) | El rol es por workspace (`OWNER` / `ADMIN` / `MEMBER`) |

**Consecuencia operativa:** después del despliegue, un integrante nuevo del equipo no entra
solo. Alguien con rol OWNER o ADMIN tiene que invitarlo desde la pestaña **Equipo**.

## Secuencia de despliegue

El orden importa. Los pasos 3 y 5 son irreversibles sin backup.

```
1. Backup de la base                    ← no negociable
2. JWT_SECRET + ENCRYPTION_KEY          ← si faltan, el server no arranca
3. Migración estructural (aditiva)      ← falla a propósito en la 2ª migración
3b. migrate resolve --rolled-back       ← sin esto, el paso 6 no corre
4. Backfill en dry-run + revisión humana
5. Backfill aplicado
6. Migración NOT NULL
7. Deploy del código
8. Verificación
```

### 1. Backup

```bash
pg_dump "$DATABASE_URL" > myvoice-pre-tenancy-$(date +%Y%m%d).sql
```

### 2. Variables de entorno

```bash
openssl rand -base64 48   # → JWT_SECRET
openssl rand -base64 32   # → ENCRYPTION_KEY
```

Agregar a `server/.env` en el servidor (`server/.env.production` es lo que
`docker-compose.prod.yaml` monta como `env_file`): `JWT_SECRET`, `ENCRYPTION_KEY`, y `APP_URL`
para que el enlace de las invitaciones apunte al dominio correcto. Sin `RESEND_API_KEY`, el
enlace de invitación se imprime en los logs en lugar de enviarse por email — sirve para la
primera tanda.

> Rotar `JWT_SECRET` **cierra la sesión de todos los usuarios**. Desplegar fuera de horario de campaña.

> `ENCRYPTION_KEY` es obligatoria: **el contenedor no arranca sin ella**, ni con una que no
> decodifique a 32 bytes. Verificar antes de `deploy.sh`:
> `grep ENCRYPTION_KEY server/.env.production`.
>
> Se define **una sola vez y no se toca**. Regenerarla deja ilegibles las claves ya cifradas
> y esos workspaces dejan de generar. Guardala también fuera del servidor: si se pierde, cada
> tenant tiene que volver a cargar su API key desde Configuración.

### 3. Migración estructural

```bash
cd server && npx prisma migrate deploy
```

Aplica `20260826000000_workspace_memberships`: crea `Membership`, `WorkspaceInvite` y el
enum `WorkspaceRole`. No toca una sola fila existente.

> `migrate deploy` intentará aplicar también `20260826000001_workspace_required`. Si todavía
> hay filas huérfanas, ese `ALTER` falla y se detiene ahí — que es exactamente lo que debe
> pasar. **El fallo es esperado y no rompe nada**: Postgres revierte la migración entera, así
> que la base queda con la parte aditiva aplicada y ninguna columna a medio migrar.

### 3.b Desmarcar la migración fallida

Prisma anota la migración fallida en `_prisma_migrations` y **se niega a aplicar cualquier otra
cosa** hasta que se la desmarque (`Error: P3009`). No es opcional ni es un rodeo: es el camino
documentado de Prisma para una migración que falló y revirtió entera.

```bash
npx prisma migrate resolve --rolled-back 20260826000001_workspace_required
```

Sin este paso, el `migrate deploy` del paso 6 falla con P3009 aunque el backfill haya quedado
perfecto, y el operador queda mirando un error que no habla del problema real.

### 4. Backfill en dry-run

```bash
npm run backfill:tenancy
```

No escribe nada. Imprime el plan completo: qué workspaces de empresa se van a crear, qué
marcas se mueven, qué membresías se otorgan y **qué usuarios quedan sin acceso**, y deja el
mismo resumen en JSON bajo `server/.backfills/` para poder difearlo contra el del `--apply`.

**Revisar a mano antes de seguir.** Las reglas son:

1. Toda marca que hoy tiene usuarios propios se convierte en su propia empresa, con su
   workspace, y esos usuarios entran como `MEMBER`. Esto es lo que impide que un usuario
   de una empresa termine viendo las marcas de otra.
2. Las marcas sin usuarios propios son marcas gestionadas por la agencia: se quedan donde
   están, o pasan al workspace de fallback si estaban huérfanas.
3. El equipo interno recibe `ADMIN` en su workspace y en cada workspace de empresa que se
   recortó de él — así la agencia conserva el acceso que ya tenía.
4. El miembro más antiguo con rol de administración de cada workspace queda como `OWNER`.
5. Los usuarios que quedan sin membresía **no** se asignan a ningún lado: se listan para
   invitarlos a mano. Es preferible a meterlos en un workspace al azar.

Si el reparto propuesto no refleja la realidad del negocio, no fuerces el script: creá los
workspaces a mano y reasigná las marcas antes de aplicar.

### 5. Backfill aplicado

```bash
npm run backfill:tenancy -- --apply
```

Corre dentro de una transacción: o queda todo, o no queda nada. Verificado en el ensayo contra
una falla real a mitad de la transacción: no quedó ni un workspace creado.

Antes de seguir, comparar los dos reportes. Si `divergencia` es `true`, el script no escribió
lo que había prometido y hay que mirar por qué antes de tocar la migración siguiente:

```bash
diff <(jq .plan .backfills/backfill-tenancy-dry-run-*.json) \
     <(jq .plan .backfills/backfill-tenancy-apply-*.json)     # vacío = hizo lo prometido
```

### 6. Migración NOT NULL

```bash
npx prisma migrate deploy
```

Ahora sí aplica `20260826000001_workspace_required` (y, a continuación,
`20260827000000_cost_quota_slot`, que abre el [runbook de mejoras](./runbook-mejoras-h1.md)).
Si falla, quedan huérfanos y el backfill no terminó — revisar, no forzar.

Además del `SET NOT NULL`, esta migración rehace las cuatro foreign keys de `workspaceId`:
venían de cuando la columna era nullable y estaban en `ON DELETE SET NULL`, que sobre una
columna obligatoria ya no puede ejecutarse. Pasan a `ON DELETE RESTRICT`, que es lo que
`schema.prisma` declara. Comprobación de que no quedó drift:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma
# → "No difference detected."
```

### 7. Deploy del código

Backend y frontend juntos: el frontend nuevo espera roles `OWNER`/`ADMIN`/`MEMBER` y el
backend viejo devuelve `ADMIN`/`CLIENT`. Desplegar solo uno de los dos deja la app en un
estado donde nadie es administrador.

### 7.b Cifrado de las API keys de IA (A0.6)

`Workspace.aiApiKey` pasa a guardarse cifrada (AES-256-GCM, formato `v1:iv:tag:ciphertext`).
**No hace falta ventana de mantenimiento ni migración de esquema:** las filas viejas se siguen
leyendo en texto plano y se recifran solas la primera vez que ese workspace genera o refina.
El prefijo `v1:` es lo que distingue un formato del otro.

El script cierra las que nunca generan. Se corre **desde el host**, igual que
`backfill:tenancy` (`server/src` no se copia a la imagen de runtime, así que dentro del
contenedor no está disponible):

```bash
cd server && npm run recrypt:keys            # dry-run, revisar el reporte
npm run recrypt:keys -- --apply
```

El dry-run no escribe nada y no imprime ninguna clave: solo slug, provider, estado y una
huella de 8 hex. Si encuentra filas con prefijo `v1:` que no puede descifrar, sale con código
1 sin escribir — es la señal de que `ENCRYPTION_KEY` no es la que cifró esas filas.

Verificación:

```sql
SELECT count(*) FROM "Workspace"
 WHERE "aiApiKey" IS NOT NULL AND "aiApiKey" NOT LIKE 'v1:%';  -- debe dar 0
```

### 8. Verificación

Contra una base de **pruebas**, nunca producción:

```bash
DATABASE_URL=postgres://…/myvoice_test npm run dev      # terminal 1
API_URL=http://localhost:3001/api npm run verify:isolation   # terminal 2
```

Siembra dos empresas y, como usuario de la segunda, intenta tocar todos los recursos de la
primera. Cada intento debe responder 403 o 404. Incluye control positivo (cada quien sí
puede con lo suyo) y una prueba de mass assignment.

En producción, la verificación mínima es manual:

1. Entrar con un usuario de la agencia → ve sus workspaces en el selector de la barra lateral.
2. Cambiar de workspace → la lista de marcas cambia por completo.
3. Entrar con un usuario de empresa → ve solo las marcas de su empresa, sin selector.
4. Invitar a un email nuevo desde **Equipo** → llega el enlace (o aparece en los logs) y al aceptarlo entra
   directo a ese workspace y a ningún otro.

## Rollback

El código es reversible con un deploy anterior, pero **la data no vuelve sola**: el backfill
creó workspaces y movió marcas. Volver atrás requiere restaurar el dump del paso 1. Por eso
el backup es el primer paso y no una recomendación.

## Después del despliegue

- Revisar la lista de "usuarios sin acceso" que imprimió el backfill e invitarlos.
- Rotar igual las API keys de IA de cada workspace. Ahora se guardan cifradas, pero **el
  cifrado no borra el pasado**: estuvieron en texto plano en la base y en todo backup anterior
  a este despliegue. Cifrar protege los dumps de acá en adelante, no los que ya existen.
- Guardar `ENCRYPTION_KEY` fuera del servidor. Si se pierde, las claves cifradas son
  irrecuperables y cada tenant tiene que volver a cargar la suya desde Configuración.
- Avisar al equipo que el password maestro ya no existe y que los accesos nuevos son por
  invitación.

## Ensayo del 2026-08-27

La secuencia completa se corrió de punta a punta contra un Postgres 16 descartable en Docker,
sembrado con data con la **forma** de producción antes del lote: `workspaceId` nullable, roles
globales, sin `Membership`, costo enterrado en `outputJson`, piezas guardadas sin `slot`, una
API key de IA en texto plano, y filas huérfanas en las cuatro tablas.

Resultado: la secuencia funciona, pero **no funcionaba tal como estaba escrita**. Cuatro
defectos, los cuatro corregidos:

| # | Qué pasaba | Dónde |
|---|---|---|
| 1 | El backfill moría antes de aplicar una sola regla: leía con el cliente tipado del schema nuevo, donde `workspaceId` ya es `String`, contra una base donde todavía es `NULL` — que es justo lo que venía a arreglar (`P2032`) | `scripts/backfillTenancy.ts`, ahora lee con SQL crudo |
| 2 | El mismo choque del otro lado: `client.update()` SELECTea la fila entera y pedía `quotaCostUsdOverride`, columna que agrega una migración **posterior** (`P2022`) | mismo archivo, escrituras en SQL crudo |
| 3 | Después del fallo deliberado de `_workspace_required`, Prisma se negaba a aplicar nada más (`P3009`). El runbook decía "volvé a ejecutar `migrate deploy`" y eso no alcanzaba | paso 3.b, nuevo |
| 4 | Las cuatro FK quedaban en `ON DELETE SET NULL` sobre columnas ya `NOT NULL`: drift real contra `schema.prisma` | `20260826000001_workspace_required` |

Los tres primeros habrían aparecido recién en producción, con la migración aditiva ya aplicada
y la base a mitad de camino.

Verificado en la corrida limpia posterior:

- Las cinco reglas del backfill reparten la data como dice este documento: la marca con
  usuarios propios se recorta a su propio workspace con esos usuarios como `MEMBER`, la marca
  sin usuarios se queda, la huérfana va al fallback, el interno más antiguo queda `OWNER`, y el
  usuario sin nada se reporta en vez de asignarse.
- La transacción es atómica de verdad: la corrida que falló a mitad no dejó ni un workspace.
- `plan` idéntico entre dry-run y `--apply` en los cuatro scripts, `divergencia: false`.
- `prisma migrate diff` contra el schema: **No difference detected**.
- `verify:isolation`: **27/27**. (El propio verificador tenía un defecto: metía la fila de B en
  el lote de `bulk-delete` y después la usaba como control positivo, así que dos chequeos
  fallaban por una fila que el test había borrado. Corregido con una fila desechable, más un
  chequeo nuevo de que el bulk **sí** borra lo propio.)
- `GET /analytics/usage` devuelve costo real por workspace y `GET /clients` deja de devolver la
  marca que se mudó a su propio workspace.

Lo que el ensayo **no** cubre y sigue pendiente para el día del despliegue:

- Se sembró data con la forma de producción, no el dump real. El volumen, los casos raros de
  data vieja y los usuarios reales solo aparecen con una copia del dump.
- La versión de Postgres de producción no está declarada en `docker-compose.prod.yaml` (la base
  vive en una red externa). El ensayo corrió sobre 16.
