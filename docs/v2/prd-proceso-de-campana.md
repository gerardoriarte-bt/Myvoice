# PRD · Proceso de campaña (v2)

Estado: borrador para revisión · 2026-10-26
Spec técnico: [spec-proceso-de-campana.md](./spec-proceso-de-campana.md)
Antecedente: [plan-textos-raiz.md](../plan-textos-raiz.md), que este documento amplía y reemplaza
como referencia.

## 1. Resumen

My Voice hoy es un **generador por canales**: con un brief y una lista de canales, escribe textos
nuevos para cada canal, por separado. El **proceso de campaña** es un flujo distinto, que convive
con el actual sin tocarlo:

```
ADN de marca ─► Brief ─► Textos raíz ─► Toolkit ─────────────┐
(≥ mínimo)             (por frente)     (equipo → marca)      ▼
                                       Plan de medios ─► Adaptaciones ─► Control ─► Producción
                                       (medio · formato · cantidad)
```

Se aprueban **ideas** una vez, y después **cada medio adapta** esas ideas a su formato, en la
cantidad que pide el plan de medios. El motor deja de inventar por cada canal.

## 2. Problema

**El copy sale genérico.** Lo dice el feedback de Buentipo del 2026-10-26 («asegurarnos que evite
lo genérico, lo sigue dando») y lo explica el código:

- **Cada canal escribe desde cero.** Hasta 14 llamadas independientes que solo comparten un
  resumen de la campaña. El resultado son «divorcios creativos»: titulares que van por un lado y
  el concepto por otro.
- **El motor contradice el oficio.** Le pide «¿sabías que…?» en awareness, una de las muletillas
  que el manual de Buentipo prohíbe, y su revisor no detecta relleno, preguntas perezosas,
  manifiestos filosóficos ni slogans alterados.
- **El ADN es pobre y nadie sabe cuánto.** Cinco cajas de texto libre, sin audiencias, sin
  tratamiento declarado, con un indicador «ADN 3/5» que cuenta campos llenos, no si sirven. Con
  un ADN incompleto el motor rellena con lugares comunes.
- **El aprendizaje solo oye lo negativo.** Un rechazo guarda por qué; una aprobación no.
- **La marca aprueba lo que no importa.** Revisa decenas de textos por canal, cuando la decisión
  que le toca es qué idea sale.

**Y lo que viene no cabe en el diseño actual.** Se suma un proceso de **media planning** y una
lista de **al menos 60 medios nuevos**, con formatos distintos. Hoy un canal es un archivo de
código (`server/src/channels/specs/`, 14 archivos) y un valor de un enum duplicado en frontend y
servidor. Sumar 60 así es inviable, y el plan de medios necesita decir «10 de este formato y 4 de
este otro», algo que el flujo actual no tiene dónde guardar.

## 3. Principio: la IA sugiere, el equipo decide

Decisión del usuario (2026-10-27): **la IA no toma decisiones de marca ni de campaña.** Apoya y
sugiere; una persona del equipo acepta, edita o descarta. Hoy el motor viola esto en silencio: su
«espina» inventa el concepto cuando el brief no lo trae, y siempre decide el mensaje clave, el tono
de la campaña, el CTA principal y los tres ángulos (`directorService.ts`). Nadie los aprueba; llegan
a los canales como si fueran del equipo.

En v2, **todo lo que define la campaña es un campo que carga el equipo**:

| Qué | Quién decide | Qué hace la IA |
|---|---|---|
| ADN de marca (todas las secciones) | Planning | Propone desde el manual, el copy aprobado, la web o una entrevista. Queda «sin confirmar» hasta que alguien lo confirma. |
| Concepto | Creativo | Puede sugerir opciones a partir del brief; el equipo elige o escribe el suyo. |
| Mensaje clave | Creativo | Sugiere. |
| **Campo semántico** (el territorio de imágenes del concepto y lo que queda afuera) | Creativo | Sugiere a partir del concepto. |
| Tono de la campaña | Creativo | Sugiere, dentro de la voz de la marca. |
| CTA principal (de la campaña; un frente puede cambiarlo) | Creativo | Sugiere. |
| Ángulos (2–3, con su premisa) | Creativo | Sugiere; el equipo elige, edita o escribe. |
| Racional, manifiesto, key visual, assets | Creativo | No escribe; puede revisar ortografía. |
| **Frentes** (audiencia × etapa del funnel, y cuántas raíces pide cada uno), requerimiento | Responsable | Nada: las audiencias se eligen de la lista fija del ADN. |
| Textos raíz | El responsable, después la marca | **Propone**: es su trabajo, y nada pasa sin aprobación. |
| Adaptaciones | El responsable | **Propone** dentro de una raíz aprobada. |

