# Spec · Proceso de campaña (v2)

Estado: borrador para revisión · 2026-10-26
Producto: [prd-proceso-de-campana.md](./prd-proceso-de-campana.md) (los ids OF-, ADN-, RZ-, …
se refieren a sus requisitos)

## 1. Principios

1. **v1 no se rompe.** Todo cambio de esquema es **aditivo**: tablas nuevas, columnas nullable,
   valores de enum nuevos. Ninguna ruta de v1 cambia de contrato. La única excepción buscada es
   el motor (R0), que mejora a las dos.
2. **Mismo repo, misma base, misma auth.** v2 no es otra app: reusa tenancy, guards, portal de
   revisión, Producción, cuota y `aiClient.ts`. Lo que separa es un interruptor por workspace y un
   espacio propio de rutas, servicios y pantallas.
3. **Los medios son datos.** v2 no lee `server/src/channels/specs/`; lee el catálogo.
4. **La IA sugiere, el equipo decide** (PRD, sección 3). Ningún servicio de v2 guarda un valor de
   marca o de campaña generado por la IA sin que una persona lo acepte, y el motor usa el brief
   literal. Cada campo creativo guarda su origen, como las secciones del ADN.
5. **Un solo lugar decide cada cosa.** Completitud del ADN (`completitudAdn.ts`), permisos de
   campaña (`permisosCampana.ts`), catálogo (`catalogoMedios.ts`), como hoy `permisosPieza.ts`.

## 2. Dónde vive el código

```
server/src/v2/
  rutas.ts                  montado en /api/v2, detrás de requireWorkspace + exigirProcesoCampana
  catalogo/                 catalogoMedios.ts, importarCatalogo.ts, promptDeFormato.ts
  adn/                      completitudAdn.ts, asistenteAdn.ts, seccionesAdn.ts
  campana/                  briefService.ts, raicesService.ts, toolkitService.ts, permisosCampana.ts
  medios/                   planDeMedios.ts, adaptacionService.ts, controlService.ts
server/src/services/oficio.ts        (R0: compartido con v1)
server/scripts/calidad/              (R0: verify:calidad)
components/v2/                       pantallas nuevas
screens.ts                           etapas de v2 como un conjunto propio
```

`exigirProcesoCampana` es un middleware que responde 404 si el workspace no tiene v2 encendido:
igual que un recurso ajeno, una ruta apagada no se anuncia.

## 3. Interruptor

`Workspace.procesoCampana Boolean @default(false)`. Lo enciende un OWNER desde Configuración
(o el seed del piloto). Con el interruptor encendido:

- El menú muestra las etapas de v2 además de las de v1 (v1 sigue entera mientras exista).
- Marcas muestra el ADN 2.0 (que también existe con el interruptor apagado desde R1, porque mejora
  v1).

## 4. Modelo de datos

Esquemas en notación Prisma abreviada. Todos con `workspaceId` donde aplica, y guards en
`lib/tenancy.ts` para cada uno (`assertCampanaEnWorkspace`, `assertRaizEnWorkspace`, …).

### 4.1 ADN 2.0 (R1)

```prisma
model SeccionAdn {
  id           String   @id @default(uuid())
  clientId     String
  clave        String          // 'propuestaDeValor' | 'tratamiento' | 'reglasDeEstilo' | … (seccionesAdn.ts)
  contenido    Json            // forma propia de cada sección, validada en seccionesAdn.ts
  origen       OrigenSeccion   // PERSONA | IA_PROPUESTA | IA_CONFIRMADA
  fuente       String?         // 'pdf' | 'copy-aprobado' | 'url' | 'entrevista'
  evaluacion   Json?           // { estado: VACIA|DEBIL|COMPLETA, motivo, modelo, evaluadaEn }
  autorId      String?
  actualizadaEn DateTime @updatedAt
  @@unique([clientId, clave])
}

model AudienciaDeMarca {
  id          String @id @default(uuid())
  clientId    String
  nombre      String
  descriptores Json          // estructura de The Brief: quién es, qué le importa, qué la frena, cómo habla…
  origen      OrigenSeccion
  orden       Int
}

model FuenteDeMarca {       // lo leído una vez: texto del manual entero, de la URL
  id        String @id @default(uuid())
  clientId  String
  tipo      String          // 'pdf' | 'url'
  texto     String          // fragmentado al usarse, no cortado
  leidaEn   DateTime
}
```

