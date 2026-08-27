# My Voice — Roadmap de crecimiento

> Documento vivo. Fuente de verdad de por dónde crece la herramienta y en qué orden.
> Última actualización: 2026-08-27

## Contexto

My Voice nació como motor de copy de una cuenta (Vive Terpel) y hoy tiene, sin haberlo
capitalizado, la arquitectura de una plataforma multimarca:

- `Workspace` con `plan`, `slug` y credenciales de IA propias por tenant.
- `Client` con cuota (`quotaLimit` / `quotaUsed`) y ADN de marca (fingerprint, PDF, prohibiciones).
- Motor de 14 canales con specs de slots y presupuestos de caracteres.
- Pipeline de 5 etapas: director → writer → critic → fixer → superCritic.
- Medición de costo real por etapa (`services/pricing.ts`), con caché de prompts.
- Flujo de aprobación con cliente vía token público, sin login.

El crecimiento no exige reescribir el producto: exige **terminar de convertir en producto
lo que ya está construido**.

---

## Horizonte 1 — Monetizar lo que ya existe (0–4 semanas) · EN CURSO

Objetivo: pasar de "herramienta interna de una cuenta" a "plataforma vendible a N cuentas",
con el consumo medido y facturable.

| # | Iniciativa | Estado | Detalle |
|---|---|---|---|
| H1.A | **Multi-tenant real** — aislamiento por workspace, alta de tenants sin deploy, white-label | A0 y A1 implementados, **criterio verificado** (`verify:isolation` 27/27) y secuencia de migración ensayada de punta a punta contra base descartable. Sin desplegar · A2 en diseño (nivel 1) | [plan](./plan-h1-multitenant-motor.md) · [A2](./plan-a2-whitelabel.md) · [runbook](./runbook-tenancy.md) · [oráculo](./oraculo-h1.md) |
| H1.B | **Motor serio** — telemetría de costo, cuota real, resiliencia, evals | B0–B3 implementados y **los cuatro criterios verificados** en el ensayo: B0 (`/analytics/usage` con costo real), B1 (`UsagePeriod` por periodo, periodo vencido no cuenta), B2 (`verify:resiliencia` 20/20), B3 (slot persistido y backfilleado). Sin desplegar. B4 pendiente (ver E2) | [plan](./plan-h1-multitenant-motor.md) · [runbook](./runbook-mejoras-h1.md) · [oráculo](./oraculo-h1.md) |
| H1.C | **Onboarding de marca en 5 minutos** — ingesta de ADN desde URL / redes, no solo PDF | Pendiente | Reduce el costo de dar de alta una marca nueva de una sesión con el equipo a pegar un link. Depende de H1.A. |

**Criterio de salida del H1:** se puede dar de alta un tenant nuevo sin tocar código,
su data es invisible para los demás, y existe un tablero de consumo/costo por workspace
que permite cobrar por plan.

---

## Horizonte 2 — Profundizar el producto (1–3 meses)

Objetivo: dejar de competir con "un prompt bien escrito" y volverse infraestructura del
proceso creativo.

| # | Iniciativa | Detalle |
|---|---|---|
| H2.A | **Ciclo copy → pieza (Composición)** | Plan ya auditado: 8.5–11.5 días, 4 fases. Prerrequisito duro: persistir `slot` (ver H1.B.3). Modelo de tres destinos: Pieza / Publicación / Brief. |
| H2.B | **Ejecutar los briefs de producción** | 4 canales ya emiten `visualBrief`, `animationBrief`, `structure`, `production` que hoy nadie consume. Conectarlos a generación visual convierte la salida de "texto en Excel" a "pieza casi lista". |
| H2.C | **Analytics de desempeño real** | Hoy la métrica es tasa de aprobación interna. Conectar Meta Ads / Google Ads para traer CTR y CPA por variación y realimentar el fingerprint con datos duros. Es el diferenciador defendible. |
| H2.D | **Aprendizaje de marca evolutivo** | Hoy few-shot con 5 aprobados + 10 negativos, fijo. Escalar a fingerprint por canal + ranking de ángulos que se aprueban (`GenerationLog.outputJson` ya tiene la materia prima). |

---

## Horizonte 3 — Expansión (3–6 meses)

