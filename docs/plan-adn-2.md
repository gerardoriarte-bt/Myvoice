# Plan · ADN 2.0 por capas y campaña nueva

Estado: F1 construida (2026-11-05, migración `20261105000002_adn_2_secciones`); F2 y F3 construidas (2026-11-12); F4–F6 por hacer · Decisión 17 · PRD: ADN-1 a ADN-8, PL-4, PL-12 ·
Diseño: `.pen`, «— Decisión 17 · ADN 2.0 por capas y campaña nueva» (cinco frames) · Antes:
[plan-revision-adn.md](./plan-revision-adn.md) (revisión de la madre, en producción) y la decisión 16
(capas, en producción).

## Decisiones (2026-11-05)

1. **Las secciones se ordenan por lo que aportan al entregable**, no por The Brief, que fue solo una
   referencia. Son diez secciones en tres grupos, y cada grupo corresponde a la etapa del motor que
   lo usa:

   | Grupo | Sección | ★ | Lo usa | Modo en una submarca |
   |---|---|---|---|---|
   | Qué decir | Propuesta de valor | ★ | director (concepto, ángulos) y redactor | igual / propia |
   | | Productos y servicios | | director y redactor: no inventa beneficios ni precios | igual / propia |
   | | Audiencias | ★ | director (un ángulo por audiencia) y redactor | igual / propia |
   | Cómo suena | Voz y personalidad | ★ | redactor y revisor | igual / propia |
   | | Tratamiento | ★ | redactor, validador, revisor y corrector (en producción) | igual / propio |
   | | Así suena | | redactor: textos aprobados que imita | igual / propia |
   | Qué no se toca | Prohibiciones | ★ | validador y revisor | **suma** (fijo) |
   | | Frases que no se cambian | | validador: escritura exacta | **suma** (fijo), ver pregunta 1 |
   | | Reglas de estilo | | validador (reglas medibles) y redactor (notas) | igual / propia |
   | | Keywords | | redactor | **suma** (fijo) |

   Las «guías de voz» de hoy (`brandVoiceGuidelines`) pasan a las **notas** de reglas de estilo.
2. **Mínimo: 75 % y todas las ★ completas.** En v2 **bloquea** crear la campaña; en v1 **solo
   avisa**. El número es provisional hasta calibrarlo con `verify:calidad -- --ablacion`.
3. **Lo que propone la IA no cuenta** hasta que una persona lo confirma (ADN-7). **Lo heredado sí
   cuenta**: una submarca solo completa lo que tiene propio.
4. **La campaña fija su versión del ADN al crearse** (PL-12). Pasar a una versión nueva es una acción
   explícita. El tratamiento viene del ADN y no se elige por campaña.

## Nivel 1 · Qué ve el usuario

Está en el `.pen`. En resumen:

- **Marcas › ADN**: arriba, un anillo de completitud con la marca del 75 %, «Faltan N para abrir
  campañas» y la leyenda por estado. Al lado, «Completar con IA» desde cuatro fuentes. Debajo, los
  tres grupos con una tarjeta por sección. Cada tarjeta muestra su estado con un punto de color, la ★
  si es imprescindible, el origen (Persona o IA) y su acción. Las explicaciones largas van detrás de
  un «i».
- **En una submarca**, cada sección tiene el selector «= Terpel / Propia». Las secciones que suman
  muestran un candado, lo de la madre atenuado y debajo «+ propias». Lo heredado lleva «de Terpel» y
  el enlace «Ver en Terpel».
- **Una propuesta de la IA** se revisa de a una («1 de 3»), con Descartar, Corregir y «Está bien».
- **Campaña nueva**: nombre, referencia, responsable y fechas. Del ADN: la versión fija, el
  tratamiento con candado y las audiencias como chips. Después, «¿Por dónde sigue?»: My Voice o CDM.
- **Con el ADN bajo el mínimo**, la campaña muestra qué falta y «Completar el ADN →». En v2 el botón
  «Crear» queda bloqueado; en v1 Generar muestra el mismo aviso, pero sin bloquear.

## Nivel 2 · Cómo se construye

### Modelo (una migración aditiva por fase que la necesita)

