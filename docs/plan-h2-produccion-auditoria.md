# Plan de fase — Del copy aprobado a la pieza verificada

> La evolución que convierte a My Voice de generador de copy en infraestructura del proceso
> creativo. Absorbe lo que el [ROADMAP](./ROADMAP.md) listaba por separado como H2.A
> (composición) y H2.B (briefs de producción), porque son una sola cosa.
>
> **Esta fase no entra en el despliegue de mañana.** Ver la separación abajo.

---

## Separación: qué se despliega mañana y qué es esta fase

Lo que está listo y **sí** va mañana:

| Lote | Qué es | Estado |
|---|---|---|
| **H1.A** — multi-tenant real | Aislamiento por workspace, membresías, invitaciones, claves cifradas | `verify:isolation` 27/27, secuencia ensayada |
| **H1.B** — motor serio | Telemetría de costo, cuota por periodo, resiliencia, slot persistido | los cuatro criterios verificados |
| **E5** — consistencia de interfaz | Un nombre por pantalla, un negro, una escala, navegación por etapas | verificado en el navegador |

Lo que **no** va mañana y es esta fase: todo lo de abajo. No comparte código con el lote de
mañana, no toca sus migraciones y no depende de su despliegue más que en el orden lógico —
conviene que el H1 lleve una semana en producción antes de empezar a construir encima.

**Regla de la separación:** esta fase no agrega nada al runbook de mañana. Si algo de acá
aparece en ese runbook, algo se mezcló.

---

## Qué incluye la fase

El proceso completo tiene seis etapas. Las dos del medio no existen:

```
1 Preparar   Marcas — el ADN                            ✓ existe
2 Escribir   Generar · Biblioteca · Historial           ✓ existe (hoy se llama «Producir»)
3 Aprobar    Revisiones — el cliente aprueba el copy    ✓ existe
4 Producir   Producción · Mis piezas                    ← esta fase
   ↳ auditar  no es un ítem del menú: pasa al subir una pieza
5 Medir      Métricas                                    ✓ existe
```

**Seis etapas en el proceso, cinco en la navegación.** No es una omisión: **auditar no es un
lugar al que se va.** Es lo que pasa cuando alguien sube una pieza, y su informe se abre desde la
tarjeta. Un ítem de menú «Auditoría» sería un destino vacío — una pantalla que solo tiene sentido
con una pieza concreta delante.

**Y «Producir» cambia de dueño.** Hoy la etapa 2 se llama así y lo que produce es texto. Cuando
entra la etapa que produce la pieza, dos cosas distintas comparten nombre. Escribir / Producir
las separa con las palabras que el equipo ya usa.

**4 · Asignar.** Lo aprobado se agrupa en piezas, se ordena y se asigna a alguien del equipo de
diseño, con el brief de producción que el motor ya emite.

**5 · Auditar.** El diseñador sube la pieza terminada y la IA hace **dos chequeos distintos**:

- **¿Dice lo que se aprobó?** Lee el texto dentro de la pieza y lo compara contra el copy
  aprobado, que ya está en la base con su slot. Es una comparación contra una verdad conocida:
  acotada, determinista de evaluar y la más valiosa de las dos.
- **¿Respeta la marca?** Ortografía, estilo, tono y prohibiciones, contra el mismo fingerprint
  que ya alimenta al Critic.

### Qué no incluye

- **Generación visual por IA.** El roadmap la prometía; no es lo que se va a construir.
- **Reemplazar la herramienta de diseño.** La pieza se produce en Figma, Illustrator o donde sea.
  Acá vive la orden de trabajo y la verificación, no el archivo editable.
- **Ser un gestor de proyectos.** Estados mínimos. Si el equipo ya vive en otra herramienta,
  competir con ella se pierde.
- **La aprobación de la pieza por el cliente** queda para la **fase 4**, no para el alcance
  inicial: primero el ciclo interno funcionando. La decisión ya está tomada (D4) y la pantalla
  dibujada; lo que se difiere es construirla.

---

## El orden: el diseño va primero

```
Fase 0 · DISEÑO          en el .pen · no se escribe código
Fase 1 · E1 — S3         prerrequisito duro, no es parte de la funcionalidad
Fase 2 · Modelo + tablero    ya entrega valor sin auditoría
Fase 3 · Subida + auditoría  las dos verificaciones
Fase 4 · La pieza al cliente  D4 decidida, con tres límites
```

Ninguna fase arranca con decisiones de la anterior abiertas. La 0 no es una formalidad: **la
decisión D1 define una entidad nueva en la base**, y equivocarla se paga con una migración.

---

# Fase 0 · Diseño

**Entregable:** `design/MyVoice_Engine.pen`. **Criterio de cierre:** las cinco pantallas
dibujadas, las seis decisiones resueltas con una nota que diga qué se eligió y por qué, y los
cinco estados límite dibujados. Sin eso, la fase 1 arranca adivinando.

