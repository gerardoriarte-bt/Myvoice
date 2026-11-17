# Plan de endurecimiento — las cinco cosas que se rompen con el segundo cliente

> **Rescatado el 2026-11-17** de la rama `h2-tablero-modelo`, que nunca se mergeó. Es el plan de
> septiembre: parte ya se hizo después (CI con los tres chequeos de tipos, `verify:isolation`,
> `verify:resiliencia`, fronteras entre módulos). Se guarda como referencia, no como plan vigente.

> Cubre los cinco riesgos del descriptivo de producto: sin pruebas, componentes gigantes,
> concentración en un tenant, sin observabilidad y alta de marca cara. En el
> [ROADMAP](./ROADMAP.md) son E2, E3, E4, H1.C y la validación de H1.A — se agrupan acá porque
> comparten una sola causa: **ninguno duele con un cliente y todos duelen con dos.**
>
> Escrito en dos niveles, como manda el [ROADMAP](./ROADMAP.md). Las fases 0, 1 y 2 no tienen
> nivel 1: son invisibles para el usuario y no pasan por el `.pen`. Las fases 3, 4 y 5 sí, y
> se dice abajo exactamente qué hay que resolver ahí antes de escribir código.

---

## Inventario verificado

Sobre el árbol, no de memoria. Rama `h2-tablero-modelo`, 2 de septiembre de 2026.

| Riesgo | Medición | Dónde |
|---|---|---|
| Sin pruebas | **Cero** archivos `*.test.*` o `*.spec.*`. Ningún corredor instalado en ninguno de los dos proyectos. `npm test` no existe. | `package.json`, `server/package.json` |
| Componente raíz | 979 líneas, **28 `useState`**, 5 `useEffect`, 11 pestañas en un solo `activeTab` | `App.tsx:77-104` |
| Otros gigantes | 1.143 · 1.135 · 771 líneas | `ResultsTable.tsx`, `ClientManager.tsx`, `SavedManager.tsx` |
| Mock en el bundle | Seis marcas reales viajan en el JavaScript que descarga cualquier tenant | `App.tsx:30` |
| Sin observabilidad | **46 `console.*`** en `server/src`, **31 de ellos `console.error`**. Sin request id, sin nivel, sin workspace. | `grep -rn "console\." server/src` |
| Consumo que se pierde | `recordUsage` se come su propio error a propósito y deja un `console.error`: ese consumo no se cobra y nadie se entera | `usageService.ts:150` |
| Alta de marca | Cinco campos de ADN a mano, o un PDF del que se leen **los primeros 18.000 caracteres y el resto se descarta** | `brandExtractionService.ts:14` |
| Un solo tenant | 1 workspace, 3 marcas, 18 usuarios. `QUOTA_ENFORCE=false` | producción, 2026-08-28 |

Lo que **sí** existe y no hay que rehacer: cuatro jobs de CI, `verify:isolation` (27/27),
`verify:resiliencia`, los tres chequeos de tipos y `/health`.

---

## Orden y dependencias

```
fase 0 ─┐
        ├─→ fase 1 (la red) ──┬─→ fase 3 (partir App.tsx) ──┐
        │                     │                              ├─→ fase 5 (segundo tenant)
        └─→ fase 2 (logs) ────┴─→ fase 4 (alta de marca) ────┘
```

Las pruebas van primero **no porque sean lo más urgente sino porque son la red de las otras
dos fases que tocan código existente**. Refactorizar el componente raíz sin una sola prueba es
exactamente cómo se rompe producción un viernes.

La fase 5 va última porque es el examen, no el estudio.

**Esfuerzo total: ~18 días hábiles**, una persona. Las fases 1 y 2 son paralelizables entre
dos; las demás no.

---

## Fase 0 · La compuerta · medio día

Sin `npm test` en CI, las pruebas de la fase 1 son un archivo que alguien recuerda correr.

**La decisión que hay que tomar primero: qué corredor.** No es simétrica entre los dos
proyectos, y la razón es la resolución de módulos.

- **Servidor → `node:test` corriendo con `tsx`.** El servidor usa `module: NodeNext` con
  especificadores `.js` que apuntan a archivos `.ts` (ver *Gotchas* en CLAUDE.md). Vitest no
  resuelve eso sin un alias a mano; `tsx` sí, y ya es una devDependency. Cero dependencias
  nuevas.