- **`SeccionAdn`** suma:
  - `origen OrigenSeccion @default(PERSONA)`, con `PERSONA | IA_PROPUESTA | IA_CONFIRMADA`.
  - `fuente String?`, con `'pdf' | 'copy-aprobado' | 'url' | 'entrevista'`.
  - `estado EstadoSeccion?`, con `VACIA | DEBIL | COMPLETA`, y `motivo String?`.

  `contenido` deja de ser siempre `{ texto }`: cada clave valida su forma en `secciones.ts`. La forma
  de las cinco claves de hoy no cambia.
- **`AudienciaDeMarca`**:

  ```prisma
  model AudienciaDeMarca {
    id            String        @id @default(uuid())
    clientId      String
    nombre        String
    descriptores  Json          // { quienEs, queLeImporta, queLaFrena, comoHabla }
    origen        OrigenSeccion @default(PERSONA)
    fuente        String?
    orden         Int
    archivada     Boolean       @default(false) // una usada en campañas no se borra
    autorId       String?
    actualizadaEn DateTime      @updatedAt
  }
  ```

  La sección `audiencias` de `SeccionAdn` guarda solo el modo (igual o propia). La lista vive en esta
  tabla. Una submarca en «igual» ve la lista de la madre, y una campaña de la submarca puede elegir
  esas audiencias.
- **`Project`** suma `referencia String?`, `inicio DateTime?`, `fin DateTime?`,
  `siguePor SiguePor?` (`MY_VOICE | CDM`) y `audiencias Json?`. En `audiencias` se guardan
  `[{ id, nombre, descriptores }]` con los descriptores copiados, para que editar una audiencia
  después no cambie una campaña en curso. `adnVersion` ya existe; desde F6 se llena al crear la
  campaña.
- **`Workspace.procesoCampana Boolean @default(false)`** (spec v2 § 3): llega en F6 y es lo único que
  separa «bloquea» de «avisa».
- **`AdnVersion.secciones`** guarda las diez claves, también la lista de audiencias y el
  tratamiento. Así una campaña con versión fija genera con exactamente lo que vio. Las versiones
  viejas solo tienen las cinco claves; el resolver lee `guias` como las notas de reglas de estilo.

### Parte común (`server/src/comun/adn/`)

| Archivo | Qué |
|---|---|
| `secciones.ts` | `SECCIONES_ADN` suma `grupo`, `critica` (★), `peso` y la validación del `contenido` de cada clave. Las claves nuevas son `productos`, `audiencias`, `asiSuena`, `frasesIntocables`, `reglasDeEstilo` y `tratamiento`. `guias` queda como clave de lectura de versiones viejas. |
| `resolverAdn.ts` | Resuelve las diez claves. Las audiencias se resuelven desde la tabla (las de la madre si el modo es igual). El tratamiento sale de la columna `Client.tratamiento` con la regla actual de la madre confirmada; la sección solo refleja lo que dice la columna. |
| `guardarAdn.ts` | `guardarSeccion(clientId, clave, contenido, { origen, autorId, tx })` es la nueva escritura de una sección. Valida el contenido, recalcula el estado, escribe el espejo en la columna de v1 cuando la hay y guarda una `AdnVersion`, con cascada a las submarcas como hoy. `guardarAdnDesdeColumnas` sigue para la pantalla de v1 mientras exista. |
| `completitudAdn.ts` (nuevo) | Es el único lugar que calcula la completitud. Ver «Completitud». |
| `revisionAdn.ts` | «Está bien / Corregir» se generaliza a cualquier clave. Confirmar una propuesta pasa `IA_PROPUESTA` a `IA_CONFIRMADA` y registra quién confirmó. |

`fronteras`: todo lo nuevo de `comun/adn/` va asignado a `comun` en `scripts/mapa/modulos.json`, y no
importa de ningún módulo.

### Completitud

```
porcentaje = Σ peso × valor / Σ peso      valor: VACIA 0 · DEBIL 0.5 · COMPLETA 1 · IA_PROPUESTA 0
apta       = porcentaje ≥ 75 && todas las ★ en COMPLETA
```