| # | Iniciativa | Detalle |
|---|---|---|
| H3.A | **API pública + webhooks** | Que el copy salga del Excel y entre al canal sin copiar-pegar. |
| H3.B | **Integraciones** | Meta, Google Ads, Braze/Klaviyo, HubSpot. |
| H3.C | **Multi-idioma / multi-mercado** | `services/localeRules.ts` ya es la base (voseo, registro, mercado). LATAM completo. |
| H3.D | **Roles y colaboración** | Rol DESIGNER, revisión interna como etapa formal, comentarios e historial. Versión reducida estimada en 5–7 días. |

---

## Habilitadores transversales

Sin esto, nada de lo anterior aguanta escala. No son features, son condiciones.

| # | Habilitador | Urgencia | Por qué |
|---|---|---|---|
| E1 | **Migrar uploads a S3** | Alta | Hoy se escribe a disco local del contenedor. Ya hubo un outage por disco lleno (documentado en `aws_deployment_plan.md`). Agregar assets de diseño repite ese fallo más rápido. 1–2 días ahora vs. migración de archivos después. |
| E2 | **Gate de tipos real + tests + CI** | **Crítica** | **(1) hecho:** `@types/react` instalado, tsconfig raíz sin `server/`, `tsconfig.scripts.json` cubriendo `scripts/` y `prisma/` con `strict`. La gate pasó de certificar en verde ~8.900 líneas que no leía a leerlas de verdad; destapó 3 errores en `App.tsx`, uno un bug de datos preexistente ([oráculo H1](./oraculo-h1.md) F1, F2, F4, F5), todos arreglados. **(3) hecho:** `.github/workflows/ci.yml` con cuatro jobs — tipos y builds (con sonda de errores deliberados contra un falso verde), `verify:resiliencia`, `verify:isolation` contra un Postgres del runner más chequeo de drift `migrate diff`, y enlaces de la documentación (cierra P4). Falta: (2) `strict: true` en el raíz, con su propio presupuesto — destapa mucho más; (4) tipar `apiRequest<T>` en `services/api.ts`, hoy `any` en todas las respuestas, 2–3 días; (5) tests de `validators.ts` y eval harness. Cero tests unitarios sobre ~8.900 líneas de frontend y ~3.100 de backend. |
| E5 | **Consistencia de interfaz** | Media | Seis inconsistencias verificables, cada una con el comando que la reproduce, en [oráculo de diseño](./oraculo-diseno.md): la navegación en dos idiomas, cinco pantallas con dos nombres, tres negros distintos para el botón primario, emoji en el menú contra iconos vectoriales en el resto, cinco escalas de título y el cambio de empresa como `<select>` nativo. **R1 (diccionario de nombres, medio día) y R2 (tokens de color, 1 día) van antes de A2**: A2 toca exactamente las mismas pantallas y no se puede tematizar lo que no está tokenizado. La navegación por etapas está dibujada en el canvas. |
| E3 | **Refactor de componentes gigantes** | Media | `App.tsx` (43 KB), `ResultsTable.tsx` (1.143 líneas), `ClientManager.tsx` (1.138 líneas). Ya son inextensibles; el Kanban del H2 exige componentes nuevos por esta razón. |
| E4 | **Observabilidad** | Media | No hay logs estructurados ni métricas. Los errores de generación mueren en `console.error`. **Primer pedazo hecho:** los cuatro backfills emiten un resumen estructurado (`scripts/lib/reporte.ts`) a `server/.backfills/`, con el bloque `plan` idéntico en dry-run y en `--apply` para poder difearlos y una bandera de divergencia si lo escrito no coincide con lo prometido ([oráculo H1](./oraculo-h1.md) P5). Falta lo grande: logs estructurados y métricas del servicio. |

---

## Cómo usar este documento

1. **El diseño va primero y vive en `design/MyVoice_Engine.pen`.** Todo avance, mejora o
   funcionalidad nueva se diseña y se valida ahí antes de escribir una línea de código.
2. Cada iniciativa que se aborda obtiene su propio `docs/plan-<id>.md`, escrito en **dos
   niveles**: nivel 1 (qué ve el usuario, se resuelve en el `.pen`) y nivel 2 (cómo se
   construye: fases, archivos y criterios de aceptación). El nivel 2 no arranca con decisiones
   de experiencia abiertas.
3. El estado se actualiza acá, no en el plan detallado.
4. Un horizonte no se cierra por fecha sino por su criterio de salida.
