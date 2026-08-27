# Plan H1 — Multi-tenant real + Motor serio

> Horizonte 1 del [ROADMAP](./ROADMAP.md). Dos frentes que se ejecutan en paralelo.
> Estimado total: **13–17 días de trabajo efectivo** (~3 semanas calendario con un dev).
> Última actualización: 2026-08-26

## Por qué estos dos primero

Todo lo demás del roadmap —composición, analytics de performance, integraciones— asume
dos cosas que hoy **no son ciertas**:

1. Que la data de un tenant está aislada de la de otro. **No lo está**: la mitad de los
   endpoints de escritura operan por `id` crudo sin verificar propiedad.
2. Que sabemos cuánto cuesta y cuánto consume cada cliente. **No lo sabemos**: el costo
   se calcula y se tira; la cuota es un contador de por vida disfrazado de mensual.

Sin (1) no se puede vender a un segundo cliente sin riesgo. Sin (2) no se puede cobrar.

---

# FRENTE A — Multi-tenant real

## A0 · Aislamiento de tenants (BLOQUEANTE) — 3–4 días · ✅ IMPLEMENTADO

> Estado: código en el árbol de trabajo, typecheck y build en verde, **sin desplegar**.
> El despliegue tiene su propia secuencia: ver [runbook-tenancy.md](./runbook-tenancy.md).
>
> El modelo elegido fue **un workspace por empresa + tabla de membresías**
> (`Membership(userId, workspaceId, role)`), con roles `OWNER` / `ADMIN` / `MEMBER`
> por workspace. Un usuario puede pertenecer a varios: así la agencia entra como
> miembro invitado a los workspaces de sus clientes sin romper el aislamiento.
> Dentro de un workspace, todos sus miembros ven todas las marcas de esa empresa.

El modelo de datos tiene `workspaceId` en todas partes, pero la aplicación no lo hace
cumplir en el camino de escritura. El patrón es inconsistente: `reviewController` y
`clientController.computeFingerprint` sí verifican propiedad; el resto no.

### A0.1 — Endpoints que operan por `id` sin verificar propiedad

Cualquier usuario autenticado (incluso `CLIENT`) puede leer, modificar o borrar recursos
de otro workspace conociendo el `id`:

| Endpoint | Archivo | Riesgo |
|---|---|---|
| `POST /saved` | `server/src/controllers/savedController.ts:24` | Escribe en el `clientId` que venga en el body, de cualquier tenant |
| `PUT /saved/:id` | `savedController.ts:76` | Edita variación ajena |
| `DELETE /saved/:id` | `savedController.ts:100` | Borra variación ajena |
| `DELETE /projects/:id` | `savedController.ts:111` | Borra proyecto ajeno |
| `POST /feedback/negative` | `savedController.ts:123` | **Envenena el prompt de otra marca**: el feedback negativo entra al contexto de generación |
| `PUT /clients/:id` | `clientController.ts:53` | Edita marca ajena |
| `DELETE /clients/:id` | `clientController.ts:73` | Borra marca ajena |
| `POST /dna-profiles` | `clientController.ts:88` | Crea brief en marca ajena |
| `PUT /dna-profiles/:id` | `clientController.ts:101` | Edita brief ajeno |
| `POST /dna-profiles/:id/duplicate` | `clientController.ts:201` | Copia brief ajeno |
| `DELETE /dna-profiles/:id` | `clientController.ts:222` | Borra brief ajeno |
| `DELETE /users/:id` | `authController.ts:237` | Borra usuario de otro workspace |
| `POST /copy/refine` | `refineController.ts` | Usa la **API key del workspace dueño del cliente** sin verificar que el que llama pertenezca a ese workspace → gasto contra la cuenta ajena |

**Solución:** un helper único en `server/src/lib/tenancy.ts`:

```ts
assertClientAccess(user, clientId)        // valida workspace + clientId del rol CLIENT
assertOwnedVariation(user, variationId)
assertOwnedDnaProfile(user, profileId)
```

Aplicarlo como primera línea de cada handler de la tabla. No es un middleware genérico
porque el recurso a verificar cambia por endpoint; es una guarda explícita, auditable
en code review.

