# Runbook — despliegue de costo, cuota, resiliencia y slot

> Corresponde a B0, B1, B2 y B3 del [plan H1](./plan-h1-multitenant-motor.md).
> Va **después** de [runbook-tenancy.md](./runbook-tenancy.md): los dos backfills de acá
> asumen que `workspaceId` ya es `NOT NULL` y que no quedan filas huérfanas.

## Qué cambia, en una línea

El costo real de cada generación deja de estar enterrado en un JSON y pasa a ser columnas
consultables; la cuota deja de ser un contador de por vida que nunca se reiniciaba y pasa a
medirse por periodo; un canal que falla ya no tumba la generación entera; y una pieza guardada
recuerda de qué slot salió.

## Rupturas conscientes

| Antes | Ahora |
|---|---|
| `Client.quotaLimit` / `quotaUsed` limitaban por conteo de generaciones, sin periodo | La cuota se evalúa contra `UsagePeriod`, en USD y tokens, por periodo mensual. Las dos columnas viejas quedan como legacy y no limitan nada |
| Un canal que fallaba abortaba la generación completa | El canal emite `channel-error` y se cae del resultado; los demás completan y la UI ofrece regenerar solo esos |
| Un `insufficient_quota` se reintentaba tres veces | Los errores terminales no se reintentan y cortan los canales encolados |
| `saveVariation` descartaba `slot` y `variationIndex` | Se persisten, con `slotLabel` resuelto en el servidor contra `channels/registry.ts` |

**La cuota se despliega en modo observación.** `QUOTA_ENFORCE` en `false` (el default) calcula
el consumo, lo registra y avisa, pero **no bloquea a nadie**. Las cifras de `lib/planLimits.ts`
son provisorias a propósito: se calibran contra las filas reales de `UsagePeriod` antes de que
corten a alguien. No pongas `QUOTA_ENFORCE=true` el día del despliegue.

## Secuencia de despliegue

```
1. Backup de la base                        ← no negociable
2. Verificación previa (sin base, sin crédito de API)
3. Migración 20260827000000_cost_quota_slot ← aditiva
4. Deploy del código
5. Backfill de telemetría: dry-run → revisión → apply
6. Backfill de slots: dry-run → revisión → apply
7. Verificación
8. Calibración de la cuota (días después)
```

### 1. Backup

```bash
pg_dump "$DATABASE_URL" > myvoice-pre-mejoras-$(date +%Y%m%d).sql
```

### 2. Verificación previa

Se corre en local o en CI, antes de tocar el servidor. No necesita base ni gasta crédito de
API: usa un cliente falso.

```bash
cd server && npm run verify:resiliencia
```

Ejercita los siete escenarios de B2 —429 transitorio, `insufficient_quota`, 400, 402 de
OpenRouter, petición colgada, JSON inválido y `retry-after`— y debe terminar en
`20/20 verificaciones OK`. Si alguno falla, no despliegues: el pipeline reintentaría algo que
no debe reintentar, y eso se paga en crédito de IA.

Las tres gates de tipos también, desde la raíz del repo:

```bash
npx tsc --noEmit
cd server && npx tsc --noEmit
cd server && npx tsc --noEmit -p tsconfig.scripts.json
```

La tercera es la que cubre `scripts/` — el código que vas a correr con `--apply` contra
producción en los pasos 5 y 6.

### 3. Migración

```bash
cd server && npx prisma migrate deploy
```

Aplica `20260827000000_cost_quota_slot`. Es **aditiva**: agrega las columnas de costo a
`GenerationLog`, crea `UsagePeriod`, agrega `slot` / `slotLabel` / `variationIndex` /
`slotInferred` a `SavedVariation` y los índices de consulta. No borra ni reescribe nada.

Rellena `GenerationLog.workspaceId` para todas las filas existentes, pero **deja la columna
nullable**: el `SET NOT NULL` queda para una migración posterior. Un `NULL` ahí después de
esto significa "escrito por código viejo", no "sin workspace".

