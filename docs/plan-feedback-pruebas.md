# Plan · Feedback de las pruebas (2026-11-05)

Estado: lote 1 en producción (2026-11-05) · Fuente: *My Voice · Comentarios de las pruebas* (8 puntos, con capturas) ·
Diseño: `.pen`, «— Feedback de pruebas · lote 1».

## Los 8 puntos y su causa

| # | Comentario | Causa en el código | Lote |
|---|---|---|---|
| 1 | Los textos del carrusel no se conectan | «Slides 2-6» es un solo slot con 5 variaciones (`instagramCarrusel.ts`): el motor las escribe como slides seguidas pero la herramienta las trata como alternativas | 2 |
| 2 | Usa «vos» aunque se pida «tú» | Tres causas: el voseo se deducía de palabras del ADN («Medellín», «tutear»); el bloque de Colombia prohibía «tú»; el revisor marcaba todo «tú» como falta y el corrector lo pasaba a «vos» | **1 ✓** |
| 3 | Falta el copy out | El caption existe en el spec, pero la pieza no separa lo que va en la imagen de lo que acompaña la publicación | 3 |
| 4 | Las slides se ven iguales | Misma causa que el 1: todas se llaman «Slides 2-6 — Desarrollo» | 2 |
| 5 | Un carrusel termina en varias piezas | Misma causa: la propuesta arma «un aprobado por slot» y ofrece las demás slides como alternativas de otra pieza | 2 |
| 6 | Ver juntos los textos de una pieza | Copy lista una fila por texto suelto | 3 |
| 7 | No se puede borrar una pieza enviada por error | No existía la acción | **1 ✓** |
| 8 | Nadie puede aprobar la pieza | Aprueba solo el responsable y nunca quien la subió; si es la misma persona, nadie | **1 ✓** |

## Lote 1 (hecho)

- **Tratamiento** en el ADN de la marca (`Client.tratamiento`, `comun/adn/tratamiento.ts`), en las
  cuatro etapas del motor. Sin elegir rige el default del país y el revisor no marca nada.
- **Quién aprueba, siempre a la vista** (pedido del usuario al aprobar el lote): `aprobador` con
  nombre y correo en cada tarjeta, en la orden de trabajo y en las filas por aprobar de Copy.
- **Si la entregó el responsable, aprueba cualquiera que administre**, menos quien la subió.
- **Cancelar una pieza** (solo quien administra): sale del tablero y del portal, queda en el
  historial y libera su copy y su huella.

## Lote 2 · El carrusel (por diseñar en el `.pen`)

Elegir cuántas slides; cada slide es su propio texto («Slide 2», «Slide 3»…); el motor las escribe
como una historia; Producción arma una sola pieza con todas.

## Lote 3 · Organización (por diseñar en el `.pen`)

Separar en la pieza «Va en la imagen» y «Copy out»; en Copy, agrupar los textos por pieza.