- `Client` suma `tratamiento Tratamiento?` (`TU | USTED | VOS`). Las columnas de hoy
  (`valueProposition`, `brandVoiceGuidelines`, `brandKeywords`, `brandProhibitions`, `voice`) **no
  se borran**: un script copia su contenido a `SeccionAdn` con `origen = PERSONA`, y mientras v1
  exista se escriben en los dos lados (la sección es la fuente; la columna, un espejo para v1).
- Las claves de sección y su peso viven en `seccionesAdn.ts`, versionadas en código. **Los pesos
  y el mínimo salen de la calibración de R0**; hasta entonces, valores provisionales marcados así.

### 4.2 Funciones nuevas

`enum FuncionEquipo` suma `PLANNING` y `MEDIOS` (aditivo, `ALTER TYPE … ADD VALUE`).

### 4.3 Campaña v2 (R2)

La campaña sigue siendo `Project`. v2 suma:

```prisma
model BriefDeCampana {      // 1:1 con Project; v1 sigue usando ContentDNAProfile
  projectId     String @id
  concepto      String
  mensajeClave  String
  campoSemantico Json         // { territorio: string, afuera: string }
  tono          String
  ctaPrincipal  String
  angulos       Json          // [{ nombre, premisa, registro }], 2–3
  origenes      Json          // { campo: PERSONA | IA_CONFIRMADA }, para saber qué vino de una sugerencia
  racional      String?
  manifiesto    String?
  keyVisual     String?       // texto; BR-2 suma imagen
  assets        Json          // [{ texto, tipo: 'slogan'|'premio'|'mecanica', literal: true }]
  audienciaId   String
  funnel        FunnelStage
  requerimiento String
}

model TextoRaiz {
  id          String @id @default(uuid())
  projectId   String
  workspaceId String
  tanda       Int
  titular     String
  bajada      String
  desarrollo  String
  angulo      String
  estado      EstadoRaiz     // PROPUESTA | APROBADA_EQUIPO | RECHAZADA_EQUIPO | CON_LA_MARCA | APROBADA_MARCA | RECHAZADA_MARCA
  motivo      String?        // obligatorio en 👍 y 👎 (RZ-2)
  editadaPorId String?
  versiones   Json           // ediciones manuales (RZ-4), como previousVersions de SavedVariation
}
```

`Project.proceso ProcesoCampana @default(V1)` (`V1 | V2`) distingue una campaña de otra; una
campaña v2 no aparece en Generar de v1.

### 4.4 Toolkit en el portal

- `enum RondaRevision` suma `TOOLKIT`.
- `ReviewSessionItem` suma `textoRaizId String?`. El `CHECK` de la migración `ronda` pasa de «uno
  de dos» a «exactamente uno de tres» (`savedVariationId`, `piezaId`, `textoRaizId`), y la ronda
  sigue homogénea: `TOOLKIT` solo lleva raíces.
- La sesión `TOOLKIT` además muestra el concepto, el racional y el manifiesto del brief (solo
  lectura). Todo lo que se publica detrás del token es de una sola marca: el servidor rechaza una
  sesión que mezcle campañas de marcas distintas, como hoy.

### 4.5 Catálogo de medios (R3)

Global, sin `workspaceId`: no contiene datos de clientes.

```prisma
model Medio {
  id      String @id          // 'meta', 'google', 'radio', …
  nombre  String
  grupo   String              // social | performance | engagement | audio | video | ooh | …
  activo  Boolean @default(true)
}

model Formato {
  id          String @id      // 'meta-carrusel-ads'
  medioId     String
  nombre      String          // 'Carrusel de Meta (ads)'
  descripcion String
  guia        String          // táctica del formato para el prompt
  pieza       Json?           // { tipo: 'grafica'|'video'|'audio', medidas: [...], duracionSeg? }
  version     Int             // sube con cada cambio de partes o límites
  activo      Boolean @default(true)
  partes      ParteDeFormato[]
}

model ParteDeFormato {
  id        String @id @default(uuid())
  formatoId String
  clave     String            // 'caption' | 'textoEnImagen' | 'descripcion'
  etiqueta  String
  tipo      TipoParte         // PUBLICABLE | INSTRUCCION | GUION
  unidad    UnidadParte       // CHAR | WORD | SEGUNDOS
  min       Int?
  max       Int?
  repeticiones Int @default(1)   // Google Ads: 15 titulares dentro de UNA unidad
  obligatoria  Boolean @default(true)
  guia      String?
  orden     Int
}

model FormatoOculto {        // CAT-5: un workspace esconde lo que no usa
  workspaceId String
  formatoId   String
  @@id([workspaceId, formatoId])
}
```

