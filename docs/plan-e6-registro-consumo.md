# Plan E6 — Registro de consumo por evento

> Reemplaza la forma en que el H1.B mide el consumo. **Se implementa al final**, después de las
> fases que agregan puntos de consumo nuevos (la auditoría de piezas del H2 es la grande), para
> diseñar la tabla una sola vez con todos los eventos a la vista. Mientras tanto, este documento
> es el inventario: toda funcionalidad nueva que consuma algo agrega su fila en
> [Inventario de eventos](#inventario-de-eventos).
>
> Estado: **diseñado, sin implementar.** Última actualización: 2026-09-22.

## El principio

Un registro por evento de consumo, no un agregado. Percentiles, Pareto, tiers, cuota y
facturación se calculan después sobre esa tabla; el logger no calcula nada ni decide qué es
cobrable.

## Por qué cambiar lo que hay

Hoy el consumo se mide en dos lugares, y los dos agregan en origen:

| Hoy | Problema |
|---|---|
| `UsagePeriod`: una fila por (marca, mes), incrementada con `upsert` en `recordUsage` | Es un contador mutable. No se puede auditar, ni recalcular si cambia la regla, ni saber qué llamada lo movió. Si una escritura falla se pierde el incremento sin rastro (`usageService.ts`, el `catch` que solo hace `console.error`). |
| `GenerationLog`: una fila por generación, con el desglose por etapa en `stageBreakdown` (JSON) | Una generación son 30–45 llamadas. El detalle por llamada no es consultable, no tiene timestamps propios y no guarda los intentos fallidos. |
| La regla «solo se cobra si hubo variaciones» vive **dentro** de `recordUsage` (`variationCount <= 0 → return`) | Es una política de facturación escrita en el logger. Cambiarla no puede recalcular el pasado, porque lo no registrado no existe. |

Y hay consumo que **no se mide**. De los 9 lugares que llaman a `chatCompletionConRetry`, solo 5
registran uso:

| Llamada | Archivo | ¿Se mide hoy? |
|---|---|---|
| director, writer, critic, fixer, supercritic | `services/*Service.ts`, `openaiService.ts` | Sí, vía `extractUsage` → `GenerationLog` + `UsagePeriod` |
| refinar | `controllers/refineController.ts:129` | **No** |
| extracción de ADN del manual | `services/brandExtractionService.ts:64` | **No** |
| fingerprint de voz | `services/voiceFingerprintService.ts:116` | **No** |
| prueba de API key | `controllers/workspaceController.ts:303` | **No** |

Además, **ningún intento fallido queda registrado.** `extractUsage` corre solo sobre una
respuesta exitosa: un timeout, un 5xx reintentado o un writer que devolvió JSON inválido
(`openaiService.ts:125`, se reintenta con `INTENTOS_CONTENIDO`) pueden haber sido cobrados por el
proveedor y no aparecen en ningún lado. Ese es exactamente el consumo «fantasma» que la
especificación quiere aislar con `status`.

## Evaluación de la especificación

La especificación es correcta en lo que importa: evento atómico, append-only, `user_id` y
`account_id` obligatorios y resueltos en origen, y el costo desacoplado del registro. Al
aplicarla a My Voice aparecen **ocho ajustes**. Ninguno cambia el principio.

**1 · La unidad mínima de trabajo es el intento de llamada, no la variación.** La regla «50 items =
50 eventos» no aplica tal cual: el writer produce N variaciones en **una** llamada y el proveedor
cobra la llamada, no la variación. No hay forma honesta de repartir tokens por variación. Un evento
= un intento HTTP contra el proveedor, con su propio `timestamp` y `duration_ms`. Las variaciones
producidas se registran como un evento aparte (ajuste 6).

**2 · `units_consumed` solo no alcanza para recalcular ni para conciliar el costo.** En un LLM,
input, input en caché, escritura de caché y output tienen precios distintos: la escritura de caché
cuesta 1,25× el input y la lectura, 0,1× (`pricing.ts`). Un solo número de tokens no permite
recalcular el costo ni medir el hit de caché. Se mantiene `units_consumed` (total, para comparar
entre herramientas) y se agregan columnas de detalle **nulas fuera de los LLM**:
`input_tokens`, `cached_tokens`, `cache_write_tokens`, `output_tokens`.

**3 · `cost_usd` tiene tres estados, no dos.** Hoy existe la diferencia entre costo
**reportado** por el proveedor (OpenRouter trae `usage.cost`), **estimado** con la tabla de
`MODEL_PRICING`, y **desconocido** (modelo sin tarifa, o intento abortado sin `usage`). La
especificación solo tiene `null`. Se agrega `cost_source`: `provider | estimate | null`. La
conciliación diaria trabaja sobre `estimate` y `null`, y deja en paz a `provider`.
Y el tipo es `NUMERIC(12,6)`, no `float`: es la misma decisión que ya tomó `GenerationLog.costUsd`,
porque son montos que se suman en facturación.

**4 · Append-only y «completar el costo después» se contradicen.** La especificación pide las dos
cosas. Se resuelve sin updates: la conciliación escribe un **evento de ajuste** (`kind =
adjustment`, `adjusts = <event_id original>`, `units_consumed = 0`, `cost_usd = diferencia`). El
costo de un evento es la suma del original más sus ajustes. Esto necesita dos campos que la
especificación nombra pero no define: `kind` y `adjusts`. `chained_from` no sirve para esto:
significa «este evento lo disparó aquel», no «este corrige a aquel».

**5 · Falta la marca.** `account_id` es el workspace (quien paga), pero la cuota tiene sub-límite
por **marca** (`Client.quotaCostUsdOverride`) y el reporte ya consulta por los dos ejes. Se agrega
`brand_id`, nulo cuando el evento no es de una marca (la prueba de API key).

**6 · La regla de cobro necesita saber qué produjo la sesión.** Para que «una generación sin
variaciones no se cobra» sea un cálculo y no un `return` en el logger, la sesión tiene que
registrar su resultado. Al cerrar una generación o un refinamiento se escribe un evento
`kind = outcome` con `unit_type = variations` y `units_consumed = <cantidad>`, a costo 0. De
paso, «cuántas variaciones produce un dólar» se vuelve una consulta.

**7 · ¿Quién paga el proveedor?** Un workspace puede cargar su propia API key
(`Workspace.aiApiKey`). En ese caso el proveedor **le cobra a él, no a Buentipo**, y cobrarle
también cuota en USD sería cobrarle dos veces. Se agrega `credential_source`: `platform |
workspace`. Hoy ningún workspace tiene key propia (bitácora 28-08), pero el campo es barato ahora
y caro después.

**8 · `status = retry` necesita definición y un lugar para el rechazo por contenido.** Se define:
`retry` = el intento falló y le siguió otro. `error` = el último intento, y falló. Un writer que
recibió HTTP 200 con JSON inválido fue un éxito de transporte y un fracaso de valor: `aiClient`
escribe su evento como `success` (el proveedor cobró y respondió), y quien lo rechaza escribe un
evento `kind = rejection`, costo 0, `chained_from` al intento y `error_code = json_invalido`. Así
`aiClient` sigue siendo el único punto que registra llamadas y nada se actualiza.

## Estructura del evento

Los nombres de la especificación se conservan **tal cual**, en snake_case: la tabla alimenta el
log de la agencia, donde se une con el de las otras herramientas ([D1](#decisiones)). En Prisma,
modelo `ConsumptionEvent` con `@map` a esas columnas.

| Campo | Tipo | Oblig. | En My Voice |
|---|---|---|---|
| `event_id` | UUID | Sí | Generado **antes** de la llamada; es la clave de idempotencia si la escritura se reintenta |
| `timestamp` | timestamptz | Sí | Inicio del intento, no el momento de escribir |
| `kind` | enum | Sí | `consumption · outcome · rejection · adjustment` *(agregado)* |
| `tool` | enum | Sí | `openrouter · openai_api · claude_api · gemini_api · aws_s3` |
| `user_id` | string | Sí | `req.tenant.userId`; `system:<script>` para `smoke` y backfills |
| `account_id` | string | Sí | `workspaceId` |
| `brand_id` | string | No | `clientId` *(agregado)* |
| `session_id` | string | Sí | Una generación o un refinamiento; se une con `GenerationLog.id` |
| `chained_from` | event_id | No | fixer ← critic ← writer de un canal; rechazo ← intento |
| `adjusts` | event_id | No | Solo en `kind = adjustment` *(agregado)* |
| `task_category` | enum | No | `generate · refine · extract_brand · fingerprint · test_key` (y lo que agregue el inventario) |
| `stage` | string | No | `director`, `writer:<canal>`, … — lo que hoy va en `etapa` *(agregado)* |
| `model` | string | No | Modelo efectivo de **esa** llamada, no el del writer *(agregado)* |
| `provider_request_id` | string | No | `id` de la respuesta. Con OpenRouter permite conciliar por llamada *(agregado)* |
| `credential_source` | enum | Sí | `platform · workspace` *(agregado)* |
| `duration_ms` | int | Sí | Del intento; 0 en eventos instantáneos |
| `units_consumed` | numeric | Sí | Tokens totales · bytes · variaciones |
| `unit_type` | enum | Sí | `tokens · bytes · requests · variations` |
| `input_tokens`, `cached_tokens`, `cache_write_tokens`, `output_tokens` | int | No | Solo LLM *(agregado)* |
| `cost_usd` | NUMERIC(12,6) | No | `null` si no se conoce en el momento |
| `cost_source` | enum | No | `provider · estimate` · `null` *(agregado)* |
| `status` | enum | Sí | `success · error · retry` (ajuste 8) |
| `error_code` | string | No | El `codigo`/`motivo` que ya produce `clasificarError` |

Índices: `(account_id, timestamp)`, `(brand_id, timestamp)` y `(session_id)`. Volumen esperado:
30–45 eventos por generación de 14 canales. Postgres lo lleva sin particionar por años.

## Inventario de eventos

La razón de hacer esto al final. **Toda funcionalidad nueva que consuma algo agrega su fila acá
antes de desplegarse.**

| Evento | `tool` · `unit_type` | Estado | Origen |
|---|---|---|---|
| Llamadas del pipeline (director → supercritic) | proveedor · tokens | Medido, agregado | `openaiService.ts` y servicios |
| Intentos fallidos y reintentos | proveedor · tokens (0 si no hubo `usage`) | **No medido** | `aiClient.ts` `chatCompletionConRetry` |
| Rechazo del writer por JSON inválido | — · costo 0 | **No medido** | `openaiService.ts:125` |
| Refinar | proveedor · tokens | **No medido** | `refineController.ts:129` |
| Extracción de ADN del manual | proveedor · tokens | **No medido** | `brandExtractionService.ts:64` |
| Fingerprint de voz | proveedor · tokens | **No medido** | `voiceFingerprintService.ts:116` |
| Prueba de API key | proveedor · tokens | **No medido** | `workspaceController.ts:303` |
| Resultado de la sesión (variaciones producidas) | — · variations | Implícito en `GenerationLog` | ajuste 6 |
| Subida de manual a S3 | aws_s3 · bytes | **No medido** | `lib/storage.ts` |
| *H2 fase 3* · subida de pieza | aws_s3 · bytes | Futuro | [plan H2](./plan-h2-produccion-auditoria.md) |
| *H2 fase 3* · auditoría de pieza (visión) | proveedor · tokens | Futuro — la más cara por unidad | [plan H2](./plan-h2-produccion-auditoria.md) |
| *H1.C* · ingesta de ADN desde URL | proveedor · tokens (+ scraping) | Futuro | [ROADMAP](./ROADMAP.md) |
| *H2.D* · embeddings | proveedor · tokens | Futuro | [ROADMAP](./ROADMAP.md) |
| *H2.C* · lectura de Meta / Google Ads | ads_api · requests | Futuro | [ROADMAP](./ROADMAP.md) |

**Fuera de alcance:** los eventos de producto sin costo (aprobaciones, exportes, revisiones del
portal) van a otra tabla si algún día se miden. Mezclarlos acá convierte un log de consumo en uno
de analytics. Tampoco entran los costos fijos (EC2, dominio): no son eventos, se prorratean.

## Cómo se construye

### Fase 1 — Tabla y logger

- Modelo `ConsumptionEvent`, migración aditiva. No toca `GenerationLog` ni `UsagePeriod`.
- `services/consumptionLog.ts`: `registrarEvento()` recibe el contexto (`user_id`, `account_id`,
  `brand_id`, `session_id`, `credential_source`) **obligatorio por tipo**, así `user_id` no puede
  llegar nulo por olvido: no compila.
- **Nunca se pierde en silencio.** Si la escritura falla, el evento se emite completo como una
  línea JSON en stdout con prefijo `[consumo]`, recuperable con `docker logs`. Hoy
  `recordUsage` hace `console.error` y el consumo desaparece. Esto es el primer pedazo real de
  E4 (observabilidad).

### Fase 2 — Un solo punto de emisión

- `chatCompletionConRetry` recibe el contexto en `OpcionesLlamada` y registra **cada intento**,
  exitoso o no. Como ya es el único call site del SDK, los 9 lugares quedan cubiertos al pasarle
  el contexto, incluidos los 4 que hoy no se miden.
- Los rechazos por contenido y los eventos de resultado los escribe quien los decide.
- `storage.put()` registra bytes.

### Fase 3 — Cuota y reporte sobre eventos

- `assertQuotaAvailable` pasa a sumar eventos del periodo. La regla de cobro («sesión con
  variaciones», «credencial de la plataforma») queda en la consulta, donde se puede cambiar y
  recalcular hacia atrás.
- `GET /analytics/usage` lee de eventos. `UsagePeriod` y `recordUsage` se eliminan; las columnas
  de costo de `GenerationLog` quedan como histórico.
- **Sin backfill hacia atrás.** Lo anterior son 38 generaciones y USD 4,28 sin timestamps por
  llamada: fabricarles eventos sería inventar granularidad. La fecha de corte queda anotada acá.

### Fase 4 — Conciliación

- Job diario: compara el costo del día contra el billing del proveedor y escribe eventos
  `adjustment`. Con OpenRouter se puede hacer por llamada vía `provider_request_id`; con el
  resto, por total diario prorrateado por `units_consumed`.

### Fase 5 — Exportación al log de la agencia

- Envío de los eventos al log central por el transporte que se acuerde (D1), idempotente por
  `event_id`, con un cursor de lo ya exportado. Si el log central no responde, los eventos esperan
  en la tabla local: se exportan tarde, pero no se pierden.

## Criterio de aceptación

- Una generación de 14 canales produce un evento por intento. La suma de su `cost_usd` coincide con
  el `usage.costUsd` que hoy devuelve la API para la misma generación.
- Refinar, extracción, fingerprint y prueba de key producen eventos.
- Un intento con timeout forzado (el cliente falso de `verify:resiliencia`) deja un evento
  `retry` y otro `success` o `error`.
- Ningún `UPDATE` ni `DELETE` sobre la tabla en el código (se verifica con `grep`).
- `verify:isolation` cubre el reporte: un workspace no ve eventos de otro.
- Reexportar un lote ya enviado no duplica eventos en el log central.

## Decisiones

**D1 · ¿La tabla es de My Voice o alimenta un log central? — DECIDIDA: alimenta el log de la
agencia.** My Voice es una herramienta de un ecosistema, y la especificación nombra las otras
(`n8n`, `hosting`) por eso. De ahí salen tres cosas:

- **La tabla local se queda.** La cuota se evalúa antes de cada generación y no puede depender de
  un servicio externo. My Voice escribe su `ConsumptionEvent` y **exporta** esos eventos al log
  central. El `event_id` hace que exportar dos veces el mismo evento no lo duplique allá.
- **Los nombres y los valores de la especificación son contrato.** Los campos agregados arriba
  (`kind`, `brand_id`, `stage`, `cost_source`, …) viajan como columnas extra que el log central
  puede ignorar; ninguno cambia el significado de un campo de la especificación.
- **Queda abierto con quien administra el log central:** el transporte (push por lote, que el log
  lea la tabla, un webhook) y la lista cerrada de valores de `tool` y `unit_type`, que tiene que
  ser una sola para todas las herramientas. Sin esas dos respuestas, la fase 5 no arranca.

**D2 · ¿Qué `tool` es OpenRouter? — DECIDIDA: el proveedor de la API de IA.** `tool = openrouter`,
porque es quien factura, y el modelo efectivo va en `model`. Si el log central quiere agrupar por
proveedor final, se deriva de `model`.

## Consecuencia mientras tanto

Calibrar la cuota y pasar a `QUOTA_ENFORCE=true` son pendientes del H1
([bitácora](./bitacora-2026-08-28.md)) que **esperan a este plan**. Calibrar con `UsagePeriod`
es calibrar contra una medida que no incluye refinar, extracción ni reintentos, y que se va a
reemplazar. La cuota sigue en observación hasta la fase 3.