## Pantallas

Eran seis; son cinco. La subida dejó de ser pantalla y pasó a ser un estado de la tarjeta.

1. **Tablero de producción** — dibujado. Alcance **por marca**, con la identidad de la marca
   activa en el encabezado, igual que el resto del producto.
2. **Orden de trabajo** — dibujada. Lo que ve el diseñador antes de abrir Figma.
3. ~~Subida de la pieza~~ → **absorbida en la tarjeta**. Se sube desde el tablero o desde la
   orden de trabajo; no necesita pantalla propia.
4. **Informe de auditoría** — dibujado.
5. **Vista «Mis piezas»** — dibujada. Misma data que el tablero, alcance por persona. Y un
   orden distinto: para el diseñador la urgencia no es el estado sino **lo devuelto**, que es
   trabajo que ya hizo y volvió, con el motivo a la vista. Va primero a propósito.
6. **La navegación** — dibujada, y con una corrección: son **cinco etapas, no seis**.

## Decisiones

**D1 · ¿La unidad del tablero es la pieza o la variación de copy? — DECIDIDA: la pieza.**
Las dos opciones se dibujaron con la misma campaña y los mismos aprobados: la pieza da **6
tarjetas**, la variación da **13**, cuatro de ellas un mismo carrusel. El argumento que decidió
no fue el conteo sino que **el brief de producción que el motor ya emite describe una pieza, no
un slot**: en el modelo por variación no hay dónde ponerlo, y es justamente lo que hace que el
tablero valga más que una lista de textos aprobados. Costo asumido: una entidad nueva y su
migración.

**D2 · ¿La auditoría bloquea o avisa? — DECIDIDA: avisa.**
Es el mismo criterio que la cuota, que se desplegó en observación por una razón: un chequeo
automático que corta el trabajo de alguien tiene que ganarse esa autoridad con historial. Un
bloqueo mal calibrado se desactiva en una semana y no vuelve. En concreto:

- **Ninguna pieza queda trabada por la auditoría.** «Aceptar con hallazgos» está siempre
  disponible para quien aprueba, también cuando el texto difiere del copy aprobado: la auditoría
  puede leer mal una tilde, y una persona mira la pieza y decide.
- **Pasar por encima de un hallazgo pide una nota.** Queda quién aceptó, cuándo y por qué. Esa
  nota es el historial que algún día puede darle autoridad a la auditoría; sin ella nunca se
  sabría si acierta. Obliga a guardar la decisión por hallazgo en la fase 3, no solo el estado de
  la pieza.
- **El semáforo no tiene rojo.** El rojo promete un bloqueo que no existe.

Cuándo se revisa: se mide desde el primer día cuántos hallazgos de cada tipo se corrigen y
cuántos se aceptan con nota. Solo la **diferencia contra el copy aprobado** podría llegar a
bloquear, porque es un hecho contra un texto conocido; el **juicio de marca no bloquea nunca**.
Bloquear queda fuera de la fase 3: si se decide, es una fase propia con esos números en la mano.

**D3 · ¿Quién ve el informe y con qué detalle? — DECIDIDA: el mismo informe, tres niveles.**

| Quién | Qué ve | Dónde | Qué hace |
|---|---|---|---|
| El diseñador | Cada hallazgo, con el texto exacto de los dos lados, y lo que no se pudo leer dicho como tal | Mis piezas y la orden de trabajo, apenas termina la auditoría, **antes** de que la pieza llegue a quien aprueba | Corregir y volver a subir, o dejarla como está |
| Quien aprueba | Un semáforo en la tarjeta de *Por revisar*; un clic abre el informe completo, el mismo que ve el diseñador | El tablero | Aceptar —con nota si hay hallazgos— o devolver a diseño |
| El cliente | Nada del informe: la pieza y el texto que él aprobó (límite 1 de D4) | El portal, en la fase 4 | Aprobar o pedir cambios |

No hay dos informes: hay uno, y las acciones del pie dependen del rol. El semáforo tiene **tres
estados**:

| Estado | Cuándo |
|---|---|
| **Verificada** | Todo el texto coincide y la marca no tiene observaciones |
| **N hallazgos** | Al menos una diferencia contra el copy o un juicio de marca. Gana sobre los otros dos: si además hay partes ilegibles, se cuentan adentro del informe |
| **Revisar a ojo** | Una parte no se pudo leer y el resto coincide. No es un hallazgo: es la auditoría diciendo hasta dónde llegó |

Dibujadas en `§ H2 · D2 y D3 · la auditoría`.

**La regla de la auditoría, que salió de dibujarla:** los dos chequeos **no son la misma clase
de cosa y no pueden verse iguales**. «¿Dice lo que se aprobó?» compara contra una verdad conocida
—el copy está en la base con su slot— y muestra el texto exacto de los dos lados: es un hecho.
«¿Respeta la marca?» es un juicio, del mismo tipo que el Critic. Mezclarlos en una lista destruye
la confianza en el primero.