Una sugerencia nunca se guarda sola: aparece al lado del campo, con «Usar» y «Descartar». Lo que el
motor recibe es siempre lo que el equipo dejó cargado, y lo usa literal.

## 4. Por qué un proceso separado

- **Cambia la unidad de trabajo.** Hoy es «una generación»; en v2 es **la campaña**, que avanza
  por etapas con dueños distintos. No es una pantalla más del flujo de hoy.
- **El flujo actual se usa todos los días.** Rediseñar encima pone en riesgo el trabajo en curso.
  v2 vive aparte: tablas nuevas, rutas nuevas, pantallas nuevas, y se enciende por workspace.
- **Los medios pasan a ser datos.** Un catálogo editable de medios y formatos sirve a v2 desde el
  día uno; v1 sigue con sus 14 canales en código hasta que se retire.

## 5. Objetivos

| # | Objetivo | Métrica | Meta inicial |
|---|---|---|---|
| O1 | Copy que no podría ser de otra marca | Infracciones del manual de oficio por cada 100 textos, medidas por `verify:calidad` | −60 % frente a la línea base |
| O2 | La marca aprueba ideas, no correcciones | Raíces aprobadas por la marca en la primera ronda | ≥ 60 % |
| O3 | Las adaptaciones no se reescriben | Adaptaciones aprobadas sin edición manual | ≥ 70 % |
| O4 | No se genera con un ADN pobre | Campañas v2 creadas con el ADN sobre el mínimo | 100 % (lo impone el sistema) |
| O5 | El plan de medios se cumple completo | Líneas del plan con todas sus unidades aprobadas al cierre | ≥ 90 % |
| O6 | Escalar medios sin código | Tiempo para sumar un formato nuevo al catálogo | < 15 min, sin despliegue |

Las metas se ajustan con la línea base (fase 0 del spec). O1 es la que manda: si no mejora, el
resto es proceso alrededor de copy genérico.

## 6. No objetivos

- **Variación libre por medio.** En v2 el medio solo adapta las raíces aprobadas.
- **Que la IA escriba el racional o el manifiesto.** Los escribe el equipo creativo; el motor los
  usa. (Puede ayudar a pulirlos más adelante, pero no es esta versión.)
- **Comprar, pautar o medir desempeño en medios.** El plan de medios de v2 dice qué se produce;
  la compra y la medición (H2.C) quedan fuera.
- **Migrar campañas en curso a v2.** Terminan en v1.
- **Retirar v1** antes de que v2 cubra los medios que se usan.

## 7. Personas y roles

Los roles de acceso siguen siendo los de hoy (OWNER, ADMIN, MEMBER). Lo que cambia son las
**funciones** del equipo, que ya existen (`MiembroFuncion`: copy, diseño, aprobación) y suman dos:

| Función | Qué hace en v2 | Nueva |
|---|---|---|
| **Planning** | Completa y confirma el ADN de marca, con ayuda de la IA. Define las audiencias. | Sí |
| **Medios** (Planning de medios) | Arma el plan en **Planning**, un módulo de My Voice por construir (medios, formatos, cantidades, fechas), y lo envía al proceso de campaña. | Sí |
| Copy (creativo) | Escribe el brief creativo (concepto, racional, manifiesto), pide y depura raíces. | No |
| Responsable de la campaña | Aprueba raíces, manda el toolkit a la marca, aprueba adaptaciones. | No |
| Diseño | Produce las piezas desde las adaptaciones aprobadas (sin cambios). | No |
| **Marca** (cliente) | Aprueba el toolkit en el portal, sin cuenta. | No |

## 8. Recorrido

1. **Marca lista.** El ADN supera el mínimo de completitud. Si no, la campaña v2 no se puede
   crear: se muestra qué falta y se ofrece la ayuda de la IA.