### 4. Deploy del código

Antes de `deploy.sh`, revisar las variables nuevas en `server/.env.production` (ninguna es
obligatoria; todas tienen default):

```bash
QUOTA_ENFORCE=false              # observar y avisar, NO bloquear
# AI_TIMEOUT_CANAL_MS=210000     # presupuesto total de un canal
# AI_TIMEOUT_GENERACION_MS=900000
# AI_INTENTOS_MAX=3              # 1 intento + 2 reintentos por llamada
# AI_BACKOFF_BASE_MS=800
```

Los timeouts por defecto ya están calibrados para el pipeline de 14 canales. Bajarlos hace que
canales lentos se rindan por presupuesto; subirlos hace que una generación colgada tarde más en
rendirse.

### 5. Backfill de telemetría

Saca lo que ya está en `GenerationLog.outputJson.usage` y lo materializa en las columnas
nuevas. Se corre **desde el host**, no dentro del contenedor (`server/src` no se copia a la
imagen de runtime).

```bash
cd server
npm run backfill:telemetria              # dry-run, no escribe nada
```

Deja un JSON en `server/.backfills/backfill-telemetria-dry-run-<sello>.json` con las filas
leídas, el plan y lo salteado con su motivo. **Revisar antes de aplicar**, sobre todo:

- `salteadas` — las filas sin `usage` en el JSON son anteriores a `pricing.ts` y quedan en
  `NULL` a propósito: `NULL` significa "no se sabe", no "costó cero".
- `advertencias` — si aparece una sobre `workspaceId` en `NULL`, la migración del paso 3 no
  rellenó todo. Parar y revisar antes de seguir.

El script **no inventa** `model`, `provider` ni `durationMs`: no están en `outputJson` y no son
recuperables. Sustituirlos por el modelo de hoy produciría números plausibles y falsos.

```bash
npm run backfill:telemetria -- --apply   # una sola transacción
```

Compará los dos reportes: el bloque `plan` tiene que ser idéntico y `divergencia` tiene que
ser `false`.

```bash
diff <(jq .plan .backfills/backfill-telemetria-dry-run-*.json) \
     <(jq .plan .backfills/backfill-telemetria-apply-*.json)     # vacío = hizo lo prometido
```

### 6. Backfill de slots

Deduce el slot de las piezas guardadas antes de B3, contando caracteres y palabras contra el
presupuesto del spec del canal.

```bash
npm run backfill:slots                   # dry-run
```

**Es una heurística y el reporte lo dice.** Toda fila que toca queda con `slotInferred = true`.
Antes de aplicar, mirar la sección "Por confianza" y las filas ambiguas que imprime: son las
que el script no pudo resolver por señal estructural (hashtags, idea visual, marcas de escena)
sino por longitud, y los presupuestos de dos slots se solapan más de lo que parece.

`variationIndex` queda en `NULL` para todas: no es deducible. Numerar por `savedAt` reflejaría
el orden en que un humano fue clickeando "guardar", no cuál variación era.

```bash
npm run backfill:slots -- --apply
```

Es idempotente: solo mira filas con `slot IS NULL`, así que una segunda corrida no pisa un slot
real. Auditoría:

```sql
SELECT platform, slot, count(*) FROM "SavedVariation" WHERE "slotInferred" GROUP BY 1,2;
```

### 7. Verificación

**Telemetría (criterio B0).** Una generación nueva tiene que escribir las columnas, no solo el
JSON:

```sql
SELECT "workspaceId", model, provider, "costUsd", "cachedTokens", "costEstimated"
  FROM "GenerationLog" ORDER BY "createdAt" DESC LIMIT 3;
```

`costUsd` en `NULL` en una fila recién creada significa que el código viejo sigue sirviendo
tráfico. `costEstimated = NULL` es distinto de `false`: `NULL` es "fila anterior a la
telemetría", `false` es "el proveedor reportó el cobro real".