- **Una unidad** es el conjunto de partes de un formato (con sus repeticiones). La cantidad la pide
  la línea del plan, no el formato.
- **Versión**: editar partes o límites sube `Formato.version` y guarda la anterior en
  `FormatoVersion { formatoId, version, partes Json }`. Cada unidad guarda `formatoId` y
  `formatoVersion` y se valida contra esa versión (CAT-4).
- **Importación** (CAT-2): `npm run catalogo:importar -- archivo.csv` (en seco por defecto,
  `-- --apply` escribe, como los demás scripts), y la misma lógica detrás de una pantalla de
  administración. Una fila por parte: `medio, formato, parte, tipo, unidad, min, max, repeticiones,
  guía`. Valida antes de escribir: unidades conocidas, `min ≤ max`, claves únicas por formato,
  al menos una parte `PUBLICABLE` o `INSTRUCCION`.
- **Migración de v1** (CAT-3): un script convierte los 14 `ChannelSpec` al catálogo. `count` de un
  slot deja de ser «cuántas variaciones» y pasa a `repeticiones` solo donde el formato realmente
  lleva varias (Google Ads, slides de carrusel); donde era «variaciones de lo mismo», queda en 1.
  Esa diferencia se revisa a mano por formato: es la decisión de producto más delicada de la
  migración.
- **¿Quién edita?** Solo un usuario con `esAdminDePlataforma` (columna nueva en `User`, para el
  equipo de LoBueno). No es un rol de workspace.

### 4.6 Plan de medios y adaptaciones (R3)

```prisma
model PlanDeMedios {
  projectId String @id
  notas     String?
  lineas    LineaDePlan[]
}

model LineaDePlan {
  id          String @id @default(uuid())
  projectId   String
  workspaceId String
  formatoId   String
  cantidad    Int
  fecha       DateTime?
  responsableId String?
  raices      String[]        // ids de TextoRaiz; vacío = todas las aprobadas por la marca
  estado      EstadoLinea     // PENDIENTE | GENERANDO | EN_CONTROL | APROBADA | EN_PRODUCCION
  orden       Int
}

model Unidad {
  id            String @id @default(uuid())
  lineaId       String
  workspaceId   String
  clientId      String
  textoRaizId   String
  formatoId     String
  formatoVersion Int
  indice        Int            // 1..cantidad
  estado        EstadoUnidad   // GENERADA | CON_PROBLEMAS | APROBADA | DEVUELTA
  hallazgos     Json?          // control automático
}
```

- **Las partes de una unidad son `SavedVariation`**, con `unidadId`, `parteClave` y
  `textoRaizId` nuevos (nullable). Así Copy, Producción y la creación de piezas siguen funcionando
  sin una segunda tabla de textos. `platform` guarda el `formatoId` (es `String`, no el enum);
  `slot` guarda la clave de la parte.
- Una unidad se aprueba entera: aprobarla marca `isApproved` en todas sus partes, con
  `aprobadoVia = INTERNA` y el responsable como autor. **No hay ronda de cliente para unidades**
  (CT-3): la marca aprobó el toolkit.
- Producción exige hoy `isApproved` y campaña con responsable; se cumple sin cambios.

## 5. Motor

### 5.1 Oficio (R0, compartido)

- `services/oficio.ts` exporta el bloque del manual universal. Entra en el prefijo cacheable de
  `promptBuilder.ts` (v1) y de los prompts de v2: es idéntico para todas las llamadas, no rompe la
  caché.
