# Biblioteca de medios · Google y DV360

**Fuente:** la planilla de validación de formatos de CDM (`CDM - validacion_formatos_medios.xlsx`, hoja Formatos), exportada a CSV el 2026-11-25.

**Conversión:** `scripts/cdm-desde-validacion.cjs <csv> google|dv360` la convierte en:
- [google-especificaciones-2026-11-25.json](./google-especificaciones-2026-11-25.json)
- [dv360-especificaciones-2026-11-25.json](./dv360-especificaciones-2026-11-25.json)

**Carga:** `npm run cdm:importar`; en producción, `deploy/cdm-importar.sh`.

**Nada está validado:** la columna «Check» de la planilla estaba vacía. El equipo valida en la Biblioteca (ver abajo).

## Lo que entra (Gerardo, 2026-11-25)

- **Google:** Performance Max, Demand Gen, YouTube y Display. Búsqueda ya estaba («Anuncio de búsqueda»).
- **DV360:** display, HTML5, rich media, intersticiales, native, video alojado, YouTube y CTV.
- **Banners:** solo los estándar: 300×250, 336×280, 728×90, 300×600, 320×50, 320×100, 160×600, 970×250, 468×60 y 250×250.

**No entra:**
- las filas «Asset», «Feed», «Tag» y «Audio» sin medidas ni textos: son funciones de la plataforma, no piezas;
- los logos: son de la marca, no se producen por campaña;
- AMPHTML, las medidas de Polonia y las poco usadas;
- las reservas (masthead, 60 s), lo dinámico y lo autogenerado.

## Por pieza a producir (decisión 18), como Meta

| | Piezas | Ubicaciones |
|---|---|---|
| Google | 24 | 65 |
| DV360 | 27 | 65 |

**Piezas:**
- **Imágenes** por proporción.
- **Videos** por proporción. Un video 16:9 sirve para YouTube (saltable, no saltable, bumper, in-feed, Shorts), Demand Gen, PMax, Display, CTV e in-stream.
- **Carruseles** de Demand Gen.
- **Texto PMax:** 15 títulos de 30, 5 títulos largos de 90, 5 descripciones de 90, negocio y 2 rutas.
- **Banners** e **intersticiales.**

## Reglas

1. **Un solo canal en el motor, Google Recursos.**
   - La línea del cuadro dice qué textos lleva su pieza, cuántos y de qué largo. Se toma el largo más corto y la cantidad mayor entre las ubicaciones elegidas.
   - El motor escribe solo eso.
   - Es un canal **mixto**: escribe para piezas con imagen y para Texto PMax, que va directo a Implementación. El verificador de Control lo sabe.
2. **Textos en la pieza.** Banners, intersticiales y los videos sin textos de plataforma (3:4, 4:3, CTV, la miniatura de YouTube) llevan textos dentro del arte:
   - banners e intersticiales: titular de 30 y llamado a la acción de 15;
   - videos y miniatura: un titular de 30.

   La planilla no los trae. **Son un supuesto que el equipo valida** (Gerardo, 2026-11-25).
3. **Cuántos de cada texto.** «Título (3-15)» se guarda como 15 repeticiones, y el pedido de copy las manda al motor.
4. **La fuente y la fecha son la versión.** Cargar la misma planilla otra vez no crea versiones.
5. **Meta queda igual.** Sus 34 ubicaciones cargadas coinciden con la planilla en medidas, proporción, duración y textos. Las cerca de 40 filas de Meta que no están cargadas (carruseles, Threads, Estados de WhatsApp, Profile Feed, Search) no se agregan (Gerardo, 2026-11-25).

## Validar en la herramienta

En **Biblioteca › un medio**, cada ubicación se abre y muestra lo que dice la guía:
- plataforma, proporción, medidas, archivo, peso y duración;
- sus textos.

Se marca con «Está bien» o con «Algo está mal» más una nota que diga cómo es en realidad. Así queda en la base:
- `Ubicacion.revision`, `revisionNota`, `revisadaPorId` y `revisadaEn` (migración `20261125000004_validar_ubicaciones`, aditiva);
- puede hacerlo Planning o un admin;
- el medio muestra «N de M validadas» y «Solo lo que falta»;
- la tarjeta del catálogo muestra cuántas faltan y cuántas tienen algo mal.

**Una versión nueva hereda la revisión** de cada ubicación que no cambió. La que cambió vuelve a «sin validar».

**El flujo de corrección:** lo marcado «Algo está mal» se corrige en la planilla y se vuelve a cargar.

## Diferencias para validar primero

La misma ubicación dice cosas distintas en Google y en DV360:

| Ubicación | Google | DV360 |
|---|---|---|
| Demand Gen imagen | título 40, descripción 90 | título 15, descripción 70 |
| Demand Gen video | título 40 | título 30 |
| YouTube in-feed | descripción 70 | descripción 35 |
| Tarjeta de carrusel | título 40 | título 15 y descripción 70 |