Y el endpoint, con un token de OWNER o ADMIN del workspace (`requireManager` lo exige):

```bash
curl -H "Authorization: Bearer $TOKEN" https://myvoice.lobueno.co/api/analytics/usage
```

**Cuota (criterio B1).** Generar una vez y confirmar que aparece la fila del periodo:

```sql
SELECT "clientId", "periodStart", generations, "costUsd", tokens FROM "UsagePeriod"
 ORDER BY "updatedAt" DESC LIMIT 5;
```

`periodStart` tiene que ser medianoche UTC del día 1 del mes en curso. Si cae el último día del
mes anterior, alguien construyó la fecha en hora local y hay que arreglarlo antes de que la
cuota corte a alguien un día antes de tiempo.

`UsagePeriod` mide consumo **cobrable**, no gasto bruto: una generación que falló en todos los
canales gastó plata real (la etapa director corre antes del fan-out) y **no** escribe acá. Ese
gasto queda visible en `GenerationLog`. La diferencia es intencional; no la cuadres.

**Resiliencia (criterio B2).** En producción la señal es negativa —que nada se caiga— así que
la verificación real es la del paso 2. Lo que sí se mira acá: que una generación con un canal
caído devuelva los otros trece y que aparezca el panel de canales fallidos con la opción de
regenerar solo esos.

**Slot (criterio B3).** Guardar una pieza nueva desde la tabla de resultados y confirmar que
llega con `slot`, `slotLabel` y `variationIndex`, y con `slotInferred = false`.

### 8. Calibración de la cuota

Dejar correr una o dos semanas con `QUOTA_ENFORCE=false` y recién entonces mirar el consumo
real por plan:

```sql
SELECT w.plan, count(DISTINCT u."clientId") AS marcas,
       round(sum(u."costUsd"), 2) AS usd, sum(u.tokens) AS tokens
  FROM "UsagePeriod" u JOIN "Workspace" w ON w.id = u."workspaceId"
 WHERE u."periodStart" = date_trunc('month', now() AT TIME ZONE 'UTC')
 GROUP BY 1;
```

Ajustar `PLAN_LIMITS` en `server/src/lib/planLimits.ts` con esos números —viven en código, así
que el cambio queda revisado y fechado en el diff— y recién ahí poner `QUOTA_ENFORCE=true`.
Avisar a los tenants antes: el día que se activa, un workspace que se pasó del techo deja de
generar.

## Rollback

Los pasos 1 a 4 son reversibles con un deploy anterior: la migración es aditiva y el código
viejo ignora las columnas nuevas.

Los pasos 5 y 6 escriben datos. Cada uno corre en una sola transacción, así que una corrida
fallida no deja la base a medias, pero una corrida **exitosa** no se deshace sola:

- La telemetría solo rellena columnas que estaban en `NULL`: revertirla es ponerlas en `NULL`
  otra vez, y no se pierde nada porque el dato original sigue en `outputJson`.
- Los slots se identifican por `slotInferred = true`, que existe justamente para esto:
  `UPDATE "SavedVariation" SET slot = NULL, "slotLabel" = NULL, "slotInferred" = false
   WHERE "slotInferred";`

## Después del despliegue

- Guardar los reportes de `server/.backfills/` fuera del servidor: son la única evidencia de
  qué escribió cada corrida.
- Revisar las filas ambiguas del backfill de slots contra la biblioteca real y corregir las que
  estén mal; mientras `slotInferred` siga en `true` se sabe cuáles son deducidas.
- Vigilar los `[ai-retry]` en los logs la primera semana: un canal que reintenta seguido es una
  señal de que el proveedor está degradado, no de que el código esté mal.
- `GenerationLog.workspaceId` sigue nullable. Programar la migración que le pone `NOT NULL`
  una vez que se confirme que ninguna fila nueva llega sin él.
