# Plan · Un medio por vez, cuántas piezas, carrusel como historia y copy out

Estado: F1 a F4 construidas el 2026-11-05 (PR sin desplegar); F5 («Otra») pendiente · Feedback de pruebas, lote 2 (puntos 01, 03, 04, 05 y, para lo nuevo,
06) · Diseño: `.pen`, «— Feedback de pruebas · lote 2» (cuatro pantallas) · Antes:
[plan-feedback-pruebas.md](./plan-feedback-pruebas.md).

## Decisiones (2026-11-05)

1. **Una generación es un medio y una cantidad de piezas**: «5 carruseles de 6 slides», «3 posts», «3
   anuncios de Google Ads». Para otro medio se genera aparte. Es la misma forma que tendrá una línea
   del cuadro de CDM (formato + cantidad), que podrá agrupar formatos.
2. **Una pieza es un juego completo**: un carrusel con todas sus slides, un post con su texto de imagen
   y su copy out, un anuncio de Google Ads con sus 10 títulos cortos, 4 largos y 4 descripciones.
3. **De 1 a 10 piezas por generación, 3 por defecto.** Carrusel: de 3 a 10 slides, 5 por defecto.
4. **Lo que ya existe queda como está.** Los textos guardados con el modelo anterior conservan sus
   etiquetas; las piezas armadas por separado se cancelan con lo del lote 1.
5. **Pantallas para personas muy visuales**: el contenido al frente, la guía gráfica (números, colores,
   íconos) y las explicaciones largas detrás de un «i» con tooltip.

## Nivel 1 · Qué ve el usuario

Está en el `.pen`. En resumen:

- **Generar**: un medio (opción única, agrupado en Redes, Performance y Directo) y la cantidad; en el
  carrusel también las slides. Una grilla muestra lo que va a salir.
- **Resultados**: una pestaña por pieza con su ángulo. En el carrusel, la historia en una línea y una
  tarjeta por slide («Otra» reescribe solo esa slide). En redes, dos zonas: **va en la pieza** y
  **copy out**.
- **Copy**: una fila por pieza, que se abre con sus textos en orden y se aprueba entera.
- **Producción**: una pieza por pieza generada, con sus textos en orden y el copy out aparte.

Qué lleva cada formato:

| Formato | Va en la pieza | Copy out |
|---|---|---|
| Instagram Post | Titular, bajada | Primera línea, cuerpo, hashtags |
| Instagram Carrusel | Slide 1 … Slide N | Primera línea, cuerpo, hashtags |
| Instagram Reel, TikTok | Hook verbal, texto en pantalla | Caption |
| YouTube | Head line, long line | Descripción |
| Instagram Historia | Copy, interactivo, CTA | — (no tiene caption) |

## Nivel 2 · Cómo se construye

### Modelo

- `SlotSpec` cambia `count` (cuántas alternativas) por **`porPieza`** (cuántos textos de ese slot lleva
  una pieza: 1, salvo los títulos y descripciones de Google Ads y Display) y suma **`zona`**: `pieza` |
  `copyOut` | `indicacion` (reemplaza a `esSlotDeInstruccion`). Un slot `legado` no se genera: queda
  para resolver la etiqueta de lo guardado con el modelo anterior (`hook`, `body`, `slidesBody`…).
- **Carrusel**: el spec declara `slide1` … `slide10` (etiquetas «Slide 1» … «Slide 10») y el caption
  en sus tres partes. Cada generación usa las primeras N; el prompt dice que la 1 engancha y la N cierra.
- **Post**: `titular` y `bajada` (pieza), `primeraLinea`, `cuerpo` y `hashtags` (copy out),
  `visualBrief` (indicación).
- `CopyVariation` y `SavedVariation` suman **`piezaIndex`** (1..N) y **`conjuntoId`** (un id por pieza
  generada, lo pone el servidor). Migración aditiva.

### Motor (`openaiService.ts`, `promptBuilder.ts`)

- El pedido pasa de `platforms[]` a `{ platform, cantidad, slides? }` (`contrato/generacion.ts`).
- El director arma un ángulo por pieza.
- El redactor devuelve la misma lista plana de hoy con `pieza` en cada entrada, así validadores,
  revisor y corrector no cambian de forma. Las piezas se reparten en tandas de hasta ~45 textos por
  llamada, por el techo de `MAX_TOKENS.writer`.
- El informe de coherencia compara las piezas entre sí (que no se repitan), no canales.

### Fases (un PR cada una, `main` desplegable)

| # | Qué | Archivos principales |
|---|---|---|
| F1 | Specs con `porPieza` y `zona`; carrusel y post nuevos; motor por cantidad; `piezaIndex` y `conjuntoId` | `channels/specs/*`, `registry.ts`, `promptBuilder.ts`, `openaiService.ts`, `directorService.ts`, `contrato/generacion.ts`, migración |
| F2 | Generar y Resultados según el `.pen` | `ParameterForm.tsx`, `ResultsTable.tsx`, `App.tsx` |
| F3 | Guardar la pieza entera; Copy agrupado por pieza y aprobación de la pieza | `savedController.ts`, `aprobacion.ts`, `SavedManager.tsx` |
| F4 | Producción: una pieza por `conjuntoId`, copy out aparte, la auditoría mira solo la zona `pieza` | `piezaService.ts`, `auditoriaService.ts`, `OrdenDeTrabajo.tsx`, `TarjetaPieza.tsx` |
| F5 | «Otra» versión de un texto, mirando los de antes y después | endpoint nuevo en `generateController.ts`, `ResultsTable.tsx` |

F1 y F2 salen juntas: el front de hoy no sabe leer piezas.

### Criterios de aceptación

- «5 carruseles de 6 slides» devuelve 5 piezas con `slide1`…`slide6` y su copy out cada una, cada una
  con su ángulo; ningún texto se llama «Slides 2-6».
- «3 posts» devuelve 3 piezas con titular y bajada separados del copy out.
- Guardar y aprobar un carrusel lo trata como una unidad; en Producción arma **una** pieza con sus
  slides en orden y el copy out aparte, y la auditoría no busca el copy out en la imagen.
- Lo guardado antes sigue mostrándose y produciéndose como hasta hoy.
- `verify:calidad -- --plan` sigue corriendo (con medio y cantidad); las tres verificaciones de tipos,
  `verify:isolation`, `verify:adn` y `npm run fronteras` en verde.