2. **Brief.** El equipo carga concepto, mensaje clave, campo semántico, tono, CTA principal,
   ángulos, racional, manifiesto, key visual, assets intocables, los **frentes** y el requerimiento. Un frente es una
   audiencia de la lista fija del ADN en una etapa del funnel («Familias · Conversión»), con cuántas
   raíces pide y, si hace falta, su propio CTA. El equipo marca solo los frentes que la campaña
   cubre, no la matriz completa. En los campos creativos puede pedir una
   sugerencia a la IA; nada queda puesto sin que alguien lo acepte.
3. **Textos raíz.** El motor propone, **por frente**, las que el equipo pidió. Cada una es para la
   audiencia y la etapa de su frente: titular, bajada, idea de desarrollo y ángulo.
   👍 o 👎, siempre con un motivo corto. Se pueden pedir más tandas.
4. **Toolkit.** El responsable aprueba las raíces que van y manda el toolkit a la marca. La marca
   aprueba o rechaza cada raíz con comentario. Las rechazadas vuelven al equipo.
5. **Plan de medios** (puede hacerse en paralelo con 3 y 4). **Llega de Planning**, un
   módulo de My Voice por construir donde se eligen medios y formatos; mientras no exista, se
   carga una planilla con las mismas columnas. My Voice
   no edita medios ni cantidades: une cada línea a un frente (sola, si el plan trae una audiencia y
   un objetivo que coinciden) y muestra qué va a escribir. En redes sociales escribe el caption.
6. **Adaptaciones.** Con el toolkit aprobado, cada línea del plan se genera: «10 ads de carrusel
   de Meta» produce 10 unidades, cada una con todas sus partes (caption, texto en imagen,
   descripción) y la raíz de la que sale.
7. **Control.** Las reglas sin IA (límites, assets y gancho literales) y el revisor marcan
   problemas; el responsable aprueba en lote o abre una unidad para corregirla.
8. **Producción.** Las unidades aprobadas siguen al tablero de Producción como el copy de hoy.

## 9. Requisitos funcionales

Prioridad: **P0** sin esto no hay v2 · **P1** necesario para el uso real · **P2** después.

### Motor (oficio)

| Id | Requisito | P |
|---|---|---|
| OF-1 | El manual de oficio universal entra a las reglas del motor, para todas las marcas (v1 y v2). | P0 |
| OF-2 | Se eliminan las instrucciones que lo contradicen («¿sabías que…?» en awareness). | P0 |
| OF-3 | El revisor marca relleno, pregunta perezosa, manifiesto, marca repetida en el titular, campo semántico mezclado y asset alterado; el fixer los reescribe. | P0 |
| OF-4 | Reglas sin IA: aperturas y muletillas prohibidas, assets literales, límites por parte. | P0 |
| OF-5 | Existe una medición reproducible de calidad (`verify:calidad`) con una línea base anotada. | P0 |

### ADN de marca

| Id | Requisito | P |
|---|---|---|
| ADN-1 | Secciones estructuradas siguiendo The Brief (Brand kit), incluidas las **audiencias**: una lista fija de la marca, con descriptores, que todas las campañas reutilizan. | P0 |
| ADN-2 | **Tratamiento** declarado (tú, usted o vos); deja de adivinarse. | P0 |
| ADN-3 | **Reglas de estilo** duras de la marca y **assets** intocables con su escritura exacta. | P0 |
| ADN-4 | **Completitud con peso**: cada sección vacía, débil o completa, con el motivo; un porcentaje único. | P0 |
| ADN-5 | **Mínimo para crear campañas v2**: porcentaje y secciones críticas, calibrados midiendo. | P0 |
| ADN-6 | **Ayuda de la IA** desde el manual PDF (entero), el copy aprobado, una URL y una entrevista guiada. | P1 |
| ADN-7 | Lo propuesto por la IA queda «sin confirmar» y **no cuenta** para el mínimo hasta que una persona lo confirma. | P0 |
| ADN-8 | Cada sección dice quién la llenó, cuándo y de dónde salió. | P1 |

### Brief, raíces y toolkit