- `directorService.ts`: se reescriben `FUNNEL_GUIDANCE` y `FUNNEL_HINT` sin muletillas.
- `criticService.ts`: seis marcas nuevas (`filler`, `lazy-question`, `manifesto`,
  `brand-in-headline`, `semantic-mix`, `asset-altered`); el fixer las trata como las demás.
- `validators.ts`: aperturas y muletillas prohibidas (lista en `oficio.ts`), y assets literales
  cuando la parte los exige.

### 5.2 `verify:calidad` (R0)

- Set fijo en `server/scripts/calidad/casos/` (5 campañas reales de Terpel, sin datos personales).
- Genera con el motor y evalúa con un **juez distinto del revisor** (otro prompt y, si se puede,
  otro proveedor), una regla del manual por pregunta. Salida: infracciones por regla cada 100
  textos, en JSON y en una tabla legible.
- Modo `--ablacion`: repite con el ADN recortado (sin audiencias, sin propuesta de valor, sin
  reglas, solo nombre y rubro) para calibrar pesos y mínimo (ADN-5).
- Gasta crédito: **no corre en CI**. Se corre a mano antes y después de cada entrega.

### 5.3 Sugerencias del brief (R2)

- `POST /campanas/:id/brief/sugerencias` con `{ campo, cantidad }` devuelve propuestas **sin
  guardarlas**. La pantalla las muestra al lado del campo con «Usar» y «Descartar»; «Usar» copia el
  valor al campo, que el equipo puede editar antes de guardar, y el origen queda `IA_CONFIRMADA`.
- Es el director de v1 reconvertido: recibe el ADN y lo que el brief ya tiene, y propone **solo el
  campo pedido**. Nunca devuelve una espina entera.

### 5.4 Raíces (R2)

```
completitud ≥ mínimo ─► brief completo (BR-3) ─► escritor de raíces ─► revisor ─► fixer
```

- **Sin director.** La espina de v1 (concepto, mensaje, tono, CTA, ángulos) en v2 es el brief que
  cargó el equipo, pasado literal. Pedir raíces con un campo de dirección vacío responde 409 con lo
  que falta.
- Una llamada de escritura por tanda. Las raíces rechazadas de tandas anteriores
  entran con su motivo como ejemplos negativos; las aprobadas de otras campañas de la marca, como
  positivos (AP-1).
- El escritor recibe: oficio, ADN (secciones confirmadas), audiencia elegida con sus descriptores,
  brief completo, assets literales.

### 5.5 Adaptación (R3)

```
línea del plan ─► reparto de unidades entre raíces ─► escritura por lote ─► validación por parte ─► revisor ─► fixer ─► control
```

- `promptDeFormato.ts` arma el bloque del formato **desde el catálogo**: partes, tipos, unidades,
  límites, repeticiones, guía. Es el equivalente de `buildChannelSuffix` para datos.
- **Lotes de hasta 10 unidades por llamada**; una línea de 30 son 3 llamadas en paralelo bajo el
  semáforo existente. Sin director: la espina es el toolkit.
- Reparto: round-robin entre las raíces de la línea; las unidades de una misma raíz reciben
  entradas distintas (dato, beneficio, escena) para no repetirse. Las entradas son recursos de
  redacción dentro de la raíz aprobada, no decisiones nuevas: el ángulo es el de la raíz.
- El revisor suma `root-drift` (se aleja de la raíz) y `new-promise` (promete algo que la raíz no
  dice).
- Control (`controlService.ts`): límites por parte contra la versión del formato, assets y gancho
  literales, marcas del revisor. Una unidad con problemas queda `CON_PROBLEMAS` y no se puede
  aprobar en lote.

### 5.6 Costo y cuota

Cada etapa registra su uso con `pricing.ts`, con `etapa` nueva (`raices`, `adaptacion`,
`asistente-adn`, `evaluacion-adn`) y cuenta en `UsagePeriod` como v1. La evaluación de secciones
del ADN usa el modelo chico (`MINI_MODELS`) y solo corre cuando la sección cambia.

## 6. Completitud del ADN

`completitudAdn.ts` es el único lugar que la calcula:

```
porcentaje = Σ peso(sección) × valor(estado)   / Σ peso
valor: VACIA 0 · DEBIL 0.5 · COMPLETA 1 · (IA_PROPUESTA sin confirmar → 0)
apta = porcentaje ≥ MINIMO && todas las CRITICAS en COMPLETA
```