Y el estado que decide si la herramienta sobrevive a la primera semana: **«no se pudo leer»**.
Cuando la auditoría no puede extraer un texto —6 px sobre una foto—, lo dice y aclara que eso no
significa que esté mal. Reportar un falso «no coincide» ahí hace que el diseñador la desactive
mentalmente y no vuelva.

**D4 · ¿La pieza vuelve al portal del cliente? — DECIDIDA: sí, en la fase 4, con tres límites.**

Es el argumento comercial más fuerte de la fase: el cliente aprueba el copy y después la pieza,
en la misma herramienta y sin cadenas de mail. Y no exige pantalla nueva — es el portal que ya
existe, en un segundo momento.

**Límite 1 · El cliente ve el resultado, no el proceso.** Nada del informe de auditoría, los
hallazgos, quién diseñó la pieza ni cuántas veces volvió. Ve la pieza y el texto que él mismo
aprobó, para poder comparar. Todo lo demás es interno, y mezclarlo convierte una herramienta de
aprobación en una ventana a cómo trabaja la agencia.

**Límite 2 · No agrega columnas al tablero.** La decisión del cliente es un estado de la pieza,
no una etapa: aprobada por el cliente, o «pidió cambios», que la devuelve a **En diseño** con el
comentario, reusando el camino de *Devuelta* que D5 ya definió. Sin esto, cada aprobación externa
sumaría una columna y el tablero se convierte en lo que esta fase declara fuera de alcance.

**Límite 3 · La URL de la pieza se firma contra el token de la sesión, no contra un usuario.**
Es el punto delicado y por eso queda escrito: el portal **no tiene autenticación** —vive de un
token en la URL— así que todo lo que se agregue ahí queda accesible con solo tener el enlace. La
regla es la misma que rige el resto del producto, con el token como sujeto en lugar del usuario:
el servidor emite una URL firmada de vida corta, solo para piezas que pertenecen a esa sesión, y
nunca entrega una URL del bucket que el cliente pueda guardar. Hoy el portal expone texto; a
partir de acá expone archivos, y esa diferencia importa.

**D5 · ¿Qué estados tiene una pieza? — DECIDIDA: cuatro columnas, cada una con dueño.**

| Columna | Dueño | Qué la saca de ahí |
|---|---|---|
| Por asignar | Quien produce | Asignar a un diseñador |
| En diseño | El diseñador | Subir la pieza terminada |
| Por revisar | Quien aprueba | Aceptar, o devolver a diseño |
| Lista | Nadie: es el final | — |

El criterio que las define: **cada columna tiene un dueño y una acción que la vacía.** Una
columna sin dueño humano es una columna donde las cosas se quedan.

Eso corrigió dos errores del primer dibujo. «En auditoría» **no es columna**: dura minutos, la
mueve el sistema y nadie puede desatascarla. Y una pieza con hallazgos **no puede estar en
«Lista»**: falta que alguien decida si se aceptan, y ese estado —«Por revisar»— no existía.

Lo que no merece columna va como estado en la tarjeta: `Auditando`, `2 hallazgos`, `Verificada`,
`Devuelta`.

**La regla para cuando alguien pida una columna nueva:** que traiga su dueño y la acción que la
vacía. Si no los tiene, es un estado de la tarjeta. Es lo único que evita que el tablero se
convierta en el gestor de proyectos a medias que esta misma fase declara fuera de alcance.

**D6 · Peso máximo y qué queda después de aprobar — DECIDIDA.**

Van al mismo bucket que las guías ([E1](./plan-e1-almacenamiento.md)), con prefijo `piezas/`.
Pero con dos reglas propias, porque acá el crecimiento sí es real: un reel, un carrusel de cuatro
láminas, catorce canales por campaña, todos los meses.

**Peso máximo: 10 MB por pieza.** El límite no sale de lo que aguanta el bucket sino de lo que la
auditoría puede aprovechar: para leer el texto de una pieza alcanza con ~1.600 px en el lado
largo, y los modelos de visión reescalan la imagen igual antes de mirarla. Subir 50 MB no mejora
un solo hallazgo — solo cuesta más en transferencia, en almacenamiento y en la llamada al
proveedor. Formatos: PNG, JPG, WEBP y PDF de una página.

**El video no se audita automáticamente.** Es una corrección al dibujo: el tablero mostraba un
reel «en auditoría», y eso era optimista. Un chequeo de texto sobre video exigiría extraer
cuadros y auditarlos uno por uno, con un costo que no se justifica en la fase 3. Los canales de
video pasan directo a **Por
revisar** sin informe automático, y entregan un enlace, no un archivo (corregido en el estado
límite 4). Si se quiere auditar, el diseñador sube además la portada.