- **Frontend → Vitest + jsdom + Testing Library.** Vite ya está, la resolución es `bundler` y
  no tiene el problema anterior. Para montar componentes React no hay alternativa razonable.

**Spike obligatorio antes de comprometerse (1 hora):** un test trivial que importe
`channels/validators.js` desde `server/src` y corra con `tsx --test`. Si la resolución del
especificador `.js` falla, la alternativa es Vitest con un `resolve.alias` por expresión
regular, y hay que saberlo antes y no a mitad de la fase 1.

**Entregables**
- `npm test` en la raíz y en `server/`.
- Un quinto job en `.github/workflows/ci.yml`, al lado de los cuatro que ya hay.
- **Una sonda de error deliberado**, igual que la que ya protege el job de tipos: un archivo
  con un test que falla, excluido por configuración, que se incluye a mano una vez para
  comprobar que el job realmente lee lo que dice leer. Una compuerta que certifica en verde
  archivos que no abre es peor que no tener compuerta.

**Criterio de salida:** un test roto pone el PR en rojo, y está demostrado —no supuesto— que
el job lee los archivos que se van a escribir en la fase 1.

---

## Fase 1 · Las ocho pruebas que pagan primero · 2–3 días

No es «cobertura». Es la lista corta de piezas **deterministas, puras, y donde un error es
silencioso y caro**. Ninguna toca la base ni gasta un token.

| Archivo | Qué se prueba | Por qué esa, y no otra |
|---|---|---|
| `channels/validators.ts:41,53,82` | `detectTuteo`, presupuesto `char`/`word` con `max` y `min`, `validateBatch` | Es la única etapa que no gasta tokens y la que decide si el fixer corre. Un falso negativo publica copy fuera de límite; un falso positivo quema una llamada al fixer **en cada generación**. |
| `services/usageService.ts:29,32` | `currentPeriodStart` / `nextPeriodStart` bajo `TZ=America/Bogota` | El esquema **ya documenta el error**: un `new Date(y,m,1)` local corre la fila un mes entero en zonas negativas. Es un bug conocido sin nada que lo fije. |
| `services/usageService.ts:57` | `resolveQuota` con los dos overrides, con uno solo y con ninguno | Decide cuánto puede gastar cada marca. Hoy solo se ejercita en producción. |
| `services/pricing.ts:61,101,130` | `computeCost` con un modelo ausente de `MODEL_PRICING` (debe dar 0, no `NaN`), tokens cacheados, agregación por etapa | Es el número que se va a facturar. |
| `channels/registry.ts:43,52` | `getSlotSpec` y `resolveSlotLabel` con plataforma y slot inexistentes | Alimenta `slotLabel`, que nunca viene del body. Un `undefined` acá se persiste. |
| `lib/crypto.ts:52,54,73` | Ida y vuelta, `isEncrypted` sobre texto plano, y que una clave equivocada **falle** en vez de devolver basura | Si esto se rompe en silencio, cada tenant tiene que volver a escribir su API key. |
| `lib/tenancy.ts:41` | `pickFields`: que un body con `clientId` o `workspaceId` no los deje pasar | Es la defensa contra reasignación de dueño. Hoy la cubre `verify:isolation` de rebote, no de frente. |
| `channels/promptBuilder.ts:213` | Que el prompt de dos canales contenga sus `max` y sus `count` reales | Prueba corta de instantánea: detecta que alguien cambió un spec sin querer. |

**Lo que deliberadamente NO entra:** los controladores. Ya los cubre `verify:isolation`, que es
una prueba de integración real contra una base real — mejor que cualquier simulacro de Prisma,
y ya está escrita.

**Criterio de salida:** `npm test` verde con ≥ 40 casos, corriendo en menos de 10 segundos,
sin base de datos y sin red. Los cuatro backfills y los dos `verify:*` siguen pasando.

---

## Fase 2 · Observabilidad · 2 días

Hoy un error de generación en producción deja una línea sin marca, sin canal, sin workspace y
sin forma de correlacionarla con la petición que la causó. Y hay consumo que se pierde en
silencio por diseño (`usageService.ts:150`): la generación se cobró en tokens pero no se
registró, y lo único que queda es un `console.error`.

**Entregables**
1. `server/src/lib/log.ts` — un logger JSON de una función, **sin dependencia nueva**. Campos
   fijos: `ts`, `nivel`, `evento`, `requestId`, `workspaceId`, `clientId`; el resto libre.