- **El estado empieza siendo determinista**: se calcula al guardar, sin IA y sin gasto. Reglas
  provisionales en `secciones.ts`:
  - **audiencias**: al menos 1, cada una con los cuatro descriptores.
  - **así suena**: al menos 3 ejemplos.
  - **prohibiciones**: al menos 2.
  - **voz** y **propuesta de valor**: al menos 1 frase completa (≥ 60 caracteres).
  - **tratamiento**: elegido.
  - **el resto**: no vacío.
  - Por debajo del umbral, `DEBIL` con su `motivo` («falta qué la frena»).

  La evaluación con el modelo chico (spec § 6) queda para cuando la medición diga que estas reglas
  no alcanzan.
- **Pesos provisionales**: ★ = 2, el resto = 1.
- La completitud se calcula sobre el ADN **resuelto**: lo heredado cuenta.
- **Dónde se lee**:
  - `GET /clients/:id/adn` la devuelve junto a las secciones.
  - `GET /clients` agrega `adnApto` para Marcas y Generar.
  - En F6, `POST /projects` (campaña nueva) responde **409** `{ faltan: [clave] }` solo si
    `workspace.procesoCampana` está encendido.

### API (en `clientController.ts`; el ADN 2.0 existe con el interruptor apagado, spec § 3)

| Método y ruta | Quién | Qué |
|---|---|---|
| `GET /clients/:id/adn` | miembro | ya existe; suma completitud, origen, estado, motivo y audiencias |
| `PUT /clients/:id/adn/:clave` | manager | guarda una sección (`guardarSeccion`); en submarca acepta `modo` |
| `POST /clients/:id/adn/:clave/confirmar` | manager | «Está bien»: confirma la sección o la propuesta |
| `GET/POST/PUT /clients/:id/audiencias[/:aid]` | manager | lista fija; se archiva, no se borra |
| `POST /clients/:id/adn/asistente` | manager | `{ fuente }` → propuestas `IA_PROPUESTA` (F5) |
| `POST /projects/:id/adn/actualizar` | responsable o manager | pasa la campaña a la versión vigente (F6) |

Todas empiezan con `assertClientInWorkspace` o `assertProjectInWorkspace`. Una audiencia ajena
devuelve 404. «Manager» se reemplaza por la función «Estrategia» cuando `FuncionEquipo` la tenga
(spec § 4.2); hasta entonces, OWNER/ADMIN.

### Motor (`parametrosDeGeneracion.ts`, `promptBuilder.ts`, `validators.ts`)

- **Productos y servicios** entra al prompt del director y del redactor como hechos que se pueden
  usar. El prompt prohíbe afirmar lo que no esté ahí.
- **Audiencias**:
  - Si la campaña tiene audiencias elegidas, el director recibe sus descriptores y reparte los
    ángulos entre ellas.
  - Si no las tiene (v1), sigue el `targetAudience` del brief.
- **Así suena** reemplaza los «5 últimos aprobados» (`approvedVariations`, hoy elegidos por fecha)
  por los ejemplos curados.
  - Si la sección está vacía, sigue la regla de hoy.
  - Los ejemplos del brief (`feedbackExamples`) se mantienen.
- **Frases que no se cambian**: `validators.ts` exige su escritura exacta (mayúsculas, tildes,
  espacios) cada vez que aparecen, igual que los assets literales de `oficio.ts`. El corrector las
  arregla.
- **Reglas de estilo**: las medibles entran a `validators.ts`. Para empezar son emojis sí/no y
  cuántos, signos de apertura, formato de precios y cifras, y mayúsculas sostenidas. Las notas
  entran al prompt del redactor.
- **Medir antes de mergear F4**: correr `verify:calidad` con y sin las secciones nuevas sobre los
  mismos casos. Gasta crédito y se corre solo con permiso.

### Fases (un PR cada una, `main` desplegable)