**Criterio de aceptación:** `npm run verify:isolation` siembra dos empresas y, como usuario
de la segunda, intenta tocar todos los recursos de la primera. Cada intento debe responder
403 o **404** — se eligió 404 para los recursos de otro tenant porque un 403 confirma que el
id existe y convierte el endpoint en un oráculo de existencia entre empresas.

Se encontró un **catorceavo** endpoint durante la implementación: `POST /review-sessions`
aceptaba ids de variaciones sin verificar el workspace, y una sesión de revisión se publica
detrás de un token público — el copy de otro tenant habría quedado expuesto en un enlace sin
autenticación.

### A0.2 — Mass assignment en updates

`savedController.ts:76` hace `const { approvalNote, ...rest } = req.body` y pasa `rest`
completo a `prisma.update`. Lo mismo en `clientController.ts:53` y `:101`. Un cliente puede
enviar `clientId`, `isApproved`, `workspaceId` y reasignar el registro a otro tenant.

**Solución:** allow-list explícita de campos actualizables por endpoint.

### A0.3 — Credenciales de acceso maestras en el código

- `authController.ts:9` — `MASTER_PASSWORD` con un default hardcodeado en el fuente
  (el valor está en el historial de git de ese archivo; no se transcribe acá).
  Con esa cadena, cualquiera que conozca **un email de dominio interno** entra como ADMIN,
  y si el usuario no existe `login` lo **crea** como ADMIN (`authController.ts:84`).
- `authController.ts:8` y `middleware/auth.ts:5` — `JWT_SECRET` cae a `'fallback_secret'`
  si la variable no está en el entorno. Con ese secreto se puede firmar un token
  arbitrario con cualquier `workspaceId` y `role`.

**Solución:** eliminar ambos defaults; el proceso falla al arrancar si `JWT_SECRET` no está
definido. Reemplazar el master password por invitaciones con token de un solo uso (ver A1).
Rotar el `JWT_SECRET` de producción al desplegar (invalida todas las sesiones vivas: avisar
al equipo).

### A0.4 — `register` acepta el rol desde el body

`authController.ts:48`: `finalRole = isInternalDomain ? 'ADMIN' : (role || 'CLIENT')`.
Un email de dominio externo puede registrarse enviando `role: 'ADMIN'`. Queda con
`workspaceId: null`, y como las consultas filtran por `where: { workspaceId: user?.workspaceId }`,
`null` matchea **todos los registros huérfanos** de la base.

**Solución:** ignorar `role` y `clientId` del body; el rol se asigna por invitación.

### A0.5 — `workspaceId` nullable

`Workspace` está referenciado como opcional en `User`, `Client`, `Project`, `ReviewSession`,
`GenerationPreset`. Un `null` no aísla: agrupa. Migración: backfill de huérfanos al
workspace `lobueno` → columnas `NOT NULL`.

**Criterio de aceptación:** `SELECT count(*) FROM "Client" WHERE "workspaceId" IS NULL` = 0,
igual para las otras cuatro tablas, y la constraint aplicada.

### A0.6 — Cifrado de `aiApiKey` ✅ implementado

`Workspace.aiApiKey` se guardaba en texto plano. Nunca se devolvía al frontend
(`workspaceController.ts` solo expone `hasApiKey`, correcto), pero un dump de la base
exponía las claves de IA de todos los tenants.

**Solución implementada:** cifrado simétrico en reposo con AES-256-GCM (`lib/crypto.ts`),
clave en la variable de entorno `ENCRYPTION_KEY` —obligatoria al arranque, como
`JWT_SECRET`—, IV aleatorio por valor y formato `v1:iv:tag:ciphertext` en base64.

- **Sin migración de esquema.** El prefijo de versión distingue una fila cifrada de una en
  texto plano sin columna extra, así que tampoco hace falta ventana de downtime.
- **Migración perezosa.** Las filas viejas se siguen leyendo tal cual y se recifran al vuelo
  la primera vez que ese workspace genera o refina, con un compare-and-set que no pisa una
  clave guardada mientras tanto. `npm run recrypt:keys` (dry-run + `--apply`) cierra las que
  nunca generan.
- **Un solo punto de descifrado:** `lib/workspaceSecret.ts` (`decryptWorkspaceApiKey`), usado
  por `generateController` y `refineController`. Si el descifrado falla, la generación corta
  con error explícito en vez de caer a la clave del servidor: facturar el consumo del tenant
  contra la cuenta de la agencia sería peor que el corte.