| Id | Requisito | P |
|---|---|---|
| BR-1 | Brief con concepto, racional, manifiesto, key visual (texto), assets de campaña y requerimiento. | P0 |
| BR-6 | **Frentes**: uno o más pares audiencia (de la lista del ADN) × etapa del funnel, sin repetir. Cada uno define cuántas raíces pide (lo decide el equipo) y puede cambiar el CTA principal. | P0 |
| BR-3 | Campos de dirección que hoy inventa el motor, ahora del equipo: **mensaje clave, campo semántico, tono de campaña, CTA principal y ángulos**. Obligatorios para pedir raíces. | P0 |
| BR-4 | «Sugerir» en cada campo creativo: la IA propone uno o varios valores al lado del campo, con «Usar» y «Descartar». Nunca se guarda sola. | P1 |
| BR-5 | El motor usa el brief **literal**: no reformula, no completa campos vacíos, no agrega decisiones. | P0 |
| BR-2 | Key visual como imagen que el motor puede leer. | P2 |
| RZ-1 | El motor propone raíces **por frente**, tantas como pidió el equipo: titular, bajada, idea de desarrollo y ángulo. Cada raíz es de un solo frente (una audiencia, una etapa) y lo dice. | P0 |
| RZ-2 | 👍 y 👎 con motivo obligatorio; los rechazos alimentan la tanda siguiente. | P0 |
| RZ-3 | Pedir otra tanda, con o sin una indicación («más cortas», «menos emotivas»). | P1 |
| RZ-4 | Editar una raíz a mano antes de aprobarla. | P1 |
| TK-1 | El responsable aprueba raíces y manda el toolkit (concepto, racional, manifiesto, raíces agrupadas por frente) a la marca por el portal. | P0 |
| TK-2 | La marca aprueba o rechaza cada raíz; un rechazo exige comentario. | P0 |
| TK-3 | El toolkit aprobado se puede descargar o compartir como documento. | P2 |

### Catálogo de medios y plan de medios

| Id | Requisito | P |
|---|---|---|
| CAT-1 | Los medios y formatos son **datos**: medio → formato → partes, cada parte con tipo, unidad, límites y guía. | P0 |
| CAT-2 | Se cargan los ~60 medios nuevos por importación (planilla), sin despliegue. | P0 |
| CAT-3 | Los 14 canales de hoy se migran al catálogo con sus límites actuales. | P1 |
| CAT-4 | Un formato editado no altera las unidades ya generadas: cada unidad guarda la versión del formato. | P0 |
| CAT-5 | Quién mantiene el catálogo: LoBueno (global); un workspace puede ocultar formatos que no usa. | P1 |
| PM-1 | El plan de medios **llega de Planning** según el [contrato](./contrato-plan-de-medios.md): cada línea con un formato del catálogo compartido, su **frente**, cuántos copys distintos pide y sus fechas. El proceso de campaña no edita esos datos: escribe y devuelve el estado por línea. | P0 |
| PM-2 | El plan se puede armar en paralelo con raíces y toolkit; generar exige toolkit aprobado. | P0 |
| PM-3 | Mientras Planning no existe, el plan se carga con una planilla de las mismas columnas que el contrato. Cada versión nueva se compara con la anterior por línea y muestra qué cambió. | P0 |
| PM-5 | Planning elige un frente que **ya existe** en el brief: My Voice es la fuente de verdad de la marca (ADN, audiencias, brief) y el brief va antes que Planning. Un plan con un frente que no existe se rechaza. Envían la función Medios o el responsable de la campaña. | P0 |
| PM-6 | Qué escribe cada formato: en redes sociales, el **caption** (el texto en imagen o en pantalla lo resuelve Diseño); en el **carrusel**, el caption y el texto de cada lámina, tantas como pida Planning, con un texto por lámina o un relato repartido (decisión creativa, por línea); en los medios principales, las partes del formato (guion, titular y bajada, títulos y descripciones). | P0 |
| PM-4 | Ver el avance del plan: por línea, unidades generadas, aprobadas y en producción. | P1 |

### Adaptación, control y aprendizaje