**Después de aprobada, snapshot y listo.** My Voice no vuelve a hacer nada con el archivo pesado:

| Qué | Dónde | Cuánto vive |
|---|---|---|
| Original subido | `piezas/originales/` | **90 días**, y lo borra la regla de ciclo de vida del bucket |
| Snapshot (JPG, lado largo 1.600 px) | `piezas/snapshots/` | permanente — pesa ~1 % del original |
| Informe de auditoría | la base | permanente: es texto |

Así queda la evidencia de qué se aprobó y con qué hallazgos, sin arrastrar los archivos pesados
para siempre. Y el snapshot se paga solo dos veces: **es también la miniatura que el tablero
muestra en cada tarjeta**, así que hay que generarlo igual.

Consecuencia técnica de la fase 3: hace falta una librería de imagen en el servidor (`sharp`) para
generar el snapshot. Es la primera dependencia nativa del backend; conviene verificar que compile
en `node:20-slim` antes de comprometerla.

## Estados límite — dibujados

En `§ H2 · Estados límite`. Cada caso trae su regla, y cada regla fija algo del modelo de datos:
por eso se dibujaron antes de la migración.

**1 · Una pieza que sirve a dos canales.** El mismo visual para Post e Historia son dos archivos
—1080×1080 y 1080×1920—, cada uno con su copy aprobado, y una pieza con dos canales no sabría
contra qué texto auditar. *Regla:* **una pieza es un canal y un archivo.** Lo compartido se
expresa asignándolas juntas y mostrando la hermana en la orden de trabajo, no fusionándolas.
Cada copy aprobado pertenece a una sola pieza por formato (afinado en D7).

**2 · Un canal que no produce pieza gráfica.** Si todo lo aprobado entra al tablero, se llena de
tarjetas que nadie puede trabajar. *Regla:* **entra al tablero todo canal cuyo copy aprobado no
es lo que se publica**, y es una propiedad del canal, declarada en su spec, no una elección por
campaña:

| | Canales |
|---|---|
| Entra, con auditoría | Instagram Post · Historia · Carrusel · Google Display · Rich Media · Pop up · Email |
| Entra, sin auditoría | Instagram Reel · TikTok · YouTube (enlace al video) · Cuña de Radio (audio) |
| No entra | Google Ads · Push Notification · WhatsApp |

**3 · El copy aprobado cambia después de asignada la pieza.** Si la pieza apunta al texto vivo,
el diseñador trabaja sobre algo que cambió sin avisarle, y la auditoría compara contra un texto
que él nunca vio. *Regla:* **la pieza congela el texto al asignarse**, además de guardar la
referencia al original. Si difieren, la tarjeta muestra «El copy cambió» y quien produce decide
actualizar la orden. Nunca se actualiza sola, y una pieza en *Lista* no se reabre sola.

**4 · Un archivo de 40 MB, o en formato inesperado.** Son dos casos distintos. *Regla:* **el
peso y el tipo se rechazan antes de subir**, diciendo qué hacer («exportá en PNG o JPG, con 1.600
px en el lado largo alcanza»). **Las medidas distintas se aceptan y quedan como hallazgo**, igual
que D2: una pieza de 728×90 cuando se pidió 300×250 está mal, pero es un hecho que alguien tiene
que ver, no un archivo inservible.

**Y corrige D6: el video no se sube, se pega el enlace** (Drive, Frame.io, Vimeo). D6 decía que
los canales de video suben su pieza como entregable, pero con el tope de 10 MB un reel no entra,
y subir el tope para video metería en el bucket justo los archivos que D6 quería evitar. La
Cuña de Radio sí sube su archivo: 30 segundos de audio entran de sobra.

**5 · La auditoría no puede leer el texto, o no corre.** Parecen lo mismo y no lo son: en el
primero la auditoría miró y llegó hasta cierto punto; en el segundo el proveedor falló y no miró
nada. *Regla:* **ninguno detiene la pieza.** «Revisar a ojo» dice qué parte no se leyó. «Sin
auditoría» dice que falló, ofrece reintentar y **no cuenta en las métricas de acierto** de D2,
porque una caída del servicio no es una opinión sobre la pieza.

**Lo que esto fija para el nivel 2:**

1. `Pieza` → un canal y un archivo. `SavedVariation` → a lo sumo una pieza por formato. Las hermanas se enlazan.
2. El `ChannelSpec` declara qué pieza produce: gráfica, video, audio o ninguna.
3. La pieza guarda una copia del texto de cada slot al asignarse, más la referencia al original.
4. Archivo con tope de peso y tipo; medidas como hallazgo; video como enlace.
5. El estado de la auditoría distingue «no se pudo leer» de «no corrió».

---

# Nivel 2 · Cómo se construye

