# Spec · My Voice

Estado: propuesta · 2026-10-28 · Producto: [../producto/prd-my-voice.md](../producto/prd-my-voice.md)
· Datos: [../datos/arquitectura-de-datos.md](../datos/arquitectura-de-datos.md)

El detalle del motor, la API y las reglas de cada etapa sigue en
[../../v2/spec-proceso-de-campana.md](../../v2/spec-proceso-de-campana.md). Este documento dice **qué
cambia** de aquel spec con las decisiones del ecosistema; donde se contradigan, gana este.

## 1. Cambios sobre `docs/v2`

| Tema | En `docs/v2` | Ahora |
|---|---|---|
| Interruptor | `Workspace.procesoCampana` | `ModuloDeMarca` por marca ([spec-plataforma.md](./spec-plataforma.md) § 3) |
| ADN y audiencias | En My Voice | En la parte común (`comun/adn`) |
| Frentes | `FrenteDeCampana` (audiencia × etapa) | **No existen.** Audiencias de la campaña (`CampanaAudiencia`, parte común); etapa por línea |
| Textos raíz | `TextoRaiz.frenteId` | `TextoRaiz.etapa` + snapshot de las audiencias de la campaña |
| Catálogo | `Medio`, `Formato`, `ParteDeFormato` en My Voice | Biblioteca en **CDM**; My Voice guarda `FormatoUsado` (snapshot de los campos de texto con su versión) |
| Plan de medios | `PlanDeMedios`, `LineaDePlan` con `frenteId` | `EncargoRecibido` y `LineaDeEncargo` con `etapa`, copia por versión del cuadro de CDM (siempre de CDM, decisión 15) |
| Partes del formato | `PUBLICABLE`, `INSTRUCCION`, `GUION` | Además, `ubicacion`: `EN_PIEZA` o `PLATAFORMA` (PM-6 se invierte) |
| Largo | `min` y `max` validan | `max` bloquea; `min` orienta (decisión 11) |
| Revisión | De a uno | De a uno **y** agrupada por etapa y formato, con aprobación por muestra |

## 2. El encargo

My Voice no lee las tablas de CDM. Cuando llega una versión del cuadro (por contrato), guarda una
**copia**: `EncargoRecibido { campanaId, version, recibidoEn }` y sus
`LineaDeEncargo { lineaId, formatoUsadoId, etapa, variaciones, piezas?, fechaSalida, fechaCopy?,
referencia?, indicaciones? }`. Así lo escrito siempre sabe con qué versión del encargo y del formato se
escribió, aunque CDM cambie después. No hay cuadro manual: toda campaña arma su cuadro en CDM.

Las reglas de cambio entre versiones (línea nueva, suben o bajan variaciones, cambia formato o etapa)
son las de [../../v2/contrato-plan-de-medios.md](../../v2/contrato-plan-de-medios.md) § 6, comparando por
`lineaId`.

## 3. Los 14 canales pasan a la biblioteca de CDM

Los 14 `ChannelSpec` de `server/src/channels/specs/` se cargan como **formatos de la biblioteca de CDM**
(campos de texto con ubicación, unidad, máximo, repeticiones), con un script de carga en seco por
defecto. No hay biblioteca propia en My Voice (decisión 15). Es la migración CAT-3 de `docs/v2`: el
`count` de un slot pasa a `repeticiones` solo donde el formato lleva varios textos; donde eran
variaciones de lo mismo, pasa a ser `variaciones` de la línea. Hasta que estén cargados, el motor sigue
leyéndolos del código.

Lo que dice el código hoy (52 textos en los 14 canales) y cómo se carga (diseñado en el `.pen`, «— CDM ·
Biblioteca con los 14 canales de My Voice»):

- **Dónde va cada texto**: en la pieza (titular, texto en pantalla, guion), en la plataforma (caption,
  asunto, títulos de Google) o **para Diseño** (no se publica). 7 textos no tienen largo máximo: 6 son
  para Diseño (idea visual, elemento interactivo, estructura escena por escena, narrativa,
  indicaciones de producción, indicación de animación) y los hashtags van en la plataforma.
- **Qué es la cantidad** (`count` del slot):
  - se decide sola cuando el slot tiene `varyByAngle` → **variaciones** (alternativas por ángulo);
  - Google Ads y Google Display → **textos del formato** (10 títulos cortos, 4 largos, 4 descripciones);
  - slides de desarrollo del carrusel → **láminas** (5);
  - el resto queda **por decidir**: 6 canales (push, rich media, email, reel, pop up, WhatsApp). La carga
    propone una respuesta cuando se puede deducir del formato (un push lleva un solo título) y deja sin
    propuesta Email (header y botón) y Reel (texto en pantalla).
- **El largo** de hoy pasa a ser el máximo; el mínimo de la cuña (55 palabras) queda como orientación
  (decisión 11).
- **Lo que My Voice no sabía no se inventa**: ningún canal tiene especificaciones de archivo; quedan
  marcadas para que las complete Planning.
- Primero se carga **en seco** (muestra qué formatos se crean) y después se confirma; hasta confirmar,
  el motor sigue leyendo el código.

## 4. Escala

- **Generación por tandas**: cola de trabajos por línea, ordenada por `fechaSalida`; el semáforo de 5 del
  motor de hoy sigue por tanda. Presupuesto de tiempo y costo por tanda (`TIEMPOS`, cuota).
- **Revisión agrupada**: grupo = etapa × formato. Se aprueba una muestra; el resto del grupo queda
  aprobado solo si pasó todos los controles deterministas (largo, prohibiciones, oficio) y el revisor
  no marcó nada. Lo marcado o pasado de largo queda fuera del grupo, para revisar de a uno.

## 5. Entrega del copy

Por línea aprobada: cada campo de texto con su texto, su ubicación y la versión del formato. Se expone a
CDM por contrato y alimenta Producción (`PiezaSlot.savedVariationId` sigue igual). Un cambio posterior
marca la pieza «A revisar».
