# My Voice · qué cambia y en qué orden

Estado: propuesta · 2026-10-28 · Términos: [glosario.md](./glosario.md)
Detalle técnico: [../v2/spec-proceso-de-campana.md](../v2/spec-proceso-de-campana.md)

## 1. Qué es dueño de qué

Brief, textos raíz, toolkit, copy por formato, **Producción** (piezas, auditoría y aprobación, hasta
que exista el Adaptador) y medición del copy. Marca, ADN y campaña son de la parte común. Aprueba en
My Voice: los textos raíz y las adaptaciones (responsable), el toolkit (cliente) y las piezas
(responsable y cliente).

Los textos raíz y el toolkit son **solo de My Voice**: no viajan a CDM. Son la garantía de calidad
del copy antes de escribir cada formato (decisión 2026-10-28).

## 2. Las mejoras llegan a lo que ya funciona

No se espera al CDM ni se construye un generador aparte: los 14 canales de hoy reciben las mejoras
por pasos, y cada paso sirve solo.

| Paso | Qué | Qué mejora para el usuario | Depende de CDM |
|---|---|---|---|
| 1 | **Manual de oficio en el motor** (PR #43) | El copy de todos los canales, sin cambiar pantallas. | No |
| 2 | **ADN 2.0** en Marcas: secciones con estado, audiencias como lista fija, la IA propone y Estrategia confirma | El motor escribe con un ADN más rico. Bajo el mínimo, avisa. | No |
| 3 | **Brief del equipo**: audiencias elegidas del ADN, concepto, campo semántico, mensaje, tono, CTA y referencia; «Sugerir» opcional | El motor deja de inventar decisiones de campaña. | No |
| 4 | **Textos raíz por etapa y toolkit** antes de los canales; revisión agrupada para cuadros grandes | Cada canal adapta ideas aprobadas en vez de escribir por su cuenta. | No |
| 5 | **Los formatos con la forma de la biblioteca**: los 14 canales pasan a formatos con campos de texto (en pieza y de plataforma), largos y versión; el cuadro manual reemplaza la elección de canales | Lo que se escribe hoy queda igual a lo que se escribirá con CDM. | No (biblioteca propia) |
| 6 | **Heredar de CDM**: la biblioteca y el cuadro llegan de CDM cuando la marca lo usa; My Voice informa el copy aprobado por línea | Planning arma una vez; My Voice escribe exactamente eso. | Sí |
| 7 | **Medición**: el estado y el rendimiento de las piezas vuelven al aprendizaje de la marca | La próxima campaña parte de lo que funcionó. | Sí |

Los pasos 1 a 5 no esperan a CDM. El paso 5 es el puente: cuando llegue el paso 6, solo cambia de
dónde vienen la biblioteca y el cuadro.

## 3. Lo que cambia respecto de `docs/v2`

- La función que completa el ADN se llama **Estrategia**; la que arma el cuadro, **Planning** (en CDM).
- El catálogo de medios **no** se mantiene en My Voice cuando la marca usa CDM: se hereda. Las
  pantallas de catálogo del `.pen` pasan a ser de CDM ([pantallas.md](./pantallas.md)).
- **PM-6 se invierte**: My Voice escribe también el **copy en pieza** (titular, bajada, botón), no
  solo el copy de plataforma, porque cada formato de la biblioteca trae sus campos.
- Se agrega la **referencia** a la campaña, como texto libre.
- **Sin frentes**: las audiencias son de toda la campaña y la etapa la trae cada línea del cuadro;
  los textos raíz se organizan por etapa (decisiones 9 y 10).
- **Revisión a escala**: con 200 líneas no se revisa de a uno; ver la pregunta 8 de
  [decisiones.md](./decisiones.md).
- My Voice **informa qué texto va en qué formato** (a CDM y a Diseño) y **Producción se queda en My
  Voice** (decisión 8); probablemente se mude al Adaptador.
