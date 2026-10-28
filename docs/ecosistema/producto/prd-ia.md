# PRD · La IA en toda la plataforma

Estado: propuesta · 2026-10-28 · Términos: [../glosario.md](../glosario.md) · Evals:
[../evals/README.md](../evals/README.md)

## 1. Principio

**La IA hace el trabajo pesado; una persona decide.** Toda la plataforma está potenciada por IA, no solo
el copy: lee, propone, ordena, revisa y avisa. Pero nada de lo que la IA propone queda puesto sin que
alguien lo confirme, y siempre se ve qué vino de la IA (origen «propuesto por la IA», «confirmado»,
«escrito por el equipo»).

Reglas para cada uso:

1. **Dice quién decide.** Cada propuesta tiene un dueño humano que la acepta, la corrige o la descarta.
2. **Se ve el origen.** Lo propuesto queda «sin confirmar» hasta que alguien lo confirma.
3. **Explica por qué.** Una sugerencia viene con su razón en una línea («porque el cuadro trae 80 líneas
   de conversión»).
4. **Cuesta lo que se ve.** Lo que gasta crédito muestra el costo y cuenta para la cuota.
5. **Se mide.** Cada uso tiene su eval antes de construirse.

## 2. Dónde entra la IA

**Estado:** ● ya funciona en producción · ✓ diseñado · ○ propuesta. **P** = prioridad.

### Parte común

| Id | Etapa | Qué hace la IA | Decide | Estado | P |
|---|---|---|---|---|---|
| IA-1 | ADN | Propone las secciones del ADN leyendo la web, documentos y campañas pasadas. | Estrategia | ✓ | P0 |
| IA-2 | ADN | Señala contradicciones dentro del ADN («tono cercano» y «evitar el tuteo») y qué sección está débil y por qué. | Estrategia | ○ | P1 |
| IA-3 | Audiencias | Propone audiencias a partir de las fuentes y de las campañas que mejor funcionaron. | Estrategia | ✓ | P1 |
| IA-4 | Campaña | **Arma la campaña desde el brief del cliente** (PDF, correo o documento): nombre, fechas, audiencias del ADN, referencia y etapas previstas; sugiere si conviene seguir por My Voice o por CDM. | Responsable | ○ | P0 |
| IA-5 | Cola | **Resumen del día** por persona y **riesgo de atraso**: «Navidad sale en 3 días y faltan 18 aprobaciones». | Cada persona | ○ | P1 |
| IA-6 | Buscar | Búsqueda en lenguaje natural: «banners de conversión de Navidad sin aprobar». | — | ○ | P2 |

### CDM

| Id | Etapa | Qué hace la IA | Decide | Estado | P |
|---|---|---|---|---|---|
| IA-7 | Biblioteca | **Lee las especificaciones de un medio** (PDF, página de la plataforma o captura) y propone sus formatos con medidas, campos de texto con su largo y archivo. Es lo que hace posible cargar ~60 medios. | Planning | ○ | P0 |
| IA-8 | Biblioteca | Detecta formatos duplicados o parecidos, y avisa cuando una plataforma cambió sus especificaciones. | Planning | ○ | P2 |
| IA-9 | Planilla | Entiende columnas con otros nombres y propone correcciones de unidades («segs» → segundos), sin cargarlas solas. | Planning | ○ | P1 |
| IA-10 | Cuadro | **Propone un cuadro borrador** desde el media plan de los Sheets de Planning o desde los paquetes de la marca y las etapas de la campaña. | Planning | ○ | P0 |
| IA-11 | Cuadro | Revisa la cobertura: etapas sin formatos, formatos con pocas variaciones para su frecuencia, carga y costo estimado de generación. | Planning | ○ | P1 |

### My Voice

| Id | Etapa | Qué hace la IA | Decide | Estado | P |
|---|---|---|---|---|---|
| IA-12 | Brief | «Sugerir» por campo: concepto, campo semántico, mensaje, tono, CTA. Solo si se le pide. | Copy | ✓ | P0 |
| IA-13 | Brief | Avisa si el brief contradice el ADN o mezcla campos semánticos. | Copy | ○ | P1 |
| IA-14 | Textos raíz | Escribe textos raíz por etapa, con una línea de por qué cada uno sirve para esa etapa, y agrupa los muy parecidos. | Copy | ✓ | P0 |
| IA-15 | Toolkit | Resume los comentarios del cliente y propone cómo corregir la etapa rechazada. | Copy, responsable | ○ | P1 |
| IA-16 | Copy por formato | Escribe cada variación en pieza y de plataforma, dentro del largo; el revisor marca problemas de oficio y el corrector los arregla. | Responsable | ● (14 canales) | P0 |
| IA-17 | Copy por formato | «Acortar» un texto que se pasa del largo, manteniendo la idea. | Responsable | ✓ | P0 |
| IA-18 | Revisión | **Arma la revisión por muestra** en cuadros grandes: agrupa por etapa y formato, elige la muestra más representativa de cada grupo y separa lo que se aparta del resto para revisar de a uno. | Responsable | ○ | P0 |
| IA-19 | Producción | Audita la pieza: el copy dentro de la pieza contra el aprobado y el archivo contra el formato. | Responsable | ● | P0 |
| IA-20 | Medición | Explica qué copy funcionó mejor y por qué, por etapa y formato. | Estrategia | ○ | P2 |
| IA-21 | Aprendizaje | Convierte rechazos y comentarios repetidos del cliente en **reglas propuestas para el ADN** («no usar "¡Aprovecha!"»). | Estrategia | ○ | P1 |

### Adaptador (fase 3 o 4)

| Id | Qué hace la IA | Decide | Estado |
|---|---|---|---|
| IA-22 | Sugiere el rol de cada capa del PSD y resuelve el layout de cada formato. | Diseño | ○ |

## 3. Dónde más ayuda (recomendación)

Además del copy, los usos que más tiempo ahorran son los que hoy son trabajo manual y repetitivo:

1. **IA-7 · Leer especificaciones y armar formatos.** Sin esto, cargar ~60 medios es semanas de
   planilla.
2. **IA-10 · Cuadro borrador desde el media plan.** Planning ya tiene el plan en Sheets: pasarlo a 200
   líneas a mano es lo más lento de CDM.
3. **IA-18 · Revisión por muestra.** Es lo que hace posible aprobar 200 líneas sin revisarlas de a una.
4. **IA-4 · Campaña desde el brief del cliente.** El primer paso de cada campaña deja de ser copiar y
   pegar.
5. **IA-21 · Aprendizaje al ADN.** Cada rechazo mejora la próxima campaña en vez de repetirse.

## 4. Cómo se mide

Cada uso P0 tiene su eval antes de construirse ([../evals/README.md](../evals/README.md)): IA-7 se mide
contra especificaciones oficiales cargadas a mano (campos y largos correctos); IA-10, contra cuadros
reales armados por Planning; IA-18, con cuántos problemas quedan fuera de la muestra y no se ven.