- El cifrado en la escritura vive solo en `workspaceController.updateWorkspaceAIConfig`, y el
  smoke test de validación sigue corriendo con la clave en claro, antes de cifrarla.

Ver el paso 7.b del [runbook](./runbook-tenancy.md).

## A1 · Workspaces como dato, no como código — 2–3 días

Hoy los tenants viven en un objeto literal: `authController.ts:12`, `DOMAIN_WORKSPACE`
con 4 dominios. Agregar un cliente = editar código + build + deploy.

- Alta de workspace desde la UI de admin (nombre, slug, plan).
- Invitaciones por email con token de un solo uso y expiración; el rol viene de la
  invitación, no del body.
- `resolveWorkspace` pasa a consultar una tabla `WorkspaceDomain` (dominio → workspace)
  en vez del literal; los 4 dominios actuales se migran como filas.
- Deprecar el auto-provisioning por dominio en login/google (queda solo lo invitado).

**Criterio de aceptación:** dar de alta un tenant nuevo, invitar a su admin y generar
copy, sin un solo commit.

## A2 · White-label por workspace — 2 días

- Campos `logoUrl`, `primaryColor`, `displayName` en `Workspace`.
- El logo LoBueno hardcodeado en `App.tsx:615` (`/LobuenoLogo.png`) y el pie del email en
  `notificationService.ts:41` ("Motor de Copy · Vive Terpel") pasan a leerse del workspace.
- Datos mock de Terpel/LoBueno en `App.tsx:25-66` salen del bundle de producción y quedan
  detrás de un flag de demo.
- El portal de revisión público hereda el branding del workspace dueño de la sesión: es la
  pantalla que ve el cliente final del cliente.

**Criterio de aceptación:** dos workspaces con logos distintos; el portal de revisión de
cada uno muestra el suyo.

---

# FRENTE B — Motor serio

## B0 · Telemetría de costo real — 2 días

El pipeline ya calcula costo exacto por etapa (`services/pricing.ts`, con `cachedTokens`,
`cacheHitRate`, `costEstimated` y desglose `byStage`). Ese objeto se emite al frontend,
se guarda enterrado dentro de `GenerationLog.outputJson`… y no existe como columna.
Además `generateCopy` (la ruta no-streaming, `generateController.ts:114`) **no crea
GenerationLog en absoluto**: ese gasto es invisible.

**Cambios:**
- Columnas nuevas en `GenerationLog`: `costUsd`, `cachedTokens`, `cacheWriteTokens`,
  `model`, `provider`, `costEstimated`, `durationMs`, `stageBreakdown` (Json), `workspaceId`.
- `generateCopy` registra log como ya lo hacen `generateCopyStream` y `regenerateChannel`.
- Backfill de las filas existentes leyendo `outputJson.usage` donde exista.
- Endpoint `GET /analytics/usage` con costo y tokens por workspace / cliente / periodo,
  y su tarjeta en `components/Analytics.tsx`.

**Criterio de aceptación:** una consulta SQL responde "cuánto costó el workspace X este mes"
sin abrir un JSON.

## B1 · Cuota real por periodo — 1–2 días

`Client.quotaUsed` se incrementa para siempre y nunca se reinicia, mientras el mensaje de
error dice "límite de generaciones mensuales" (`generateController.ts:124`). Además cuenta
generaciones, no consumo: regenerar un canal suelto cuesta lo mismo en cuota que generar
14 canales.

**Cambios:**
- Tabla `UsagePeriod` (workspaceId, clientId, periodStart, generations, costUsd) — la cuota
  se evalúa contra el periodo vigente, no contra un contador acumulado.
- La cuota se mide en **costo o tokens**, no en llamadas; el conteo de generaciones queda
  como métrica secundaria.
- Límite por plan en `Workspace.plan`, con override por cliente.
- El decremento de cuota no ocurre si la generación falló en todos los canales.

**Criterio de aceptación:** un cliente al 100% de cuota vuelve a generar el día 1 del
periodo siguiente sin intervención manual.

## B2 · Resiliencia del pipeline — 2 días

No hay una sola línea de retry o backoff en `server/src`. Un 429 o un 503 transitorio de
un canal se convierte en un evento `channel-error` y ese canal simplemente no aparece en
el resultado — mientras la cuota ya se consumió.