2. Middleware de `requestId` (`crypto.randomUUID()`) en `index.ts`, colgado de `req.tenant`
   para que lo vean los servicios sin pasarlo por parámetro en toda la cadena.
3. Los tres puntos donde el log cambia una investigación:
   - `openaiService.ts` — canal, modelo, intentos, milisegundos, costo y código de error por
     etapa.
   - `aiClient.ts` (`clasificarError`) — terminal contra reintentable, **con el código**. Hoy
     la diferencia entre `insufficient_quota` y un 429 normal es invisible desde afuera.
   - `usageService.ts` — cuota superada, aunque `QUOTA_ENFORCE` sea `false`, y el consumo que
     se perdió.
4. Reemplazar los 31 `console.error`, empezando por `controllers/`.
5. `/health` ya existe: agregarle versión del build y estado de la conexión a la base.

**Lo que NO entra:** elegir un servicio externo (Datadog, Sentry, OpenTelemetry). Primero que
los logs tengan forma; el destino se elige cuando haya algo que mandar y dos tenants que
separar. Meter un SDK ahora es comprar una factura mensual para ver `console.error` en otra
pantalla.

**Criterio de salida:** una generación fallida se reconstruye entera —qué canal, qué modelo,
cuántos intentos, cuánto costó, por qué murió— desde `docker logs` filtrando por un solo
`requestId`.

---

## Fase 3 · Partir el componente raíz · 3–4 días

**Nivel 1 (`.pen`) antes de tocar código:** ninguno. Este refactor no cambia una sola pantalla.
Si cambia alguna, se salió del alcance.

El problema no es que `App.tsx` sea grande: es que **todo estado nuevo de la fase 3 del H2
—subir la pieza, mostrar el informe de auditoría— tiene que aterrizar ahí**, sobre 28
`useState` que ya conviven sin separación.

**Paso 0 · la red (medio día).** Antes de mover nada: tres o cuatro pruebas de humo con Vitest
+ Testing Library que monten `App`, verifiquen que las 11 pestañas cambian y que la vuelta
autenticado/no autenticado renderiza lo que debe. Sin esto el resto de la fase es a ciegas.

**Paso 1 · sacar el mock del bundle (media hora, y va primero).** `App.tsx:30` embarca los
nombres de seis marcas reales en el JavaScript de producción. Con un tenant es feo; con dos es
una filtración. No espera al resto de la fase.

**Cortes, en orden, sin cambiar comportamiento:**

| # | Qué sale | Estados que se lleva | Quién lo consume |
|---|---|---|---|
| 1 | `hooks/useGeneracion.ts` | `variations`, `coherence`, `spine`, `usage`, `lastParams`, los cinco `progress*`, `failedChannels` — **11 de 28** | `ResultsTable`, `GenerationProgress`, `FailedChannelsPanel` |
| 2 | `context/DatosTenant.tsx` | `clients`, `projects`, `savedVariations`, `dnaProfiles`, `activeClientId`, `customVoices`, `customGoals` — **7 de 28** | Hoy bajan como props por tres niveles |
| 3 | `hooks/useSesion.ts` | `isAuthenticated`, `currentUser`, `users`, e `isAdmin` derivado | `UserHeader`, cambio de empresa |
| 4 | `hooks/useNavegacion.ts` | `activeTab` (11 valores) | Contra las etapas que ya define `screens.ts` |

`ResultsTable` (1.143 líneas) y `ClientManager` (1.135) **quedan fuera a propósito**. Son
grandes pero no bloquean nada; se parten cuando haya una razón para tocarlos, no antes.

**Criterio de salida:** los tres chequeos de tipos pasan, `App.tsx` declara **cinco `useState`
o menos**, la vuelta completa a mano funciona (generar → guardar → mandar a revisión → tablero
de producción), y el primer estado nuevo del H2 fase 3 tiene un lugar obvio donde ir que no es
`App.tsx`.

---

## Fase 4 · Alta de marca en minutos · 4–5 días · **H1.C**

**Nivel 1 (`.pen`) antes de tocar código — tres decisiones que no se resuelven en el editor:**
1. Cómo se ve el paso de confirmación: la extracción **propone**, la persona **confirma**. El
   prompt de extracción ya dice *«es preferible vacío a especulativo»*; la pantalla tiene que
   dejar ver cuáles campos quedaron vacíos y por qué.