| # | Qué | Archivos principales |
|---|---|---|
| F1 | Modelo y parte común: claves nuevas, `origen` y `estado`, `AudienciaDeMarca`, `guardarSeccion`, `completitudAdn`, el resolver con diez claves, la migración de `guias` a notas de reglas de estilo y la API de secciones y audiencias | migración, `comun/adn/*`, `clientController.ts`, `routes/index.ts`, `verifyAdn.ts`, `verifyIsolation.ts` |
| F2 | Pantalla ADN 2.0 según el `.pen`: madre y submarca, anillo, grupos, modos y candado, «Está bien / Corregir» por sección y audiencias. Reemplaza la pestaña de ADN de v1 en Marcas. | `components/adn/*` (nuevo), `ClientManager.tsx`, `RevisionDeAdn.tsx`, `novedades.ts` |
| F3 | Aviso en v1: el chip y el banner en Marcas, y en Generar el aviso «Al ADN de Terpel le faltan 2» con enlace, sin bloquear | `ParameterForm.tsx`, `App.tsx`, `ClientManager.tsx` |
| F4 | El motor lee las secciones nuevas (productos, audiencias, así suena, frases, reglas de estilo), con la medición antes y después | `parametrosDeGeneracion.ts`, `promptBuilder.ts`, `directorService.ts`, `validators.ts`, `fixerService.ts` |
| F5 | «Completar con IA» (ADN-6) y la revisión de propuestas de a una, en este orden: copy aprobado (así suena, tratamiento, reglas), PDF entero (`FuenteDeMarca`), URL y entrevista | `brandExtractionService.ts`, `voiceFingerprintService.ts`, `pricing.ts` (etapa `asistente-adn`), `components/adn/Propuesta.tsx` |
| F6 | Campaña nueva: el interruptor `procesoCampana`, los campos de `Project`, la versión del ADN fija, las audiencias elegidas, «cómo sigue», el 409 en v2 y «Actualizar a la versión nueva». «Crear y generar» abre Generar con la campaña. | migración, `savedController.ts` (`createProject`), `parametrosDeGeneracion.ts`, pantalla nueva, `screens.ts` |

- F1 no cambia nada visible y se despliega sola.
- F2 y F3 pueden ir en el mismo despliegue.
- F4 se mergea solo si la medición no empeora.
- El brief creativo de la campaña (concepto, mensaje, tono, CTA con «Sugerir») no está en este plan:
  la pantalla `§ v2 · Brief de campaña` todavía tiene «frentes» y hay que rediseñarla primero.

### Despliegue

- Las migraciones son aditivas, así que `deploy.sh` corre primero sin pasos de datos.
- La única transformación (`guias` → `reglasDeEstilo.notas`) va en la misma migración de F1, en SQL.
  `brandVoiceGuidelines` sigue siendo su espejo.
- Al desplegar F1 ninguna marca cambia de comportamiento: las secciones nuevas están vacías y
  `asiSuena` vacía mantiene la regla de hoy.
- Después de F2, quien confirme el ADN de Terpel ya lo hace en la pantalla nueva. Este pendiente
  sigue abierto desde el 2026-11-04.

### Lo que F1 decidió al construir (2026-11-05)

- **Lo propuesto por la IA no reemplaza el contenido**: espera en `SeccionAdn.propuesta` (con
  `propuestaFuente` y `propuestaEn`) hasta «Está bien», que lo copia al contenido con origen
  `IA_CONFIRMADA`. Así una propuesta no borra lo que ya escribió una persona. En una audiencia, la fila
  misma lleva `origen: IA_PROPUESTA` y el resolver la ignora.
- **El estado no se guarda**: se calcula al leer, sobre el ADN resuelto (`completitudAdn.ts`). Es
  determinista y barato, y guardarlo habría quedado viejo cada vez que cambia la madre.
- **Rutas**: `PUT /clients/:id/adn/secciones/:clave`, `POST /clients/:id/adn/secciones/:clave/propuesta/(confirmar|descartar)`
  y `GET/POST/PUT /clients/:id/audiencias[/:audienciaId]` (con `confirmar: true` para una propuesta).
  `GET /clients/:id/adn` suma `completitud` y `origenes`.
- **El tratamiento es una sección con columna** (`Client.tratamiento`): cambiarlo en v1 ya guarda versión.
- **La revisión de la madre sigue pidiendo las cinco de antes** (`SECCIONES_DE_REVISION`); la pantalla
  nueva la generaliza en F2. Desde F1 la sección que era «Guías de voz» se llama «Reglas de estilo» en
  esa revisión.