> Escrito el 2026-09-22, con la fase 0 cerrada. **Una decisión nueva, D7**, apareció al bajar el
> diseño al modelo. Está dibujada y espera confirmación; bloquea solo el alta de piezas.

## Lo que el código dice y el diseño no veía

Tres hechos del código actual que cambian cómo se construye:

**1 · «Aprobado» tiene dos orígenes.** `SavedVariation.isApproved` lo pone en `true` el portal
del cliente (`reviewController.ts:203`) **y** cualquier miembro desde la Biblioteca, porque
`isApproved` está en la allow-list de `savedController.ts` (`VARIATION_UPDATABLE`). El tablero
toma los dos: para producción, aprobado es aprobado. Pero implica que un aprobado se puede
**desaprobar** después de creada la pieza, y la tarjeta lo tiene que decir. Es el mismo aviso
que el estado límite 3.

**2 · El diseñador hoy no ve casi nada.** En `App.tsx` todas las pantallas salvo Biblioteca y
Guía están detrás de `isAdmin`. Un diseñador es `MEMBER`, así que el tablero y Mis piezas son
las **primeras pantallas de trabajo pensadas para alguien que no administra**. Van con
`adminOnly: false` en `screens.ts`, y el backend las monta con `inWorkspace`, no con `asManager`.

**3 · La campaña es opcional.** Las tarjetas dicen «Rendimiento · Octubre», que es el `Project`.
Pero `SavedVariation.projectId` es nullable y hay copy guardado sin proyecto. La pieza no puede
exigir campaña sin dejar afuera ese copy: `Pieza.projectId` es nullable, y la tarjeta muestra el
título de la pieza cuando no hay proyecto.

## D7 · ¿Cómo nace una pieza? — DIBUJADA, por confirmar

El diseño de D1 lo dejó escrito sin resolver: *«alguien tiene que decidir qué slots entran en
cada pieza; automático la mayoría de las veces, no siempre»*. Los estados límite fijaron qué es
una pieza (un canal, un archivo), pero no **quién la crea ni cuándo**. Hay dos caminos:

- **Automático:** cada aprobado de un canal con pieza aterriza en *Por asignar*, agrupado por
  (proyecto, canal). Falla en tres casos reales: los aprobados de la Biblioteca llegan de a uno,
  así que la pieza nace incompleta; el copy sin proyecto no tiene con qué agruparse; y si hay dos
  hooks aprobados para el mismo Post, el sistema no sabe si es un A/B (dos piezas) o una
  alternativa descartada.
- **Explícito, con propuesta:** quien produce elige «Mandar a producción» sobre un grupo de
  aprobados. El sistema **propone** las piezas —una por canal, un aprobado por slot, el formato
  por defecto del canal— y la persona confirma o corrige. Cuando un slot tiene dos aprobados,
  pregunta: ¿una pieza con el elegido, o dos piezas?

*Recomendación:* **explícito, con propuesta.** Es la columna *Por asignar* con su dueño: quien
produce. Y es coherente con D5: el sistema no mueve trabajo entre personas por su cuenta.

**Dibujada** en `§ H2 · D7 · cómo nace una pieza`, **a la espera de confirmación.** Lo que
muestra:

- **Dos puertas, una sola propuesta.** La principal es **cerrar una sesión de revisión**: el
  cliente aprobó un lote y todo lo que va a producción llegó junto. Aparece un botón «Mandar
  aprobados a producción» en la sesión completada. La otra es **la Biblioteca**, para lo aprobado
  internamente: se seleccionan filas aprobadas (las no aprobadas no cuentan) y se manda el grupo.
- **La propuesta:** una pieza por canal, un aprobado por slot, el formato por defecto del
  canal. Cada pieza se puede destildar.
  - **Dos aprobados en el mismo slot** → pregunta: ¿una pieza con cuál, o dos piezas (A/B)? El
    que no entra no se borra ni se desaprueba: queda libre en la Biblioteca.
  - **Hermanas:** un interruptor, «misma idea visual que el Post — se asignan juntas», que
    escribe el mismo `grupoId`.
  - **Formato:** un selector con los formatos del spec, y «otro formato», que crea otra pieza con
    el mismo copy (ver la corrección al modelo, abajo).
  - **Fuera de la propuesta**, con el motivo: los canales sin pieza, y los aprobados que ya
    están en otra pieza.
- **Las piezas nacen en *Por asignar* y sin nadie asignado.** Crear y asignar son dos
  decisiones, y la segunda es del dueño de esa columna.

**Corrección al modelo que salió de dibujarla:** «otro formato» pone un mismo aprobado en dos
piezas —Display 300×250 y 728×90, mismo copy—, así que «un aprobado, una sola pieza» (estado
límite 1) se afina a **un aprobado, una sola pieza por formato**. `PiezaSlot` copia el `formato`
de su pieza, que no cambia después del alta, y la base lo garantiza con
`@@unique([savedVariationId, formato])`. Postgres admite varios NULL en un unique, así que los
slots cuyo original se borró no chocan entre sí.