2. Qué pasa mientras la extracción corre (es una llamada de varios segundos a un modelo).
3. Cómo se ve una marca **sin corpus**: hoy `computeBrandFingerprint` necesita piezas aprobadas
   que una marca nueva no tiene.

**Nivel 2 — construcción**

1. **Ingesta desde URL.** Bajar el sitio, extraer texto, y pasarlo por
   `buildExtractionPrompt`, que ya existe y funciona. El servicio no cambia: cambia de dónde
   viene el texto. Es la parte barata.
2. **El paso de confirmación**, según el nivel 1. Nunca escribir el ADN de una marca sin que
   alguien lo mire.
3. **Fingerprint con corpus vacío.** Definir y probar el comportamiento — hoy no está claro, y
   es exactamente lo que hace que la primera generación de una marca nueva sea la peor.
4. **El PDF deja de truncarse en silencio.** Hoy se descartan los caracteres a partir del
   18.000 sin avisar. Mínimo: decírselo a quien lo sube. La solución real es recuperación
   (H2.D) y no entra acá, pero el aviso sí.

**Lo que NO entra:** ingesta desde redes sociales. Es scraping con términos de servicio en
contra y mantenimiento perpetuo; el sitio web y el PDF cubren el caso que importa.

**Criterio de salida:** cronómetro contra una marca real que nadie del equipo conoce. **De
cero a la primera generación con ADN en menos de 10 minutos, sin que nadie del equipo esté en
la llamada.** Si hace falta una llamada, la fase no cerró.

---

## Fase 5 · El segundo tenant · ~1 semana, mayormente sin código

Es el examen. Nada de esto se aprueba con datos de siembra: la arquitectura multi-empresa está
construida y verificada, pero **nunca la ha ejercido una empresa distinta**.

**Prerrequisitos que sí son código**
- El mock fuera del bundle (fase 3, paso 1).
- **White-label mínimo del portal de revisión** ([A2](./plan-a2-whitelabel.md)). Es la pantalla
  con más superficie de marca del producto y hoy es la única sin ninguna
  (`ReviewPortal.tsx:154`). El cliente final del segundo tenant no puede entrar a una pantalla
  sin identidad.
- Calibrar `QUOTA_ENFORCE`. Nota sobre un comportamiento que **no es un defecto**: el corte se
  evalúa primero a nivel workspace, así que una marca que agota el plan de la empresa corta a
  todas las demás de esa empresa. Está documentado como deliberado en `usageService.ts:55`. Lo
  que la fase 5 tiene que decidir es si sigue siendo la política correcta cuando el que paga
  no es quien construyó la herramienta.

**El trabajo que no es código**
- **Guion de alta ejecutado por alguien que no lo construyó**, con cronómetro, anotando cada
  vez que tuvo que preguntar algo. **Ese registro es el entregable**, no el tenant.
- Ensayo de la secuencia contra una copia de producción antes de tocar producción — es el
  procedimiento que ya evitó dos incidentes el 28 de agosto y no se salta.

**Criterio de salida:** dos workspaces reales en producción, `verify:isolation` en verde contra
una copia de la base con ambos, consumo separado y facturable por cada uno, y una bitácora de
alta que una persona de comercial pueda ejecutar sola.

---

## Resumen

| Fase | Qué cierra | Esfuerzo | Depende de |
|---|---|---|---|
| 0 · La compuerta | — | ½ día | — |
| 1 · Ocho pruebas | E2 (5) | 2–3 días | 0 |
| 2 · Observabilidad | E4 | 2 días | 0 |
| 3 · Partir el raíz | E3 | 3–4 días | 1 |
| 4 · Alta de marca | H1.C | 4–5 días | `.pen`, 2 |
| 5 · Segundo tenant | valida H1.A | ~1 semana | 3, 4, A2 |

## Lo que este plan no hace

- **No busca cobertura.** Ocho archivos elegidos, no un porcentaje. Un número de cobertura alto
  sobre código que nadie va a tocar no protege nada.
- **No reescribe el frontend.** Los dos componentes de más de mil líneas se quedan como están.
- **No elige herramienta de observabilidad.** Primero forma, después destino.
- **No hace scraping de redes.**
- **No toca `strict: true` en el tsconfig raíz.** Sigue siendo E2 (2), con su propio
  presupuesto: destapa mucho más de lo que cabe en este plan.
