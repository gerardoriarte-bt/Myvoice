# Pantallas · inventario de flujos, pantallas y acciones

Estado: vigente · 2026-10-28 · Diseño: `design/MyVoice_Engine.pen` (local, fuera de git)

Cada pantalla con su acción principal (el único botón para avanzar) y su estado de diseño. Se
actualiza cada vez que se diseña o se cambia una pantalla.

Estados: **diseñada** · **ajustar** (diseñada, pero una decisión nueva la cambia) · **por diseñar**.

## Parte común

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| Marca | Crear marca y elegir herramientas | Crear marca | por diseñar | — |
| Campaña | Crear campaña y **elegir cómo sigue** (My Voice o CDM) | Seguir en My Voice / Seguir en CDM | por diseñar | — |

## My Voice

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| ADN | ADN 2.0 | Confirmar sección / Completar con IA | ajustar: «Planning» → «Estrategia» | § v2 · ADN 2.0 |
| ADN | Campaña nueva con ADN bajo el mínimo | Completar el ADN | diseñada | § v2 · Campaña nueva con ADN bajo el mínimo |
| Brief | Brief de campaña | Pedir textos raíz | ajustar: falta **referencia**; los frentes salen y quedan las audiencias elegidas | § v2 · Brief de campaña |
| Textos raíz | Textos raíz de una etapa | Aprobar / rechazar con motivo | ajustar: por etapa, no por frente | § v2 · Textos raíz |
| Textos raíz | Etapa sin textos raíz | Escribir textos raíz | ajustar: ídem | § v2 · Textos raíz · frente sin raíces |
| Toolkit | Armar y mandar | Mandar el toolkit | diseñada | § v2 · Toolkit · armar y mandar |
| Toolkit | Lo que ve el cliente (portal) | Aprobar / rechazar con comentario | diseñada | § v2 · Toolkit · lo que ve la marca |
| Cuadro | Cuadro recibido de CDM | Revisar lo que se va a escribir | ajustar: era «Plan de medios · importado»; pasa a cuadro de CDM | § v2 · Plan de medios · importado |
| Cuadro | **Cuadro manual** (marca sin CDM) | Agregar línea | por diseñar | — |
| Adaptaciones | Revisión de a uno | Aprobar y seguir | ajustar: separar **copy en pieza** y **copy de plataforma** |
| Adaptaciones | **Revisión agrupada** (cuadros de 200 líneas): por etapa y formato, aprobar por muestra | Aprobar el grupo | por diseñar | § v2 · Adaptaciones de una línea |
| Adaptaciones | Algo que corregir | Acortar | diseñada | § v2 · Adaptaciones · algo que corregir |
| Entrega | **Qué texto va en qué formato** (lo que se informa a CDM) | Enviar a CDM / Descargar | por diseñar | — |
| Producción | Tablero de piezas, auditoría y aprobación | Aceptar / devolver | en producción (H2) | secciones de Producción del `.pen` |

## CDM

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| Biblioteca | Medios y sus formatos | Agregar medio | ajustar: pasa a CDM; campos de texto con «en pieza / plataforma» | § Catálogo · medios y sus formatos (SUPUESTO) |
| Biblioteca | Detalle de un formato | Guardar como versión nueva | ajustar: ídem | § Catálogo · detalle de un formato (SUPUESTO) |
| Biblioteca | Agregar un medio con sus formatos | Revisar y activar | ajustar: ídem | § Catálogo · agregar un medio con sus formatos (SUPUESTO) |
| Biblioteca | Cargar desde planilla | Cargar formatos | ajustar: ídem | § Catálogo · cargar medios y formatos desde planilla (SUPUESTO) |
| Marca | Equipo y paquetes de formatos | Guardar paquete | por diseñar | — |
| Campaña | Campaña en CDM (desde My Voice) | Armar el cuadro | por diseñar | — |
| Cuadro | Armar y enviar el cuadro | Enviar versión | por diseñar | — |
| Estado | Línea con su copy aprobado y el estado de sus piezas | Ver en My Voice | por diseñar | — |
| Seguimiento | Portafolio con «espera a» | Abrir campaña | por diseñar | — |
| Seguimiento | Mi cola | Ir a la acción | por diseñar | — |

## Entre las dos

| Flujo | Qué | Estado | Frame en el `.pen` |
|---|---|---|---|
| Mapa | Quién hace qué en cada herramienta | ajustar: hoy muestra solo My Voice | § v2 · Mapa del proceso: quién hace qué |
| Contrato | Lo que viaja | ajustar: «Planning → proceso de campaña» pasa a CDM ↔ My Voice | § v2 · Contrato Planning → proceso de campaña |
| Navegación | Estado de la campaña visible en las dos herramientas, botones que cruzan | por diseñar | — |
| Avisos | Cada aviso de [flujo.md](./flujo.md) § 4 y adónde lleva | por diseñar | — |