## Fase 1 · E1 — almacenamiento en S3 — **hecha**

Desplegada el 2026-08-28 ([plan E1](./plan-e1-almacenamiento.md)).

## Fase 2 · Modelo, tablero y orden de trabajo

**Entrega valor sola, sin IA:** en esta fase la pieza se entrega con un **enlace** (Figma, Drive)
en vez de un archivo. Es la regla del video del estado límite 4, extendida a todo mientras no
exista la subida. El equipo coordina la producción dentro del sistema desde el primer día, y la
fase 3 agrega archivo y auditoría encima, sin cambiar el tablero.

### Modelo — `server/prisma/schema.prisma`

Una migración aditiva: no toca tablas existentes.

```prisma
enum PiezaEstado { POR_ASIGNAR  EN_DISENO  POR_REVISAR  LISTA }
enum PiezaTipo   { GRAFICA  VIDEO  AUDIO }

model Pieza {
  id               String      @id @default(uuid())
  /// Denormalizado desde Client, como GenerationLog: el guard y el tablero
  /// filtran por acá sin join.
  workspaceId      String
  clientId         String
  projectId        String?     // estado de hecho 3: la campaña es opcional
  platform         String      // valor de Platform; su spec dice tipo y formatos
  tipo             PiezaTipo
  formato          String      // "1080×1080", "300×250" — uno de spec.pieza.formatos
  titulo           String      // "pieza principal de feed"
  estado           PiezaEstado @default(POR_ASIGNAR)
  asignadaAId      String?
  /// Hermanas (estado límite 1): mismo uuid, sin tabla aparte.
  grupoId          String?
  /// Entregable de la fase 2, y el de video para siempre.
  enlace           String?
  creadaPorId      String
  estadoDesde      DateTime    @default(now())
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  slots            PiezaSlot[]
  eventos          PiezaEvento[]

  @@index([workspaceId, clientId, estado])  // el tablero
  @@index([asignadaAId, estado])            // Mis piezas
}

model PiezaSlot {
  id               String   @id @default(uuid())
  piezaId          String
  /// SetNull, no Cascade: borrar el copy de la Biblioteca no puede borrar
  /// una pieza en producción. La tarjeta avisa que el original ya no existe.
  /// Un aprobado, a lo sumo una pieza por formato (D7: «otro formato»).
  savedVariationId String?
  /// Copiado de Pieza.formato, que no cambia tras el alta: existe para que
  /// la base garantice la unicidad sin un trigger.
  formato          String
  slot             String
  slotLabel        String   // del registry, nunca del body
  /// Estado límite 3: el texto tal como estaba al asignarse. La auditoría
  /// compara contra esto, no contra el original.
  textoCongelado   String
  /// visualBrief, animationBrief, structure, production: van a la orden de
  /// trabajo pero no se auditan contra la pieza.
  esInstruccion    Boolean  @default(false)
  orden            Int      @default(0)

  @@unique([savedVariationId, formato])
}

model PiezaEvento {
  id        String   @id @default(uuid())
  piezaId   String
  tipo      String   // CREADA · ASIGNADA · ENTREGADA · ACEPTADA · DEVUELTA · REABIERTA · COPY_ACTUALIZADO
  deEstado  PiezaEstado?
  aEstado   PiezaEstado?
  autorId   String
  nota      String?  // obligatoria en DEVUELTA y REABIERTA
  createdAt DateTime @default(now())
  @@index([piezaId, createdAt])
}
```

`PiezaEvento` es append-only y cumple tres funciones: el historial de la tarjeta, el motivo de
«Devuelta» que Mis piezas muestra primero, y el tiempo en cada columna. Es la misma idea que
[E6](./plan-e6-registro-consumo.md), aplicada a decisiones en vez de a consumo.

«El copy cambió» **no es una columna**: se calcula al leer, comparando `textoCongelado` con el
`content` del original. Cubre también el original borrado (`savedVariationId` en NULL) y el
original desaprobado (`isApproved = false`).

### Canales — `server/src/channels/types.ts` y `specs/*.ts`

`ChannelSpec` gana un campo, y con él el estado límite 2 queda en el spec, no en una lista
escrita en otro lado:

```ts
pieza: { tipo: "grafica" | "video" | "audio"; formatos: string[] } | null;
```

| Canal | `pieza` |
|---|---|
| Instagram Post / Historia / Carrusel | gráfica · `1080×1080` / `1080×1920` / `1080×1080` |
| Google Display | gráfica · `300×250`, `728×90`, `160×600`, `320×50` |
| Rich Media · Pop up · Email | gráfica · formatos a confirmar con el equipo de diseño |
| Instagram Reel · TikTok · YouTube | video |
| Cuña de Radio | audio |
| Google Ads · Push Notification · WhatsApp | `null` |

