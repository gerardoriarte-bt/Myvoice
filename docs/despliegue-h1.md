# Despliegue H1 — la hoja del día

> La secuencia completa en un solo lugar. Los dos runbooks siguen siendo la referencia de cada
> paso; esto es el orden y lo que no se puede saltar.
>
> Detalle: [tenancy](./runbook-tenancy.md) · [costo, cuota, resiliencia y slot](./runbook-mejoras-h1.md)

## Qué se despliega

| | Qué cambia | Riesgo si sale mal |
|---|---|---|
| **A0 · A1** | El acceso: membresías, invitaciones, claves de IA cifradas | Nadie entra. Es el paso con vuelta atrás más cara |
| **B0–B3** | Costo por columna, cuota por periodo, resiliencia, slot | Se degrada la generación, no el acceso |
| **E5** | Nombres, navegación por etapas, un solo negro | Cosmético. No toca la base |

Lo que **no** entra: la fase de producción y auditoría de piezas
([plan](./plan-h2-produccion-auditoria.md)). No comparte código ni migraciones. Si aparece acá,
algo se mezcló.

## Antes de empezar

- [ ] `pg_dump` de la base. **No es opcional**: el backfill crea workspaces y mueve marcas, y
      volver atrás requiere restaurar. Con pocas marcas tarda segundos.
- [ ] `JWT_SECRET` y `ENCRYPTION_KEY` en `server/.env.production`. Sin cualquiera de las dos el
      contenedor **no arranca**. `ENCRYPTION_KEY` se define una vez y no se toca: regenerarla
      deja ilegibles las claves de IA ya cifradas.
- [ ] Guardar `ENCRYPTION_KEY` fuera del servidor.
- [ ] `QUOTA_ENFORCE=false`. **No activar la cuota el día del despliegue**: los límites de
      `planLimits.ts` son inventados hasta calibrarlos con consumo real.
- [ ] Avisar al equipo: rotar `JWT_SECRET` cierra la sesión de todos.

## La secuencia

```
1  pg_dump                                    ← backup
2  npx prisma migrate deploy                  ← FALLA A PROPÓSITO en la 2ª migración
3  npx prisma migrate resolve --rolled-back 20260826000001_workspace_required
4  npm run backfill:tenancy                   ← dry-run, revisar el plan
5  npm run backfill:tenancy -- --apply
6  npx prisma migrate deploy                  ← ahora sí, y aplica también cost_quota_slot
7  deploy.sh                                  ← backend y frontend juntos
8  npm run recrypt:keys        → -- --apply
9  npm run backfill:telemetria → -- --apply
10 npm run backfill:slots      → -- --apply
11 Verificación
12 Invitar a los que quedaron sin acceso
```

### Los tres pasos que sorprenden

**Paso 2 falla y está bien.** `_workspace_required` no puede poner `NOT NULL` mientras haya
filas huérfanas. Postgres revierte la migración entera; la base queda con la parte aditiva
aplicada y nada a medio migrar.

**Paso 3 no es opcional.** Prisma anota la migración fallida y **se niega a aplicar cualquier
otra cosa** hasta que se la desmarque (`P3009`). Sin este paso, el paso 6 falla aunque el
backfill haya quedado perfecto, con un error que no habla del problema real.

**Paso 4 es el único que exige criterio humano.** El dry-run imprime el reparto completo: qué
marcas se convierten en su propia empresa, quién queda con acceso y **quién se queda sin
ninguno**. Si el reparto no refleja la realidad del negocio, no forzar el script: crear los
workspaces a mano y reasignar antes de aplicar.

### Entre dry-run y apply, siempre

```bash
diff <(jq .plan .backfills/backfill-<script>-dry-run-*.json) \
     <(jq .plan .backfills/backfill-<script>-apply-*.json)   # vacío = hizo lo prometido
```

`divergencia: true` en el reporte significa que el script no escribió lo que había prometido.
Parar y mirar antes de seguir con la secuencia.

## Verificación

**Que el aislamiento funciona** (lo que más importa):

1. Entrar con un usuario de la agencia → ve sus workspaces en el selector de la barra lateral.
2. Cambiar de workspace → la lista de marcas cambia por completo.
3. Entrar con un usuario de empresa → ve solo las marcas de su empresa.

**Que el motor mide:**

```sql
SELECT "workspaceId", model, provider, "costUsd", "cachedTokens"
  FROM "GenerationLog" ORDER BY "createdAt" DESC LIMIT 3;
```

`costUsd` en `NULL` en una fila **recién creada** significa que el código viejo sigue sirviendo
tráfico. En filas históricas es normal: `NULL` es "no se sabe", no "costó cero".

```sql
SELECT count(*) FROM "Workspace"
 WHERE "aiApiKey" IS NOT NULL AND "aiApiKey" NOT LIKE 'v1:%';   -- debe dar 0
```

**Que la interfaz quedó bien** (E5): el menú muestra las cuatro etapas numeradas y los nombres
en español. En cualquier pantalla, el ítem del menú, la miga de pan y el título dicen lo mismo.

## Después del despliegue

- [ ] **Invitar desde Equipo** a quienes el backfill listó sin acceso. Después del despliegue
      nadie entra solo: se acabó el password maestro y el alta por dominio de email.
- [ ] **Rotar el password maestro** donde esté reusado. Sale de producción con este deploy, pero
      eso no lo invalida en ningún otro lado que lo siga aceptando.
- [ ] **Rotar las API keys de IA de cada workspace.** Ahora se guardan cifradas, pero el cifrado
      no borra el pasado: estuvieron en texto plano en la base y en todo backup anterior.
- [ ] Guardar los reportes de `server/.backfills/` fuera del servidor: son la única evidencia de
      qué escribió cada corrida.
- [ ] Vigilar los `[ai-retry]` la primera semana. Un canal que reintenta seguido es señal de un
      proveedor degradado, no de código malo.
- [ ] Revisar las filas ambiguas del backfill de slots. Mientras `slotInferred` siga en `true`
      se sabe cuáles fueron deducidas.

## A los 10–14 días: calibrar la cuota

```sql
SELECT w.plan, count(DISTINCT u."clientId") AS marcas,
       round(sum(u."costUsd"), 2) AS usd, sum(u.tokens) AS tokens
  FROM "UsagePeriod" u JOIN "Workspace" w ON w.id = u."workspaceId"
 WHERE u."periodStart" = date_trunc('month', now() AT TIME ZONE 'UTC')
 GROUP BY 1;
```

Ajustar `PLAN_LIMITS` en `server/src/lib/planLimits.ts` con esos números y **recién ahí**
`QUOTA_ENFORCE=true`, avisando antes: el día que se activa, un workspace pasado del techo deja
de generar. El techo se mide sobre el **workspace**, así que el consumo de una marca puede
agotarlo para sus hermanas.

## Si algo sale mal

| Dónde | Qué hacer |
|---|---|
| Pasos 1–3 | Nada que revertir: la base no cambió salvo la migración aditiva, que el código viejo ignora |
| Paso 5 aplicado | Restaurar el dump. El backfill creó workspaces y movió marcas |
| Paso 7 (código) | Deploy de la imagen anterior. La base soporta las dos versiones |
| Pasos 9–10 | Reversibles con SQL: la telemetría solo rellenó columnas que estaban en `NULL`, y los slots se identifican por `slotInferred = true` |