- **Frases que no se cambian: suma fija**, como propuso la pregunta 1. Cambiarlo es una línea en
  `secciones.ts`.

### Lo que F2 y F3 decidieron al construir (2026-11-12)

- **El ADN es una pestaña de la marca** (ADN · Campañas · Métricas), no una pantalla aparte. Una marca que
  no llega al mínimo abre en el ADN; la tarjeta de la izquierda, que editaba voz, tratamiento, propuesta de
  valor y guías, ahora solo muestra el porcentaje y lleva a la pestaña.
- **«Está bien» vale para cualquier sección**: `POST /clients/:id/adn/secciones/:clave/revisada` marca
  `revisadaEn` sin guardar versión, y editarla después la vuelve a dejar sin revisar. La franja de la madre
  (`RevisionDeAdn.tsx`) ya no lista las secciones: dice cuáles de las cinco faltan, lleva a su tarjeta y
  confirma. Mientras la madre pide revisión, una sección vacía o débil también se puede dar por buena
  («Está bien así»): si no, una madre sin keywords no confirmaba nunca.
- **En una submarca no hay «Está bien»**: la revisión es de la madre antes de heredar. «Propia» abre el
  editor con lo de la madre para partir de ahí, y al guardar deja de heredar; «= Terpel» vuelve a heredar
  sin borrar lo propio.
- **`GET /clients/:id/adn` devuelve `filas`** (lo propio, la propuesta y quién y cuándo, ADN-8) en lugar
  de `origenes`; **`GET /clients` devuelve `adn`** (porcentaje, apta y qué falta) para el chip de Marcas
  y el aviso de Generar. Calcula la completitud de cada marca al leer la lista.
- **«Completar con IA» no aparece todavía**: llega con F5. El manual en PDF sigue en la columna de la
  izquierda como hasta ahora.
- **Así suena** sin ejemplos dice en su tarjeta que el motor usa los 5 últimos aprobados (pregunta 2,
  por ahora así). **Frases que no se cambian** quedó con suma fija y candado (pregunta 1); el frame
  `gZTh8` del `.pen` se ajustó.

### Criterios de aceptación

- Una marca sin las ★ completas no queda apta. Con las ★ completas y ≥ 75 % queda apta. Una propuesta
  de la IA sin confirmar no suma.
- Una submarca en «igual» hereda las audiencias de la madre confirmada. En «propia» usa las suyas.
  Las prohibiciones, frases y keywords de la madre siempre llegan al motor.
- Una campaña con `adnVersion` fija genera con esa versión aunque la madre cambie después.
  «Actualizar» la mueve a la vigente y queda registrado.
- En un workspace con `procesoCampana`, crear una campaña con el ADN no apto responde 409 con lo que
  falta. Sin el interruptor, Generar avisa y genera.
- Una frase que no se cambia, mal escrita en un texto, aparece como infracción y el corrector la
  arregla.
- `verify:adn` cubre todo lo anterior: secciones nuevas, completitud, audiencias heredadas y versión
  fija. `verify:isolation` cubre las rutas nuevas y la audiencia ajena (404). También tienen que
  pasar las tres verificaciones de tipos, `npm run fronteras` y `npm run build`.

## Preguntas abiertas

1. **Frases que no se cambian en una submarca** (resuelta el 2026-11-12: suma fija):
   - El `.pen` la dibuja con «= Terpel / Propia».
   - El plan propone **suma fija**, con candado como las prohibiciones. «ViveTerpel» tiene que
     escribirse igual en Terpel CRM, y sumar las frases de la madre no le quita nada a la submarca.
   - Si se aprueba, se ajusta el frame.
2. **Ejemplos de «así suena» sin elegir** (resuelta el 2026-11-12: la regla de hoy hasta F5):
   - Mientras nadie los elija, ¿alcanza la regla de hoy (los 5 últimos aprobados)?
   - ¿O F5 debería proponer de entrada los 10 mejores del copy aprobado para confirmar?