Se audita lo gráfico; video y audio pasan directo a *Por revisar*. `registry.ts` expone
`esSlotDeInstruccion(slotId)` para las cuatro instrucciones, en vez de repetir la lista.

### Máquina de estados — `server/src/services/piezaService.ts`

Un archivo nuevo con **la tabla de transiciones como dato**, y cada acción un endpoint. Así
«qué la saca de esta columna» (D5) queda escrito en un solo lugar:

| Acción | De → a | Exige |
|---|---|---|
| asignar | *Por asignar* → *En diseño* | `userId` con membresía (`assertMemberOfWorkspace`) |
| reasignar | *En diseño* → *En diseño* | ídem |
| entregar | *En diseño* → *Por revisar* | `enlace` en la fase 2; archivo en la fase 3 |
| aceptar | *Por revisar* → *Lista* | `nota` si hay hallazgos (fase 3) |
| devolver | *Por revisar* → *En diseño* | `nota` obligatoria |
| reabrir | *Lista* → *En diseño* | `nota` obligatoria (estado límite 3) |
| actualizar copy | sin cambio de estado | vuelve a congelar desde los originales |

**Sin roles nuevos.** El dueño de cada columna es una persona, no un rol: cualquier miembro del
workspace puede ejecutar cualquier acción, y el `PiezaEvento` registra quién. El rol DESIGNER
es H3.D y no se adelanta.

**Concurrencia:** cada transición hace `updateMany({ where: { id, estado: <el esperado> } })` y
devuelve **409** si no actualizó nada. Dos personas que aceptan y devuelven la misma pieza a la
vez no pueden dejarla en un estado que ninguna de las dos eligió.

### API — `routes/index.ts` + `controllers/piezaController.ts`

Todo con `...inWorkspace`. **Guard nuevo en `lib/tenancy.ts`: `assertPiezaInWorkspace`**, con
404 y no 403, como el resto.

| Método | Ruta | Guard |
|---|---|---|
| GET | `/piezas?clientId=` | `assertClientInWorkspace` — el tablero, por marca |
| GET | `/piezas/mias` | filtra por `asignadaAId = yo` y el workspace activo |
| GET | `/piezas/:id` | `assertPiezaInWorkspace` — la orden de trabajo |
| POST | `/piezas` | cada `savedVariationId` con `assertVariationInWorkspace`, más: misma marca, mismo canal, aprobado, `spec.pieza` no nulo; responde 409 si ya está en otra pieza del mismo formato |
| POST | `/piezas/:id/{asignar,entregar,aceptar,devolver,reabrir,actualizar-copy}` | `assertPiezaInWorkspace` |
| PATCH | `/piezas/:id` | `pickFields(['titulo'])` — nada más se edita a mano |

`slotLabel` se resuelve con `resolveSlotLabel` del registry, como en `SavedVariation`. El body
nunca trae etiquetas ni estados.

### Frontend

- **`screens.ts`:** pantalla `produccion` («Producción»), `adminOnly: false`, con el selector de
  vista *Por marca / Mis piezas* que dibuja el tablero. `NAV_STAGES` pasa a las cinco etapas de
  `§ H2 · Navegación con producción`: el copy se **escribe**, la pieza se **produce**.
- **`components/produccion/`**, carpeta nueva: `TableroProduccion.tsx`, `TarjetaPieza.tsx`,
  `OrdenDeTrabajo.tsx`, `MisPiezas.tsx` y el modal de D7. **El estado vive ahí, no en
  `App.tsx`**: la pantalla pide sus datos y `App.tsx` solo la monta según `activeTab`. Es el
  primer pedazo de E3 que se paga sin refactorizar nada.
- **`services/api.ts`:** `piezasApi` con tipos de respuesta propios. No hereda el `any` de
  `apiRequest` (E2, punto 4).

### Criterio de aceptación de la fase 2

- Un aprobado de Google Ads no puede crear pieza (400); un aprobado ya usado en el mismo formato responde 409, y en otro formato se acepta.
- Las seis acciones respetan la tabla de transiciones. Una transición desde un estado que no
  corresponde responde 409, y dos transiciones simultáneas no dejan un estado intermedio.
- *Devolver* y *reabrir* sin nota responden 400. Cada transición deja su `PiezaEvento`.
- Editar el texto de un aprobado ya congelado muestra «El copy cambió» en su tarjeta, y la
  pieza sigue con el texto viejo hasta que alguien elige *actualizar copy*.
- Borrar un aprobado de la Biblioteca no borra la pieza.
- Un `MEMBER` ve el tablero y Mis piezas; un usuario sin membresía recibe 404.
- **`verify:isolation`** suma los casos de pieza: listar, leer, crear con un aprobado ajeno,
  asignar a un usuario de otro workspace y cada transición sobre una pieza ajena. Todo 404.