- `estado` lo decide la evaluación guardada en `SeccionAdn.evaluacion`, contra una rúbrica por
  sección (en `seccionesAdn.ts`). Se recalcula al guardar la sección, no al leer.
- **Dónde se aplica:**
  - `POST /api/v2/campanas` responde **409** con `{ faltan: [...] }` si la marca no es apta.
  - v1 (Generar) recibe el mismo resultado y muestra un aviso, sin bloquear.
- Hipótesis de críticas hasta calibrar: propuesta de valor, tratamiento, al menos una audiencia,
  prohibiciones.

## 7. Asistente del ADN (R1, ADN-6)

| Entrada | Cómo | Salida |
|---|---|---|
| PDF | `brandExtractionService.ts` deja de cortar en 18.000 caracteres: guarda el texto en `FuenteDeMarca` y extrae por sección, sobre los fragmentos pertinentes. | Secciones `IA_PROPUESTA`, `fuente: 'pdf'` |
| Copy aprobado | Reusa `voiceFingerprintService.ts`. | Tratamiento, reglas de estilo |
| URL | Se lee una vez, se guarda el texto. Sin seguir enlaces fuera del dominio. | Productos, audiencias visibles, assets |
| Entrevista | Conversación por sección: la IA pregunta, Planning responde, la IA redacta. Estado en el cliente; el servidor solo redacta. | Una sección `IA_PROPUESTA` |

Confirmar una sección la pasa a `IA_CONFIRMADA` con el autor; editarla, a `PERSONA`.

## 8. API

Todo bajo `/api/v2`, con `requireWorkspace` + `exigirProcesoCampana`, salvo lo marcado.

| Método y ruta | Quién | Qué |
|---|---|---|
| `GET /marcas/:id/adn` | miembro | Secciones, audiencias, completitud |
| `PUT /marcas/:id/adn/:clave` | Planning o manager | Guarda una sección (vuelve a evaluar) |
| `POST /marcas/:id/adn/asistente` | Planning o manager | `{ fuente, … }` → propuestas |
| `POST /marcas/:id/adn/:clave/confirmar` | Planning o manager | Propuesta → confirmada |
| `CRUD /marcas/:id/audiencias` | Planning o manager | Audiencias |
| `POST /campanas` | manager | Crea campaña v2 (409 si el ADN no es apto) |
| `PUT /campanas/:id/brief` | Copy o responsable | Brief |
| `POST /campanas/:id/brief/sugerencias` | Copy o responsable | Propuestas para un campo, sin guardar |
| `POST /campanas/:id/raices` | Copy o responsable | Nueva tanda |
| `POST /raices/:id/voto` | Copy o responsable | 👍/👎 + motivo |
| `POST /campanas/:id/toolkit` | responsable | Aprueba raíces y crea la sesión `TOOLKIT` |
| `GET/PUT /campanas/:id/plan` | Medios o responsable | Plan y líneas |
| `POST /lineas/:id/generar` | Medios o responsable | Genera la línea (exige toolkit aprobado) |
| `POST /unidades/aprobar` | responsable | Aprobación en lote (solo unidades sin problemas) |
| `POST /unidades/:id/regenerar` | responsable | Una unidad o `{ parte }` |
| `GET /catalogo` | miembro | Formatos activos y no ocultos |
| `POST /admin/catalogo/importar` | admin de plataforma | Importación (en seco con `?apply=0`) |

El portal público (`/review/public/:token`) atiende `TOOLKIT` en el mismo controlador que hoy,
delegando en `toolkitService.ts` como hoy delega en `revisionDePiezas.ts`.

## 9. Permisos

`v2/campana/permisosCampana.ts` decide, igual que `permisosPieza.ts`, y la pantalla recibe
`puedo` precalculado. Reglas: aprobar raíces, mandar el toolkit y aprobar unidades es del
**responsable de la campaña**; Planning edita el ADN; Medios edita el plan y genera líneas; Copy
escribe el brief y pide raíces. Un manager puede todo en su workspace. Recursos de otro workspace:
404, como siempre.

## 10. Pantallas

Se dibujan en el `.pen` (sección «— Proceso de campaña») antes de codificarse. Lista inicial:

1. **ADN 2.0** en Marcas: secciones con estado y motivo, porcentaje, propuestas de la IA, asistente.
2. **Campaña v2**: cabecera con las etapas (brief · raíces · toolkit · plan · adaptaciones) y en
   cuál está.
3. **Brief**: los campos de dirección (concepto, mensaje, campo semántico, tono, CTA, ángulos) con
   «Sugerir» al lado, y el resto del brief.
4. **Raíces**: tarjetas con 👍/👎 y motivo, tandas, edición.
5. **Toolkit en el portal** (vista de la marca).
6. **Plan de medios**: líneas, selector de formato del catálogo con búsqueda (60+ formatos),
   avance por línea.
7. **Adaptaciones de una línea**: unidades con sus partes, contadores, raíz, hallazgos, aprobar en
   lote.
8. **Catálogo** (administración de plataforma): formatos, partes, importación, vista previa del
   prompt de un formato.

`screens.ts` suma las pantallas de v2 como un conjunto propio de etapas; `App.tsx` no crece: v2
monta un componente raíz (`components/v2/ProcesoDeCampana.tsx`) con su propio estado.

## 11. Migraciones (todas aditivas)

| Entrega | Migración |
|---|---|
| R1 | `SeccionAdn`, `AudienciaDeMarca`, `FuenteDeMarca`, `Client.tratamiento`, `FuncionEquipo` + `PLANNING`, `MEDIOS` · script de copia de columnas → secciones |
| R2 | `Workspace.procesoCampana`, `Project.proceso`, `BriefDeCampana`, `TextoRaiz`, `RondaRevision` + `TOOLKIT`, `ReviewSessionItem.textoRaizId` + `CHECK` de tres |
| R3 | `Medio`, `Formato`, `FormatoVersion`, `ParteDeFormato`, `FormatoOculto`, `User.esAdminDePlataforma`, `PlanDeMedios`, `LineaDePlan`, `Unidad`, `SavedVariation.unidadId/parteClave/textoRaizId` · script de los 14 canales |

`ADD VALUE` de enum va en su propia migración antes de usarse (Postgres no deja usar un valor nuevo
en la misma transacción), como ya se hizo con `CON_EL_CLIENTE`.

## 12. Verificación

- **Tipos**: las tres compuertas de siempre.
- **`verify:isolation`** suma: secciones, audiencias, raíces, planes, líneas y unidades de otro
  workspace dan 404; una sesión `TOOLKIT` no mezcla marcas; el `CHECK` de tres rechaza un item con
  dos referencias; el catálogo no expone `FormatoOculto` de otro workspace; con el interruptor
  apagado, `/api/v2` da 404.
- **`verify:calidad`** (sección 5.2), a mano, con el resultado anotado en el PRD.
- **Importación del catálogo**: pruebas del validador con una planilla de casos malos (sin partes,
  `min > max`, unidad desconocida, clave repetida).
- CI suma los casos nuevos de aislamiento y una prueba de que `/api/v2` responde 404 con el
  interruptor apagado.

## 13. Cómo se trabaja

- **Worktree aparte**: `../my-voice-v2`, rama `v2/proceso-de-campana`. Ahí van este PRD, el spec y
  el diseño.
- **La implementación entra a `main` por entregas, detrás del interruptor**, no como una rama larga
  que se mergea al final: una rama que diverge meses de `main` termina en un merge que nadie puede
  revisar, y `main` sigue moviéndose (hoy, cada semana). Cada entrega es un PR propio, desplegable,
  que con el interruptor apagado no cambia nada para nadie. R0 y R1 además mejoran v1.
- **Diseño primero**: R1, R2 y R3 no se codifican sin su sección en el `.pen`.

## 14. Preguntas técnicas abiertas

1. ¿Las partes `GUION` (audio, video) necesitan estructura (escenas, tiempos) o alcanza texto con
   unidad `SEGUNDOS`? Depende de la lista de 60.
2. ¿El plan de medios se importa de una planilla con formato fijo? Si sí, se define con quien hace
   media planning.
3. ¿El catálogo necesita variantes por país o idioma? Hoy todo es español de Colombia.
4. ¿Un formato puede depender de otro (un carrusel que reusa el titular del post)? El modelo actual
   no lo contempla.