**Cambios:**
- Retry con backoff exponencial y jitter en `aiClient` para 429/500/502/503/504, con tope
  de intentos y presupuesto de tiempo.
- Distinguir error transitorio de error terminal (`insufficient_quota`, API key inválida)
  para no reintentar lo irrecuperable.
- Los canales fallidos se reportan al usuario con opción de reintentar solo esos, sin
  regenerar la campaña completa (`regenerateChannel` ya existe: falta el enganche en UI).
- Timeout por llamada; hoy una petición colgada bloquea un slot del semáforo de 5.

**Criterio de aceptación:** con un mock que falla dos veces y responde a la tercera, la
generación completa termina sin canales faltantes.

## B3 · Persistir `slot` y `variationIndex` — 1–1.5 días

Pérdida de datos activa. El writer produce `slot` y `variationIndex`
(`openaiService.ts`, mapeo de variaciones), el frontend los envía, y
`savedController.ts:25` los descarta al desestructurar. La tabla `SavedVariation` ni
siquiera tiene la columna. `SavedVariation extends CopyVariation`, así que TypeScript
promete `slot?: string` y el compilador no avisa porque el campo es opcional.

En producción hay 28 filas donde hook y body solo se distinguen por conteo de caracteres
contra los límites del spec. **Esto es el prerrequisito duro del H2.A (Composición).**

**Cambios:** columnas `slot`, `variationIndex`, `slotLabel` + persistencia en el controller
+ backfill heurístico de las 28 filas existentes (documentando que es heurístico).

## B4 · Evals y tests — 3–4 días

- `server/package.json` declara `npm run eval` → `scripts/eval.ts`, `seed:workspaces` y
  `seed:mock-brands`. **El directorio `server/scripts/` no existe**: los tres scripts están
  rotos. Limpiar o reconstruir.
- Sin tests en todo el repo y sin `.github/`. El motor cambia de comportamiento con cada
  ajuste de prompt y no hay forma de saberlo.

**Cambios:**
- Tests unitarios de `channels/validators.ts` y `promptBuilder.ts` — son puros y de alto
  valor: ahí viven los presupuestos de caracteres y las prohibiciones.
- Suite de integración de aislamiento multi-tenant (la de A0.1); es la red de seguridad
  del frente A.
- Eval harness: N briefs fijos × canales, corriendo el pipeline contra respuestas grabadas,
  midiendo cumplimiento de presupuesto, prohibiciones y voseo. Sin llamadas reales a la API
  en CI.
- GitHub Actions: typecheck de front y back + tests en cada push.

**Criterio de aceptación:** CI en verde bloqueando merge, y `npm run eval` reportando
tasa de cumplimiento por canal.

---

## Secuencia sugerida

```
Semana 1   A0.3 A0.4 (credenciales)  →  A0.1 A0.2 (aislamiento)  →  A0.5 (NOT NULL)
           En paralelo: B3 (slot) y B0 (telemetría de costo)

Semana 2   A0.6 (cifrado)  →  A1 (workspaces como dato)
           En paralelo: B1 (cuota por periodo) y B2 (resiliencia)

Semana 3   A2 (white-label)
           En paralelo: B4 (evals + CI)  →  cierre y despliegue
```

Orden no negociable: **A0.3 y A0.4 van primero**. Mientras el master password siga en el
código, todo lo demás del frente A es decorativo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Rotar `JWT_SECRET` cierra la sesión de todos los usuarios | Avisar al equipo y desplegar fuera de horario de campaña |
| El backfill de `workspaceId` puede asignar mal registros huérfanos | Auditar el conteo de huérfanos antes de migrar; hacerlo en una transacción reversible |
| El backfill de `slot` es heurístico (conteo de caracteres) | Marcar las filas backfilleadas con una bandera para no tratarlas como dato confiable |
| Cambiar la semántica de cuota puede cortar el servicio a un cliente activo | Desplegar con los límites nuevos en modo observación una semana antes de hacerlos efectivos |

## Fuera de alcance de este plan

Composición/Kanban (H2.A), generación visual (H2.B), integraciones de performance (H2.C),
migración a S3 (E1 — recomendada antes de subir assets de diseño, no antes de esto).