- Las tres gates de tipos en verde. El chequeo de drift de CI cubre la migración nueva.

## Fase 3 · Subida y auditoría

Menos detallada a propósito: se afina con la fase 2 funcionando.

- **Primero, la regla de ciclo de vida** del bucket, `piezas/originales/` → 90 días (D6).
- **`sharp` en `node:20-slim`**, verificado en el Dockerfile **antes** de comprometerlo: es la
  primera dependencia nativa del backend.
- **Modelo:** `PiezaVersion` (v1, v2… con clave del original, clave del snapshot, medidas,
  peso, estado de la auditoría `PENDIENTE · COMPLETA · NO_DISPONIBLE` y costo) y `Hallazgo`
  (`HECHO · JUICIO · ILEGIBLE · MEDIDAS`, slot, esperado, encontrado, y la decisión con su nota
  y su autor). **La decisión por hallazgo es obligatoria de guardar**: es la métrica que D2
  necesita para algún día darle autoridad a la auditoría.
- **Subida:** `storage.put()` con prefijo `piezas/`; rechazo por peso y tipo en el navegador
  **y** en el servidor (estado límite 4).
- **`aiClient`:** entrada de imagen en `chatCompletionConRetry`, sin abrir un segundo call site
  del SDK. Dos llamadas por versión: la comparación contra el texto congelado (barata) y el
  juicio de marca (reusa el prompt del Critic). El costo se mide como una etapa más con la
  telemetría actual, y entra al inventario de [E6](./plan-e6-registro-consumo.md).
- **Una falla del proveedor es `NO_DISPONIBLE`, no un hallazgo** (estado límite 5), y no cuenta
  en las métricas de acierto.

## Fase 4 · La pieza vuelve al cliente

- `ReviewSessionPieza` al lado de `ReviewSessionItem`: una sesión puede llevar piezas, y la
  decisión del cliente es un estado de la pieza, no una columna (D4, límite 2).
- **La URL de la pieza se firma contra el token de la sesión** (D4, límite 3): el handler
  público verifica que la pieza pertenece a esa sesión y emite una URL de vida corta. Nunca una
  URL del bucket que se pueda guardar.
- Lo que el cliente **no** recibe se verifica sobre la respuesta del endpoint público, no sobre
  la pantalla: ni hallazgos, ni autor, ni historial (D4, límite 1).

## Orden y dependencias

```
D7 confirmada ┐
              ├─► Fase 2 ─► Fase 3 ─► Fase 4
PR #8 y #9 ───┘            (sharp verificado antes)
```

Sin estimación todavía: se estima cuando D7 se confirme.

## Prerrequisitos duros

**E1 · Migrar uploads a S3.** ✅ Hecho el 2026-08-28. Era bloqueante: Hoy los archivos van al disco
local del contenedor y **ya hubo un outage por disco lleno** con PDFs de marca. Las piezas de
diseño pesan órdenes de magnitud más y llegan varias por campaña. Construir la fase 3 sobre ese
disco es repetir un incidente conocido, más rápido.

**Entrada de imagen en `aiClient`.** Los cuatro proveedores se manejan con el SDK de OpenAI
cambiando el `baseURL`, y todas las llamadas son de texto. La auditoría necesita imágenes, y eso
toca el único call site de `chat.completions.create`, que es único a propósito. No es una línea:
es una segunda forma de llamada con sus propios errores, límites de tamaño y costo.

## Sobre qué se apoya

Lo que hace esto viable ahora y no antes:

- **`SavedVariation.slot`**, persistido en B3. Sin el slot no se puede decir "esta pieza tiene
  que contener el hook y el cuerpo del Instagram Post": eran indistinguibles.
- **Los cuatro canales de instrucción** —`visualBrief`, `animationBrief`, `structure`,
  `production`— que el motor emite y hoy nadie consume. Son el brief que el diseñador necesita.
- **`ReviewSession`** con las decisiones del cliente: la entrada del tablero.
- **El fingerprint y las prohibiciones**: el reglamento de la auditoría.
- **La telemetría por etapa** (B0): permite medir el costo de auditar desde el primer día.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las piezas llenan el disco del contenedor | E1 antes que nada. No empezar sin eso |
| Auditar imágenes cuesta por pieza y nadie lo ve venir | Medirlo como etapa desde la fase 3 |
| El tablero se vuelve un gestor de proyectos a medias | Estados mínimos (D5) |
| La IA marca errores donde no los hay y el equipo deja de leerla | Modo aviso (D2); medir cuántos hallazgos se aceptan antes de darle autoridad |
| La fase se mezcla con el despliegue de mañana | No comparte código ni migraciones. Si aparece en ese runbook, algo se mezcló |