| Id | Requisito | P |
|---|---|---|
| AD-1 | Cada línea del plan genera **N unidades** de su formato; cada unidad trae **todas sus partes** y su raíz. | P0 |
| AD-2 | El medio **solo adapta**: gancho y assets literales, sin ideas ni promesas nuevas. | P0 |
| AD-3 | Las unidades se reparten entre las raíces del frente de la línea y se diferencian por la entrada, no por la idea. | P1 |
| AD-4 | Regenerar una unidad sola, o una parte de una unidad. | P1 |
| CT-1 | Contador contra el límite en cada parte, también al editar. | P0 |
| CT-2 | Control automático (límites, literales, revisor) antes de llegar al responsable. | P0 |
| CT-3 | El responsable aprueba en lote o unidad por unidad; las adaptaciones no van a otra ronda de la marca. | P0 |
| CT-4 | Las unidades aprobadas siguen a Producción como el copy de hoy. | P0 |
| AP-1 | Los motivos de 👍 y 👎 (raíces y adaptaciones) quedan guardados y alimentan los ejemplos del motor. | P1 |

## 10. Requisitos no funcionales

- **Convivencia.** v1 no cambia de comportamiento, salvo la mejora del motor (OF-1 a OF-4), que
  beneficia a las dos. v2 se enciende por workspace.
- **Tenancy.** Mismas reglas que hoy: todo dato de una campaña pertenece a un workspace y a una
  marca; el toolkit va a un portal sin contraseña, así que una sesión es de una sola marca. El
  catálogo es global y no contiene datos de clientes.
- **Costo.** Una tanda de adaptaciones es una llamada de escritura por lote, no una por canal.
  El consumo de v2 cuenta en la cuota como el de v1.
- **Tiempo.** Las raíces de un frente en menos de 60 s (los frentes corren en paralelo); una línea de 10 unidades en menos de 90 s.
- **Diseño primero.** Las pantallas de v2 se dibujan en `design/MyVoice_Engine.pen` antes de
  codificarse.

## 11. Entregas

| Entrega | Contenido | Para quién se nota |
|---|---|---|
| **R0 · Motor** | OF-1 a OF-5, más la calibración del mínimo del ADN. | v1 mejora ya; nadie ve pantallas nuevas. |
| **R1 · ADN 2.0** | ADN-1 a ADN-8. | Planning en Marcas (v1 y v2). En v1, el mínimo solo avisa. |
| **R2 · Raíces y toolkit** | BR-1, BR-3 a BR-5, RZ-*, TK-1 y TK-2. | Primeras campañas v2, con un workspace piloto. |
| **R3 · Medios** | CAT-*, PM-*, AD-*, CT-*. | El proceso completo; se cargan los 60 medios. |
| **R4 · Aprendizaje y retiro** | AP-1, P2 pendientes; decidir el retiro de v1. | — |

R2 sin R3 no sirve para producir: el piloto de R2 valida raíces y toolkit con la marca, y la
adaptación de ese piloto se hace todavía en v1. R3 se despliega entera.

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| La mejora del motor no mueve la calidad y el problema era el dato. | R0 mide antes de construir; la calibración dice cuánto pesa el ADN. |
| El mínimo frena a equipos que hoy generan con ADN pobre. | En v1 solo avisa. En v2 la ayuda de la IA llega con el mínimo (R1). |
| La IA completa el ADN y nadie lo revisa. | Lo no confirmado no cuenta (ADN-7). |
| 60 formatos con límites mal cargados. | Validación al importar (partes, unidades, rangos) y vista previa del prompt por formato. |
| Dos procesos a la vez confunden al equipo. | v2 por workspace, con piloto; v1 marca «flujo anterior» cuando v2 esté completo. |
| La marca no quiere aprobar un toolkit. | Se valida en el piloto de R2 antes de construir R3. |

## 13. Preguntas abiertas

1. **La lista de los ~60 medios**, con sus formatos y las partes de cada uno. Es el insumo de
   CAT-2 y define si el modelo de partes alcanza (por ejemplo, formatos con tiempos, como audio
   y video).
2. **Media planning**: lo hará **Planning, un módulo de My Voice que se va a desarrollar**
   (respuesta del 2026-10-27). Lo que tiene que enviar está en el
   [contrato](./contrato-plan-de-medios.md), con sus propias preguntas abiertas.
3. **The Brief (Brand kit)**: secciones y cómo describe cada audiencia (ADN-1).
4. **El nombre** del proceso para el usuario. «Proceso de campaña» es provisional.
5. **¿Plan de medios antes o después del toolkit?** El PRD permite las dos cosas; si siempre es
   antes, las raíces podrían pensarse para los medios del plan.
6. **Piloto**: qué workspace y qué marca estrenan R2.
