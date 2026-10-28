# PRD · My Voice

Estado: propuesta · 2026-10-28 · Términos: [../glosario.md](../glosario.md) · Técnico:
[../tecnico/spec-my-voice.md](../tecnico/spec-my-voice.md) · Antecedente:
[../../v2/prd-proceso-de-campana.md](../../v2/prd-proceso-de-campana.md)

## 1. Resumen

My Voice escribe el copy de la campaña con la voz de la marca. Es dueño del **brief**, los **textos
raíz**, el **toolkit**, el **copy de cada formato**, **Producción** (piezas, auditoría y aprobación,
hasta que exista el Adaptador) y la **medición** del copy. Marca, ADN y campaña son de la parte común.

Los textos raíz y el toolkit son **solo de My Voice**: no viajan a CDM. Son la garantía de calidad
del copy antes de escribir cada formato (decisión 2).

## 2. Problema

- Hoy cada canal escribe por su cuenta, y el motor inventa decisiones de campaña (concepto, mensaje,
  tono, CTA) que deberían ser del equipo.
- Un cuadro de CDM puede traer 200 líneas: escribir y revisar de a una no escala.
- Los 14 canales viven en código; sumar los formatos de Planning así es inviable.

## 3. Usuarios

| Usuario | Qué hace en My Voice |
|---|---|
| Copy | Escribe el brief y depura los textos raíz. |
| Responsable de la campaña | Aprueba textos raíz, manda el toolkit, aprueba el copy de cada formato y las piezas. |
| Cliente | Aprueba el toolkit y las piezas en el portal, sin cuenta. |
| Diseño | Produce las piezas en Producción. |

## 4. Requisitos

| Id | Requisito | P |
|---|---|---|
| MV-1 | **Manual de oficio** en el motor, igual para todas las marcas (PR #43). | P0 |
| MV-2 | **Brief del equipo**: concepto, campo semántico, mensaje, tono y CTA. La IA solo sugiere si se le pide («Sugerir»). | P0 |
| MV-3 | **Textos raíz por etapa**: las etapas son las que trae el cuadro (o las previstas en el brief si la campaña empezó en My Voice). Copy aprueba, rechaza con motivo o edita. | P0 |
| MV-4 | **Toolkit**: el responsable elige qué textos raíz van y lo manda; el cliente lo aprueba en el portal. Un rechazo vuelve a esa etapa. | P0 |
| MV-5 | **Copy por formato**: cada variación se escribe desde los textos raíz de la etapa de la línea, para todas las audiencias de la campaña, separando **copy en pieza** y **copy de plataforma**, sin pasarse del largo máximo de cada campo. | P0 |
| MV-6 | **Largo**: pasarse del máximo bloquea la aprobación; ser más corto lo juzga quien revisa; el mínimo, si existe, orienta (decisión 11). | P0 |
| MV-7 | **Revisión a escala**: generar por tandas según fecha de salida, revisar agrupado por etapa y formato, aprobar por muestra; lo que no cabe o tiene problemas, de a uno. | P0 |
| MV-8 | **Hereda de CDM** la biblioteca (campos de texto y largos) y el cuadro, **siempre**, aunque la campaña sea chica (decisión 15). Los 14 canales de hoy se cargan en la biblioteca de CDM. | P0 |
| MV-9 | **Informa qué texto va en qué formato** por línea (a CDM y a Diseño). | P0 |
| MV-10 | **Producción** se queda como está (tablero, auditoría, aprobación del cliente) y lee el copy aprobado por línea. | P0 |
| MV-11 | **Medición**: el estado y el rendimiento de las piezas vuelven al aprendizaje de la marca. | P2 |

## 5. Las mejoras llegan a lo que ya funciona

Los 14 canales de hoy reciben las mejoras por pasos; cada paso sirve solo.

| Paso | Qué | Requisitos | Depende de CDM |
|---|---|---|---|
| 1 | Manual de oficio en el motor | MV-1 | No |
| 2 | ADN 2.0 (parte común) | PL-3 | No |
| 3 | Brief del equipo | MV-2 | No |
| 4 | Textos raíz por etapa y toolkit | MV-3, MV-4 | No |
| 5 | Los 14 canales cargados en la biblioteca de CDM, y el motor escribe desde ahí | MV-5, MV-6, MV-8 | Sí (biblioteca) |
| 6 | Heredar de CDM e informar el copy por línea | MV-7, MV-8, MV-9 | Sí |
| 7 | Medición | MV-11 | Sí |

El paso 5 es el puente: el motor deja de leer los canales del código y lee la biblioteca de CDM. Por eso la biblioteca de CDM va antes que el cuadro (decisión 15).

## 6. No objetivos

- Editar la biblioteca de medios (es de CDM).
- Comprar o pautar medios.
- Producir las piezas automáticamente (Adaptador, fase 3 o 4).

## 7. Cómo se mide

| Qué | Meta | Eval |
|---|---|---|
| Copy que viola el manual de oficio | Baja frente a la línea base de hoy | E-1 |
| Copy aprobado sobre el largo máximo | 0 | E-2 |
| Decisiones inventadas por el motor (fuera del brief) | 0 | E-3 |
| Tiempo para revisar un cuadro de 200 líneas | A definir con el piloto | E-9 |

## 8. Lo que cambia respecto de `docs/v2`

- La función del ADN se llama **Estrategia**; la del cuadro, **Planning** (en CDM).
- La biblioteca se **hereda** de CDM; las pantallas de catálogo del `.pen` pasan a CDM.
- **PM-6 se invierte**: My Voice escribe también el copy en pieza.
- Se agrega la **referencia** a la campaña, como texto libre.
- **Sin frentes**: audiencias de toda la campaña; la etapa la trae cada línea.
- **Producción se queda en My Voice** (decisión 8).
